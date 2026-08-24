import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {JobRecordSchema,type JobRecord} from "@/lib/jobs/schema";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner,type WorkflowJobRuntimePort} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema,WorkflowRunSchema,type WorkflowDefinition} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3000)=>{const start=Date.now();while(Date.now()-start<timeoutMs){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error("Timed out waiting for workflow state.");};
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const definition=(stages:WorkflowDefinition["stages"]):WorkflowDefinition=>WorkflowDefinitionSchema.parse({id:"test-flow",version:"1",name:"Test Flow",scenario:"talking-head",stages,entryStageIds:stages.filter(stage=>stage.dependsOn.length===0).map(stage=>stage.id)});
const stage=(id:string,dependsOn:string[]=[],kind:WorkflowDefinition["stages"][number]["kind"]="analysis",retryable=true)=>({id,kind,dependsOn,retryable,reviewRequired:kind==="checkpoint",executorKey:`executor-${id}`});

class FakeJobs implements WorkflowJobRuntimePort{
  readonly records=new Map<string,JobRecord>();
  readonly cancelled:string[]=[];
  readonly retried:string[]=[];
  async get(jobId:string){return this.records.get(jobId)??null;}
  async cancel(jobId:string){this.cancelled.push(jobId);const current=this.records.get(jobId);if(!current)throw new Error("missing job");const at=new Date().toISOString();const next=JobRecordSchema.parse({...current,status:"cancelled",stage:"cancelled",finishedAt:at,updatedAt:at,error:{code:"JOB_CANCELLED",message:"cancelled",retryable:true}});this.records.set(jobId,next);return next;}
  async retry(jobId:string){this.retried.push(jobId);const current=this.records.get(jobId);if(!current)throw new Error("missing job");const next=JobRecordSchema.parse({...current,status:"queued",stage:"queued",attempt:current.attempt+1,error:undefined,finishedAt:undefined,updatedAt:new Date().toISOString()});this.records.set(jobId,next);return next;}
}

const makeHarness=async(flow:WorkflowDefinition,jobs?:FakeJobs)=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-w1-"));roots.push(root);
  const store=new FileWorkflowStore(root);
  const definitions=new WorkflowDefinitionRegistry();definitions.register(flow);
  const stages=new WorkflowStageRegistry();
  const runner=new WorkflowRunner(store,definitions,stages,jobs,{jobPollIntervalMs:2});
  const project=createProject({id:"demo",name:"Demo",now:"2026-08-24T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
  const service=new WorkflowService({load:async()=>project},store,definitions,runner);
  const run=await service.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});
  return{root,store,definitions,stages,runner,service,run,project};
};

