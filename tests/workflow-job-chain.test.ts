import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {JobRecordSchema,type JobRecord} from "@/lib/jobs/schema";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner,type WorkflowJobRuntimePort} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3000)=>{const started=Date.now();while(Date.now()-started<timeoutMs){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error("Timed out waiting for workflow state.");};

const job=(id:string,status:JobRecord["status"]):JobRecord=>JobRecordSchema.parse({
  id,type:"hyperframes-render",projectId:"demo",status,stage:status,progress:status==="completed"?1:.5,attempt:1,input:{},output:status==="completed"?{ok:true}:undefined,
  createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:01.000Z",startedAt:"2026-08-24T00:00:00.100Z",finishedAt:status==="completed"?"2026-08-24T00:00:01.000Z":undefined,
});

class FakeJobs implements WorkflowJobRuntimePort{
  readonly records=new Map<string,JobRecord>();
  readonly cancelled:string[]=[];
  async get(jobId:string){return this.records.get(jobId)??null;}
  async cancel(jobId:string){this.cancelled.push(jobId);const current=this.records.get(jobId);if(!current)throw new Error("missing job");const next=JobRecordSchema.parse({...current,status:"cancelled",stage:"cancelled",finishedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),error:{code:"JOB_CANCELLED",message:"cancelled",retryable:true}});this.records.set(jobId,next);return next;}
  async retry(jobId:string){const current=this.records.get(jobId);if(!current)throw new Error("missing job");const next=JobRecordSchema.parse({...current,status:"queued",stage:"queued",attempt:current.attempt+1,error:undefined,finishedAt:undefined,updatedAt:new Date().toISOString()});this.records.set(jobId,next);return next;}
}

const harness=async(jobs:FakeJobs)=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-w2-chain-"));roots.push(root);
  const store=new FileWorkflowStore(root);const definitions=new WorkflowDefinitionRegistry();const stages=new WorkflowStageRegistry();
  const definition=WorkflowDefinitionSchema.parse({id:"job-chain",version:"1",name:"Job chain",scenario:"talking-head",entryStageIds:["MOTION"],stages:[{id:"MOTION",kind:"job",dependsOn:[],optional:false,retryable:true,reviewRequired:false,invalidates:[],executorKey:"chain"}]});definitions.register(definition);
  const runner=new WorkflowRunner(store,definitions,stages,jobs,{jobPollIntervalMs:2});const project=createProject({id:"demo",name:"Demo",now:"2026-08-24T00:00:00.000Z"});
  const service=new WorkflowService({load:async()=>project},store,definitions,runner);const run=await service.create({projectId:"demo",definitionId:"job-chain",definitionVersion:"1",sourceAssetIds:[],expectedProjectRevision:0});
  return{store,stages,runner,service,run};
};

describe("V2.2 Workflow sequential Job chain",()=>{
  it("persists multiple Durable Job IDs on one Stage and completes only after the last Job",async()=>{
    const jobs=new FakeJobs();const first="11111111-1111-4111-8111-111111111111";const second="22222222-2222-4222-8222-222222222222";jobs.records.set(first,job(first,"completed"));jobs.records.set(second,job(second,"completed"));const h=await harness(jobs);
    let reconciles=0;h.stages.register("chain",{start:async()=>({kind:"job",jobId:first}),reconcileJob:async(_context,current)=>{reconciles++;return current.id===first?{kind:"job",jobId:second}:{outputDigest:"all-motion-complete"};}});
    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);const done=await h.service.get(h.run.id);
    expect(done?.status).toBe("completed");expect(done?.stageExecutions[0]).toMatchObject({status:"completed",jobIds:[first,second],outputDigest:"all-motion-complete"});expect(reconciles).toBe(2);
    const attached=(await h.service.activity(h.run.id)).filter(event=>event.event==="job-attached").map(event=>event.jobId);expect(attached).toEqual([first,second]);
  });

  it("does not create the next child Job while a completed child is waiting behind Pause",async()=>{
    const jobs=new FakeJobs();const first="33333333-3333-4333-8333-333333333333";const second="44444444-4444-4444-8444-444444444444";jobs.records.set(first,job(first,"running"));jobs.records.set(second,job(second,"completed"));const h=await harness(jobs);let secondRequested=0;
    h.stages.register("chain",{start:async()=>({kind:"job",jobId:first}),reconcileJob:async(_context,current)=>{if(current.id===first){secondRequested++;return{kind:"job",jobId:second};}return{outputDigest:"resumed-complete"};}});
    await h.service.start(h.run.id);await waitFor(()=>h.service.get(h.run.id),run=>run?.stageExecutions[0].jobIds.includes(first)===true);await h.service.pause(h.run.id);jobs.records.set(first,job(first,"completed"));await h.runner.waitForIdle(h.run.id);
    const paused=await h.service.get(h.run.id);expect(paused?.status).toBe("paused");expect(paused?.stageExecutions[0].jobIds).toEqual([first]);expect(secondRequested).toBe(0);
    await h.service.resume(h.run.id);await h.runner.waitForIdle(h.run.id);const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");expect(done?.stageExecutions[0].jobIds).toEqual([first,second]);expect(secondRequested).toBe(1);
  });
});
