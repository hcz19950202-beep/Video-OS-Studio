import {createHash} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {createProject} from "@/lib/project/factory";
import {JobRecordSchema,type CreateJobInput,type JobArtifact,type JobRecord} from "@/lib/jobs/schema";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import {createWorkflowJobRuntimePort} from "@/lib/workflows/job-port";
import {W2_EXECUTOR_KEYS,registerProductionWorkflowStages,type ProductionWorkflowJobRuntime,type ProductionWorkflowVisualPlan} from "@/lib/workflows/production-stages";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry,type WorkflowStageExecutionContext} from "@/lib/workflows/registry";
import {WorkflowRunner,type WorkflowJobRuntimePort} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema,WorkflowRunSchema,type WorkflowDefinition} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";
import {W4_WORKFLOW_DEFINITIONS} from "@/lib/workflows/w4-definitions";
import {W4_FINAL_RENDER_EXECUTOR_KEY,registerW4WorkflowStages,type W4WorkflowJobRuntime} from "@/lib/workflows/w4-stages";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-w5-"));roots.push(root);return root;};
const at="2026-08-24T00:00:00.000Z";
const definition=(stages:WorkflowDefinition["stages"]):WorkflowDefinition=>WorkflowDefinitionSchema.parse({id:"w5-test-flow",version:"1",name:"W5 Test Flow",scenario:"talking-head",stages,entryStageIds:stages.filter(stage=>stage.dependsOn.length===0).map(stage=>stage.id)});
const stage=(id:string,executorKey=`executor-${id}`,kind:WorkflowDefinition["stages"][number]["kind"]="analysis"):WorkflowDefinition["stages"][number]=>({id,kind,dependsOn:[],optional:false,retryable:true,reviewRequired:false,invalidates:[],executorKey});

const completedRenderJob=(id:string,projectId="demo",sourceProjectRevision=5):JobRecord=>JobRecordSchema.parse({id,type:"render-final",projectId,status:"completed",stage:"completed",progress:1,attempt:1,input:{assetBaseUrl:"http://127.0.0.1:3000"},output:{outputRelativePath:`render/${id}.mp4`,mode:"final",sourceProjectRevision},createdAt:at,updatedAt:at,startedAt:at,finishedAt:at});

class NoopProductionJobs implements ProductionWorkflowJobRuntime{
  async create(_input:CreateJobInput):Promise<JobRecord>{throw new Error("Unexpected durable job creation in this W5 fixture.");}
  async get(_jobId:string){return null;}
  async getArtifacts(_jobId:string):Promise<JobArtifact[]>{return[];}
  async cancel(_jobId:string):Promise<JobRecord>{throw new Error("Unexpected durable job cancellation in this W5 fixture.");}
  async retry(_jobId:string):Promise<JobRecord>{throw new Error("Unexpected durable job retry in this W5 fixture.");}
}

const noVisualPlan:ProductionWorkflowVisualPlan={
  generate:async()=>{throw new Error("Unexpected visual-plan generation in this W5 fixture.");},
  apply:async()=>{throw new Error("Unexpected visual-plan apply in this W5 fixture.");},
};

