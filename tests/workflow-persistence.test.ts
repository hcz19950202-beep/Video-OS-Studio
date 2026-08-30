import {randomUUID} from "node:crypto";
import {mkdtemp,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
const makeStore=async()=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-v2-2-w0-"));
  roots.push(root);
  return{root,store:new FileWorkflowStore(root)};
};

const makeRun=(overrides:Partial<WorkflowRun>={}):WorkflowRun=>{
  const at=new Date().toISOString();
  return WorkflowRunSchema.parse({
    id:randomUUID(),
    definitionId:"talking-head",
    definitionVersion:"1",
    projectId:"demo-project",
    createdAt:at,
    updatedAt:at,
    status:"pending",
    scenario:"talking-head",
    currentStageId:"media-import",
    sourceAssetIds:["asset-main"],
    canvasSnapshot:{width:1080,height:1920,fps:30},
    stageExecutions:[
      {stageId:"media-import",status:"pending",attempt:0},
      {stageId:"transcribe",status:"pending",attempt:0},
    ],
    checkpoints:[],
    artifacts:[],
    lastKnownProjectRevision:0,
    ...overrides,
  });
};

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("V2.2 W0 workflow persistence",()=>{
  it("creates the durable workflow layout and reopens a validated run",async()=>{
    const{root,store}=await makeStore();
    const run=makeRun();
    await store.create(run);

    const workflowPath=join(root,"workflows",run.id,"workflow.json");
    const activityPath=join(root,"workflows",run.id,"activity.jsonl");
    const stageResultsPath=join(root,"workflows",run.id,"stage-results");

    expect(WorkflowRunSchema.parse(JSON.parse(await readFile(workflowPath,"utf8")))).toEqual(run);
    expect(await readFile(activityPath,"utf8")).toBe("");
    expect(await readdir(stageResultsPath)).toEqual([]);
    expect(await store.get(run.id)).toEqual(run);
  });

  it("persists updates atomically and leaves no temporary files",async()=>{
    const{root,store}=await makeStore();
    const run=makeRun();
    await store.create(run);
    const updated=WorkflowRunSchema.parse({...run,status:"running",updatedAt:new Date(Date.now()+1000).toISOString()});
    await store.save(updated);

    expect(await store.get(run.id)).toEqual(updated);
    const entries=await readdir(join(root,"workflows",run.id));
    expect(entries.filter(name=>name.endsWith(".tmp"))).toEqual([]);
  });

  it("lists runs in creation order and survives a new store instance",async()=>{
    const{root,store}=await makeStore();
    const first=makeRun({createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:00.000Z"});
    const second=makeRun({createdAt:"2026-08-24T00:00:01.000Z",updatedAt:"2026-08-24T00:00:01.000Z"});
    await store.create(second);
    await store.create(first);

    const reopened=new FileWorkflowStore(root);
    expect((await reopened.list()).map(run=>run.id)).toEqual([first.id,second.id]);
  });

  it("rejects invalid state before creating durable files",async()=>{
    const{root,store}=await makeStore();
    const run=makeRun();
    const invalid={...run,canvasSnapshot:{...run.canvasSnapshot,fps:0}} as WorkflowRun;
    await expect(store.create(invalid)).rejects.toThrow();
    const workflowRoot=join(root,"workflows");
    const entries=await readdir(workflowRoot).catch(()=>[] as string[]);
    expect(entries).toEqual([]);
  });

  it("fails closed for a corrupt run while keeping healthy workflows listable",async()=>{
    const{root,store}=await makeStore();
    const corrupt=makeRun({createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:00.000Z"});
    const healthy=makeRun({createdAt:"2026-08-24T00:00:01.000Z",updatedAt:"2026-08-24T00:00:01.000Z"});
    await store.create(corrupt);
    await store.create(healthy);
    await writeFile(join(root,"workflows",corrupt.id,"workflow.json"),"{broken-json","utf8");

    await expect(store.get(corrupt.id)).rejects.toThrow();
    expect((await store.list()).map(run=>run.id)).toEqual([healthy.id]);
  });

  it("rejects saving a run that was never created",async()=>{
    const{store}=await makeStore();
    await expect(store.save(makeRun())).rejects.toThrow(/was not found/);
  });

  it("serializes concurrent saves into valid workflow JSON",async()=>{
    const{root,store}=await makeStore();
    const run=makeRun();
    await store.create(run);
    const updates=Array.from({length:20},(_,index)=>WorkflowRunSchema.parse({...run,lastKnownProjectRevision:index+1,updatedAt:new Date(Date.now()+index+1).toISOString()}));
    await Promise.all(updates.map(update=>store.save(update)));

    const raw=JSON.parse(await readFile(join(root,"workflows",run.id,"workflow.json"),"utf8"));
    expect(()=>WorkflowRunSchema.parse(raw)).not.toThrow();
    expect(raw.lastKnownProjectRevision).toBeGreaterThanOrEqual(1);
    expect(raw.lastKnownProjectRevision).toBeLessThanOrEqual(20);
  });
});
