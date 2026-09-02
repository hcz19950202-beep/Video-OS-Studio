import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const makeHarness=async()=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-v2-5-c7-workflow-startup-"));roots.push(root);
  const store=new FileWorkflowStore(root);
  const definitions=new WorkflowDefinitionRegistry();
  const flow=WorkflowDefinitionSchema.parse({
    id:"v2-5-c7-workflow-startup-failure",
    version:"1",
    name:"V2.5 C7 Workflow Startup Failure",
    scenario:"talking-head",
    stages:[{
      id:"SCENE_DETECTION",
      kind:"analysis",
      dependsOn:[],
      optional:false,
      retryable:true,
      reviewRequired:false,
      invalidates:[],
      executorKey:"executor-scene-detection",
    }],
    entryStageIds:["SCENE_DETECTION"],
  });
  definitions.register(flow);
  const stages=new WorkflowStageRegistry();
  const runner=new WorkflowRunner(store,definitions,stages,undefined,{jobPollIntervalMs:2});
  const project=createProject({id:"demo",name:"Demo",now:"2026-09-02T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
  const service=new WorkflowService({load:async()=>project},store,definitions,runner);
  const run=await service.create({projectId:"demo",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});
  return{store,stages,runner,service,run};
};

describe("V2.5 C7 Workflow Runner startup failure hardening",()=>{
  it("records a stage-started activity failure instead of leaving an orphan running execution",async()=>{
    const h=await makeHarness();let executorCalls=0;
    h.stages.register("executor-scene-detection",{start:async()=>{executorCalls++;return{kind:"completed"};}});
    const appendActivity=h.store.appendActivity.bind(h.store);let failStageStarted=true;
    h.store.appendActivity=async activity=>{
      if(failStageStarted&&activity.event==="stage-started"){
        failStageStarted=false;
        throw Object.assign(new Error("fixture stage-started append failure"),{code:"FIXTURE_ACTIVITY_WRITE_FAILED",retryable:true});
      }
      return appendActivity(activity);
    };

    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const failed=await h.service.get(h.run.id);const execution=failed?.stageExecutions[0];
    expect(executorCalls).toBe(0);
    expect(failed).toMatchObject({status:"failed",currentStageId:"SCENE_DETECTION",error:{code:"FIXTURE_ACTIVITY_WRITE_FAILED",retryable:true}});
    expect(execution).toMatchObject({stageId:"SCENE_DETECTION",status:"failed",attempt:1,jobIds:[],error:{code:"FIXTURE_ACTIVITY_WRITE_FAILED",retryable:true}});
    const events=(await h.service.activity(h.run.id)).map(item=>item.event);
    expect(events).toEqual(expect.arrayContaining(["workflow-created","workflow-started","stage-ready","stage-failed","workflow-failed"]));
    expect(events).not.toContain("stage-started");
  });

  it("records executor lookup failure instead of leaving an orphan running execution",async()=>{
    const h=await makeHarness();

    await h.service.start(h.run.id);await h.runner.waitForIdle(h.run.id);
    const failed=await h.service.get(h.run.id);const execution=failed?.stageExecutions[0];
    expect(failed).toMatchObject({status:"failed",currentStageId:"SCENE_DETECTION",error:{code:"WORKFLOW_EXECUTOR_NOT_FOUND",retryable:true}});
    expect(execution).toMatchObject({stageId:"SCENE_DETECTION",status:"failed",attempt:1,jobIds:[],error:{code:"WORKFLOW_EXECUTOR_NOT_FOUND",retryable:true}});
    const events=(await h.service.activity(h.run.id)).map(item=>item.event);
    expect(events).toEqual(expect.arrayContaining(["workflow-created","workflow-started","stage-ready","stage-started","stage-failed","workflow-failed"]));
  });
});
