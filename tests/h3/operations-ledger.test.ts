import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {
  PROJECT_OPERATION_COMPACTION_REDUNDANCY_THRESHOLD,
  ProjectMutationCoordinator,
  ProjectOperationIdReuseError,
} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

class CountingFileSystemAdapter extends InMemoryFileSystemAdapter{
  operationAppends=0;
  operationAtomicWrites=0;

  override async appendText(path:string,content:string){
    if(path.endsWith("operations.jsonl"))this.operationAppends+=1;
    return super.appendText(path,content);
  }

  override async writeTextAtomic(path:string,content:string,backupPath?:string){
    if(path.endsWith("operations.jsonl"))this.operationAtomicWrites+=1;
    return super.writeTextAtomic(path,content,backupPath);
  }
}

const setup=async()=>{
  const fs=new CountingFileSystemAdapter();
  const repository=new ProjectRepository(fs,"/data");
  const coordinator=new ProjectMutationCoordinator(fs,repository);
  await repository.create({id:"p1",name:"One",now:"2026-08-28T00:00:00.000Z"});
  const logPath=repository.resolveProjectFile("p1","operations.jsonl");
  return{fs,repository,coordinator,logPath};
};

const rename=async(coordinator:ProjectMutationCoordinator,expectedRevision:number,commandId:string,name:string)=>coordinator.applyCommand("p1",{
  expectedRevision,
  commandId,
  command:{type:"rename-project",name},
});

describe("H3c operations ledger",()=>{
  it("appends pending/applied records without rewriting the ledger on the normal path",async()=>{
    const{fs,coordinator}=await setup();
    await rename(coordinator,0,"rename-1","Renamed");
    expect(fs.operationAppends).toBe(2);
    expect(fs.operationAtomicWrites).toBe(0);
  });

  it("repairs an incomplete crash tail before appending the next mutation",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    await fs.appendText(logPath,'{"operationId":"partial-crash-tail"');

    const first=await coordinator.getOperation("p1","rename-1");
    expect(first).toMatchObject({operationId:"rename-1",status:"applied",appliedRevision:1});

    const repaired=await fs.readText(logPath);
    expect(repaired).not.toContain("partial-crash-tail");
    expect(repaired.endsWith("\n")).toBe(true);

    await rename(coordinator,1,"rename-2","Second");
    expect((await coordinator.getOperation("p1","rename-2"))?.status).toBe("applied");
  });

  it("preserves a complete final record that only lost its newline",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    const withoutNewline=(await fs.readText(logPath)).trimEnd();
    await fs.writeTextAtomic(logPath,withoutNewline);

    const state=await coordinator.getOperation("p1","rename-1");
    expect(state).toMatchObject({status:"applied",appliedRevision:1});
    expect((await fs.readText(logPath)).endsWith("\n")).toBe(true);
  });

  it("recovers applied truth when the project save succeeded but the applied ledger tail was truncated",async()=>{
    const{fs,repository,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    const lines=(await fs.readText(logPath)).trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).status).toBe("pending");
    expect(JSON.parse(lines[1]).status).toBe("applied");

    await fs.writeTextAtomic(logPath,`${lines[0]}\n${lines[1].slice(0,Math.floor(lines[1].length/2))}`);
    const restarted=new ProjectMutationCoordinator(fs,repository);
    const recovered=await restarted.getOperation("p1","rename-1");

    expect(recovered).toMatchObject({status:"applied",appliedRevision:1});
    const repairedLines=(await fs.readText(logPath)).trim().split("\n").map(line=>JSON.parse(line));
    expect(repairedLines.at(-1)).toMatchObject({operationId:"rename-1",status:"applied",appliedRevision:1});
  });

  it("compacts redundant operation states without weakening operation id reuse protection",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    const original=(await fs.readText(logPath)).trim().split("\n");
    const repeated=Array.from({length:PROJECT_OPERATION_COMPACTION_REDUNDANCY_THRESHOLD+2},(_,index)=>original[index%original.length]).join("\n")+"\n";
    await fs.writeTextAtomic(logPath,repeated);

    const state=await coordinator.getOperation("p1","rename-1");
    expect(state).toMatchObject({status:"applied",appliedRevision:1});

    const compacted=(await fs.readText(logPath)).trim().split("\n");
    expect(compacted).toHaveLength(1);
    expect(JSON.parse(compacted[0])).toMatchObject({operationId:"rename-1",status:"applied"});

    await expect(rename(coordinator,1,"rename-1","Different payload")).rejects.toBeInstanceOf(ProjectOperationIdReuseError);
  });

  it("does not compact a large ledger made only of unique latest operation states",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    const applied=JSON.parse((await fs.readText(logPath)).trim().split("\n").at(-1)!);
    const unique=Array.from({length:PROJECT_OPERATION_COMPACTION_REDUNDANCY_THRESHOLD+44},(_,index)=>JSON.stringify({...applied,operationId:`unique-${index}`})).join("\n")+"\n";
    await fs.writeTextAtomic(logPath,unique);
    const writesBeforeRead=fs.operationAtomicWrites;

    const state=await coordinator.getOperation("p1","unique-0");
    expect(state).toMatchObject({operationId:"unique-0",status:"applied"});
    expect(fs.operationAtomicWrites).toBe(writesBeforeRead);
    expect((await fs.readText(logPath)).trim().split("\n")).toHaveLength(PROJECT_OPERATION_COMPACTION_REDUNDANCY_THRESHOLD+44);
  });

  it("fails closed for a corrupted newline-terminated ledger record instead of hiding interior damage",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    await fs.appendText(logPath,"not-json\n");
    await expect(coordinator.getOperation("p1","rename-1")).rejects.toThrow();
  });

  it("fails closed for a complete but schema-invalid final record without a newline",async()=>{
    const{fs,coordinator,logPath}=await setup();
    await rename(coordinator,0,"rename-1","First");
    await fs.appendText(logPath,JSON.stringify({operationId:"schema-invalid-tail"}));
    await expect(coordinator.getOperation("p1","rename-1")).rejects.toThrow();
  });
});