describe("V2.2 W5 failure retry and restart hardening",()=>{
  it("maps stale Project-revision Job input to a Workflow-retryable failure without mutating Job truth",async()=>{
    const stale=JobRecordSchema.parse({id:"11111111-1111-4111-8111-111111111111",type:"video-use-transcribe",projectId:"demo",status:"failed",stage:"failed",progress:.5,attempt:1,input:{expectedRevision:3,operationId:"old"},error:{code:"PROJECT_REVISION_CONFLICT",message:"stale",retryable:false,details:{expectedRevision:3,currentRevision:4}},createdAt:at,updatedAt:at,finishedAt:at});
    const source:WorkflowJobRuntimePort={get:async()=>stale,cancel:async()=>stale,retry:async()=>stale};
    const port=createWorkflowJobRuntimePort(source);const adapted=await port.get(stale.id);
    expect(stale.error?.retryable).toBe(false);expect(adapted?.error).toMatchObject({code:"PROJECT_REVISION_CONFLICT",retryable:true,details:{workflowRetryMode:"fresh-input-job"}});
  });

  it("runs Workflow recovery automatically before the first service read after process restart",async()=>{
    const root=await makeRoot();const store=new FileWorkflowStore(root);const definitions=new WorkflowDefinitionRegistry();const flow=definition([stage("analysis")]);definitions.register(flow);const stages=new WorkflowStageRegistry();stages.register("executor-analysis",{start:async()=>({kind:"completed"})});
    const project=createProject({id:"demo",name:"Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:300});const firstRunner=new WorkflowRunner(store,definitions,stages);const firstService=new WorkflowService({load:async()=>project},store,definitions,firstRunner);const created=await firstService.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});
    await store.save(WorkflowRunSchema.parse({...created,status:"running",currentStageId:"analysis",stageExecutions:[{stageId:"analysis",status:"running",attempt:1,attemptId:"22222222-2222-4222-8222-222222222222",startedAt:at,baseProjectRevision:0,jobIds:[],operationIds:["workflow:old-attempt"],artifactIds:[]}]}));
    const restartedRunner=new WorkflowRunner(store,definitions,stages);const restartedService=new WorkflowService({load:async()=>project},store,definitions,restartedRunner);const recovered=await restartedService.get(created.id);
    expect(recovered?.status).toBe("interrupted");expect(recovered?.stageExecutions[0]).toMatchObject({status:"interrupted",error:{code:"WORKFLOW_STAGE_INTERRUPTED",retryable:true}});
  });

  it("refreshes the latest Project revision before retrying a failed stage",async()=>{
    const root=await makeRoot();const store=new FileWorkflowStore(root);const definitions=new WorkflowDefinitionRegistry();const flow=definition([stage("flaky")]);definitions.register(flow);const stages=new WorkflowStageRegistry();let observedBase:number|undefined;let calls=0;stages.register("executor-flaky",{start:async context=>{calls++;observedBase=context.execution.baseProjectRevision;if(calls===1)throw Object.assign(new Error("fixture failure"),{code:"FIXTURE_FAIL",retryable:true});return{kind:"completed"};}});
    let project=createProject({id:"demo",name:"Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:300});const runner=new WorkflowRunner(store,definitions,stages);const service=new WorkflowService({load:async()=>project},store,definitions,runner);const run=await service.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});await service.start(run.id);await runner.waitForIdle(run.id);expect((await service.get(run.id))?.status).toBe("failed");
    project={...project,project:{...project.project,revision:1,updatedAt:"2026-08-24T00:01:00.000Z"}};await service.retryStage(run.id,"flaky");await runner.waitForIdle(run.id);const done=await service.get(run.id);
    expect(done?.status).toBe("completed");expect(done?.lastKnownProjectRevision).toBe(1);expect(done?.stageExecutions[0].baseProjectRevision).toBe(1);expect(observedBase).toBe(1);
  });

  it("does not duplicate a Project mutation when the Project committed before Workflow stage completion persisted",async()=>{
    const root=await makeRoot();const fs=new NodeFileSystemAdapter();const repository=new ProjectRepository(fs,root);const coordinator=new ProjectMutationCoordinator(fs,repository);await repository.create({id:"demo",name:"Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:120});
    await coordinator.applyTransaction("demo",{expectedRevision:0,transactionId:"seed-script",transaction:{label:"Seed transcript",commands:[{type:"set-script-document",script:{baseSourceRanges:[{startFrame:0,endFrame:120}],segments:[{id:"seg-1",status:"active",semanticTags:[],words:[{id:"w1",text:"hello",startFrame:0,endFrame:30,confidence:.99},{id:"w2",text:"world",startFrame:30,endFrame:60,confidence:.99}]}]}}]}});
    let mutationCalls=0;let crashAfterCommit=true;const mutations={
      getOperation:(projectId:string,operationId:string)=>coordinator.getOperation(projectId,operationId),
      applyTransaction:async(projectId:string,input:Parameters<ProjectMutationCoordinator["applyTransaction"]>[1])=>{mutationCalls++;const committed=await coordinator.applyTransaction(projectId,input);if(crashAfterCommit){crashAfterCommit=false;throw Object.assign(new Error("simulated crash after Project commit"),{code:"SIMULATED_COMMIT_GAP",retryable:true});}return committed;},
    };
    const flow=definition([stage("CAPTION_GENERATION",W2_EXECUTOR_KEYS.captionGeneration,"mutation")]);const definitions=new WorkflowDefinitionRegistry();definitions.register(flow);const stages=registerProductionWorkflowStages(new WorkflowStageRegistry(),{fs,repository,mutations,jobs:new NoopProductionJobs(),visualPlan:noVisualPlan,assetBaseUrl:"http://127.0.0.1:3000"});const store=new FileWorkflowStore(root);const runner=new WorkflowRunner(store,definitions,stages);const service=new WorkflowService(repository,store,definitions,runner);const run=await service.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:1});
    await service.start(run.id);await runner.waitForIdle(run.id);const failed=await service.get(run.id);const committedProject=await repository.load("demo");const revisionAfterCommit=committedProject.project.revision;const captionCountAfterCommit=committedProject.tracks.find(track=>track.id==="captions-main")?.clips.length;
    expect(failed?.status).toBe("failed");expect(revisionAfterCommit).toBe(2);expect(captionCountAfterCommit).toBe(1);expect(mutationCalls).toBe(1);const firstBaseOperation=failed!.stageExecutions[0].operationIds[0];const derivedOperation=`wf-${createHash("sha256").update(`${firstBaseOperation}:captions`).digest("hex").slice(0,32)}-captions`;expect(await coordinator.getOperation("demo",derivedOperation)).toMatchObject({status:"applied",appliedRevision:2});
    await service.retryStage(run.id,"CAPTION_GENERATION");await runner.waitForIdle(run.id);const done=await service.get(run.id);const afterRetry=await repository.load("demo");
    expect(done?.status).toBe("completed");expect(mutationCalls).toBe(1);expect(afterRetry.project.revision).toBe(revisionAfterCommit);expect(afterRetry.tracks.find(track=>track.id==="captions-main")?.clips.length).toBe(captionCountAfterCommit);
  });

  it("rejects a stale completed Final Render and creates a fresh render Job on retry",async()=>{
    let project=createProject({id:"demo",name:"Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:300});project={...project,project:{...project.project,revision:5}};const oldId="33333333-3333-4333-8333-333333333333";const newId="44444444-4444-4444-8444-444444444444";const oldJob=completedRenderJob(oldId,"demo",5);let creates=0;const jobs:W4WorkflowJobRuntime={get:async id=>id===oldId?oldJob:null,cancel:async()=>oldJob,retry:async()=>oldJob,create:async(input:CreateJobInput)=>{creates++;return JobRecordSchema.parse({id:newId,type:"render-final",projectId:"demo",status:"queued",stage:"queued",progress:0,attempt:1,input:input.input,createdAt:at,updatedAt:at});},getArtifacts:async()=>[{id:"final",kind:"render",label:"Final",relativePath:`render/${oldId}.mp4`,mimeType:"video/mp4"}]};
    const registry=registerW4WorkflowStages(new WorkflowStageRegistry(),{repository:{load:async()=>project},jobs,fallbackAssetBaseUrl:"http://127.0.0.1:3000"});const definition=W4_WORKFLOW_DEFINITIONS[0];const finalStage=definition.stages.find(item=>item.id==="FINAL_RENDER")!;const baseRun={id:"55555555-5555-4555-8555-555555555555",definitionId:definition.id,definitionVersion:definition.version,projectId:"demo",createdAt:at,updatedAt:at,status:"running" as const,scenario:"talking-head" as const,sourceAssetIds:[],assetBaseUrl:"http://127.0.0.1:3000",canvasSnapshot:{width:1920,height:1080,fps:30},stageExecutions:[],checkpoints:[],artifacts:[],lastKnownProjectRevision:5};const execution={stageId:"FINAL_RENDER",status:"running" as const,attempt:1,attemptId:"66666666-6666-4666-8666-666666666666",baseProjectRevision:5,jobIds:[oldId],operationIds:["workflow:old"],artifactIds:[]};const context={run:baseRun,definition,stage:finalStage,execution,attemptId:execution.attemptId,operationId:"workflow:old",previousJobIds:[]} as WorkflowStageExecutionContext;
    project={...project,project:{...project.project,revision:6}};await expect(registry.get(W4_FINAL_RENDER_EXECUTOR_KEY).reconcileJob!(context,oldJob)).rejects.toMatchObject({code:"WORKFLOW_RENDER_STALE",retryable:true});
    const retryExecution={...execution,attempt:2,attemptId:"77777777-7777-4777-8777-777777777777",baseProjectRevision:6,operationIds:["workflow:old","workflow:new"]};const retryContext={...context,run:{...baseRun,lastKnownProjectRevision:6},execution:retryExecution,attemptId:retryExecution.attemptId,operationId:"workflow:new",previousJobIds:[oldId]};const started=await registry.get(W4_FINAL_RENDER_EXECUTOR_KEY).start(retryContext);
    expect(started).toEqual({kind:"job",jobId:newId});expect(creates).toBe(1);
  });
});