const completedJob=(id:string):JobRecord=>JobRecordSchema.parse({id,type:"render-final",projectId:"demo",status:"completed",stage:"completed",progress:1,attempt:1,input:{},output:{ok:true},createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:01.000Z",startedAt:"2026-08-24T00:00:00.100Z",finishedAt:"2026-08-24T00:00:01.000Z"});
const runningJob=(id:string):JobRecord=>JobRecordSchema.parse({id,type:"render-final",projectId:"demo",status:"running",stage:"running",progress:.5,attempt:1,input:{},createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:00.500Z",startedAt:"2026-08-24T00:00:00.100Z"});

describe("V2.2 W1 workflow runtime",()=>{
  it("runs dependency-ordered immediate stages to completion and records activity",async()=>{
    const flow=definition([stage("first"),stage("second",["first"])]);
    const h=await makeHarness(flow);
    h.stages.register("executor-first",{start:async()=>({kind:"completed",outputDigest:"first-digest"})});
    h.stages.register("executor-second",{start:async()=>({kind:"completed",outputDigest:"second-digest"})});
    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");
    expect(done?.stageExecutions.map(item=>[item.stageId,item.status,item.attempt])).toEqual([["first","completed",1],["second","completed",1]]);
    const events=(await h.service.activity(h.run.id)).map(item=>item.event);
    expect(events).toEqual(expect.arrayContaining(["workflow-created","workflow-started","stage-ready","stage-started","stage-completed","workflow-completed"]));
  });

  it("stops at a human checkpoint and continues only after approval",async()=>{
    const flow=definition([stage("plan"),stage("review",["plan"],"checkpoint",false),stage("assemble",["review"])]);
    const h=await makeHarness(flow);
    h.stages.register("executor-plan",{start:async()=>({kind:"completed"})});
    h.stages.register("executor-assemble",{start:async()=>({kind:"completed"})});
    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const waiting=await h.service.get(h.run.id);expect(waiting?.status).toBe("waiting_review");expect(waiting?.checkpoints).toHaveLength(1);expect(waiting?.stageExecutions.find(item=>item.stageId==="review")?.status).toBe("waiting_review");
    const checkpoint=waiting!.checkpoints[0];await h.service.approveCheckpoint(h.run.id,checkpoint.id,3);await h.runner.waitForIdle(h.run.id);
    const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");expect(done?.lastKnownProjectRevision).toBe(3);expect(done?.checkpoints[0]).toMatchObject({status:"approved",resolvedProjectRevision:3});
  });

  it("keeps the active stage running while paused and does not start the next stage until resume",async()=>{
    const flow=definition([stage("slow"),stage("after",["slow"])]);
    const h=await makeHarness(flow);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    h.stages.register("executor-slow",{start:async()=>{await gate;return{kind:"completed"};}});h.stages.register("executor-after",{start:async()=>({kind:"completed"})});
    await h.service.start(h.run.id);await waitFor(()=>h.service.get(h.run.id),run=>run?.stageExecutions.find(item=>item.stageId==="slow")?.status==="running");
    await h.service.pause(h.run.id);release();await h.runner.waitForIdle(h.run.id);
    const paused=await h.service.get(h.run.id);expect(paused?.status).toBe("paused");expect(paused?.stageExecutions.find(item=>item.stageId==="slow")?.status).toBe("completed");expect(paused?.stageExecutions.find(item=>item.stageId==="after")?.status).toBe("pending");
    await h.service.resume(h.run.id);await h.runner.waitForIdle(h.run.id);expect((await h.service.get(h.run.id))?.status).toBe("completed");
  });

  it("fails a stage, retries only that stage, and preserves a new attempt identity",async()=>{
    const flow=definition([stage("flaky")]);const h=await makeHarness(flow);let calls=0;
    h.stages.register("executor-flaky",{start:async()=>{calls++;if(calls===1)throw Object.assign(new Error("first failure"),{code:"FIXTURE_FAIL",retryable:true});return{kind:"completed"};}});
    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);const failed=await h.service.get(h.run.id);expect(failed?.status).toBe("failed");expect(failed?.stageExecutions[0]).toMatchObject({status:"failed",attempt:1});const firstOperation=failed!.stageExecutions[0].operationIds[0];
    await h.service.retryStage(h.run.id,"flaky");await h.runner.waitForIdle(h.run.id);const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");expect(done?.stageExecutions[0].attempt).toBe(2);expect(done?.stageExecutions[0].operationIds).toHaveLength(2);expect(done?.stageExecutions[0].operationIds[1]).not.toBe(firstOperation);expect(calls).toBe(2);
  });

  it("cancels an attached active durable job when the workflow is cancelled",async()=>{
    const flow=definition([stage("render",[],"job")]);const jobs=new FakeJobs();const h=await makeHarness(flow,jobs);const jobId="11111111-1111-4111-8111-111111111111";jobs.records.set(jobId,runningJob(jobId));
    h.stages.register("executor-render",{start:async()=>({kind:"job",jobId})});
    await h.service.start(h.run.id);await waitFor(()=>h.service.get(h.run.id),run=>run?.stageExecutions[0].jobIds.includes(jobId)===true);
    await h.service.cancel(h.run.id);await h.runner.waitForIdle(h.run.id);const cancelled=await h.service.get(h.run.id);expect(cancelled?.status).toBe("cancelled");expect(cancelled?.stageExecutions[0].status).toBe("cancelled");expect(jobs.cancelled).toEqual([jobId]);
  });

  it("reconciles a completed durable job after restart and completes the workflow",async()=>{
    const flow=definition([stage("render",[],"job")]);const jobs=new FakeJobs();const h=await makeHarness(flow,jobs);const jobId="22222222-2222-4222-8222-222222222222";jobs.records.set(jobId,completedJob(jobId));let reconciled=0;
    h.stages.register("executor-render",{start:async()=>({kind:"job",jobId}),reconcileJob:async(_context,job)=>{reconciled++;expect(job.status).toBe("completed");return{outputDigest:"render-digest"};}});
    const active=WorkflowRunSchema.parse({...h.run,status:"running",currentStageId:"render",updatedAt:new Date().toISOString(),stageExecutions:[{stageId:"render",status:"running",attempt:1,attemptId:"33333333-3333-4333-8333-333333333333",startedAt:"2026-08-24T00:00:00.000Z",baseProjectRevision:0,jobIds:[jobId],operationIds:["workflow:fixture"],artifactIds:[]}]});await h.store.save(active);
    await h.service.recover();await h.runner.waitForIdle(h.run.id);const done=await h.service.get(h.run.id);expect(done?.status).toBe("completed");expect(done?.stageExecutions[0].outputDigest).toBe("render-digest");expect(reconciled).toBe(1);
  });

  it("marks a previously active non-job stage interrupted on restart instead of guessing success",async()=>{
    const flow=definition([stage("analysis")]);const h=await makeHarness(flow);h.stages.register("executor-analysis",{start:async()=>({kind:"completed"})});
    const active=WorkflowRunSchema.parse({...h.run,status:"running",currentStageId:"analysis",updatedAt:new Date().toISOString(),stageExecutions:[{stageId:"analysis",status:"running",attempt:1,attemptId:"44444444-4444-4444-8444-444444444444",startedAt:"2026-08-24T00:00:00.000Z",baseProjectRevision:0,jobIds:[],operationIds:["workflow:fixture"],artifactIds:[]}]});await h.store.save(active);
    await h.service.recover();const interrupted=await h.service.get(h.run.id);expect(interrupted?.status).toBe("interrupted");expect(interrupted?.stageExecutions[0]).toMatchObject({status:"interrupted",error:{code:"WORKFLOW_STAGE_INTERRUPTED",retryable:true}});
  });
});
