import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectMutationCoordinator,ProjectOperationIdReuseError,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const setup=async()=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=new ProjectRepository(fs,"/data");
  const coordinator=new ProjectMutationCoordinator(fs,repository);
  await repository.create({id:"p1",name:"One",now:"2026-08-22T00:00:00.000Z"});
  await repository.create({id:"p2",name:"Two",now:"2026-08-22T00:00:00.000Z"});
  return{fs,repository,coordinator};
};

describe("ProjectMutationCoordinator",()=>{
  it("applies a command exactly once and persists idempotency",async()=>{
    const{repository,coordinator,fs}=await setup();
    const mutation={expectedRevision:0,commandId:"rename-1",command:{type:"rename-project" as const,name:"Renamed"}};
    const first=await coordinator.applyCommand("p1",mutation);
    expect(first).toMatchObject({appliedRevision:1,alreadyApplied:false});
    expect(first.project.project.name).toBe("Renamed");

    const duplicate=await coordinator.applyCommand("p1",mutation);
    expect(duplicate).toMatchObject({appliedRevision:1,alreadyApplied:true});
    expect(duplicate.project.project.revision).toBe(1);
    expect((await repository.load("p1")).project.revision).toBe(1);

    const log=await fs.readText("/data/projects/p1/operations.jsonl");
    expect(log).toContain('"operationId":"rename-1"');
    expect(log).toContain('"status":"pending"');
    expect(log).toContain('"status":"applied"');
  });

  it("rejects reusing an operation id for a different payload",async()=>{
    const{coordinator}=await setup();
    await coordinator.applyCommand("p1",{expectedRevision:0,commandId:"same-id",command:{type:"rename-project",name:"First"}});
    await expect(coordinator.applyCommand("p1",{expectedRevision:1,commandId:"same-id",command:{type:"rename-project",name:"Second"}})).rejects.toBeInstanceOf(ProjectOperationIdReuseError);
  });

  it("serializes same-project stale writers so one wins and one receives a revision conflict",async()=>{
    const{repository,coordinator}=await setup();
    const first=coordinator.applyCommand("p1",{expectedRevision:0,commandId:"writer-a",command:{type:"rename-project",name:"A"}});
    const second=coordinator.applyCommand("p1",{expectedRevision:0,commandId:"writer-b",command:{type:"rename-project",name:"B"}});
    const results=await Promise.allSettled([first,second]);
    expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
    const rejected=results.find(result=>result.status==="rejected");
    expect(rejected?.status).toBe("rejected");
    if(rejected?.status==="rejected")expect(rejected.reason).toBeInstanceOf(ProjectRevisionConflictError);
    const project=await repository.load("p1");
    expect(project.project.revision).toBe(1);
    expect(["A","B"]).toContain(project.project.name);
  });

  it("prevents a stale Caption patch from overwriting a newer unrelated field",async()=>{
    const{repository,coordinator}=await setup();
    await coordinator.applyCommand("p1",{expectedRevision:0,commandId:"caption-add",command:{type:"add-clip",trackId:"captions-main",clip:{id:"caption-1",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],style:{fontFamily:"Arial",fontSize:48},startFrame:0,durationInFrames:30,enabled:true,layer:100}}});
    await coordinator.applyCommand("p1",{expectedRevision:1,commandId:"caption-font",command:{type:"update-caption-style",clipId:"caption-1",style:{fontFamily:"Inter"}}});
    await expect(coordinator.applyCommand("p1",{expectedRevision:1,commandId:"caption-size-stale",command:{type:"update-caption-style",clipId:"caption-1",style:{fontSize:72}}})).rejects.toBeInstanceOf(ProjectRevisionConflictError);
    await coordinator.applyCommand("p1",{expectedRevision:2,commandId:"caption-size-retry",command:{type:"update-caption-style",clipId:"caption-1",style:{fontSize:72}}});
    const project=await repository.load("p1");
    const caption=project.tracks.flatMap(track=>track.clips).find(clip=>clip.id==="caption-1");
    expect(caption).toMatchObject({type:"caption",style:{fontFamily:"Inter",fontSize:72}});
    expect(project.project.revision).toBe(3);
  });

  it("does not use a global lock across different projects",async()=>{
    const{coordinator}=await setup();
    let releaseFirst!:()=>void;
    const holdFirst=new Promise<void>(resolve=>{releaseFirst=resolve;});
    let firstEntered=false;
    let secondEntered=false;

    const first=coordinator.mutate({
      projectId:"p1",expectedRevision:0,operationId:"p1-hold",kind:"service",payload:{project:"p1"},
      apply:async current=>{firstEntered=true;await holdFirst;return{...current,project:{...current.project,name:"P1 done",revision:current.project.revision+1,updatedAt:"2026-08-22T00:01:00.000Z"}};},
    });

    while(!firstEntered)await Promise.resolve();
    const second=coordinator.mutate({
      projectId:"p2",expectedRevision:0,operationId:"p2-fast",kind:"service",payload:{project:"p2"},
      apply:async current=>{secondEntered=true;return{...current,project:{...current.project,name:"P2 done",revision:current.project.revision+1,updatedAt:"2026-08-22T00:01:00.000Z"}};},
    });

    const secondResult=await second;
    expect(secondEntered).toBe(true);
    expect(secondResult.project.project.name).toBe("P2 done");
    releaseFirst();
    await first;
  });
});
