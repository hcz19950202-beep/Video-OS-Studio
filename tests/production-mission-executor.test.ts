import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {
  ProductionMissionExecutor,
  type ProductionExecutionProjectReader,
  type ProductionStepRunner,
} from "@/lib/production/execution/executor";
import {ProductionExecutionMissionCancelledError,ProductionExecutionPlanMismatchError} from "@/lib/production/execution/errors";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema,type ProductionMission} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanSchema,type ProductionPlan,type ProductionPlanStep} from "@/lib/production/plan/schema";
import {ProjectSchema,type Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const SECOND_PLAN_ID="33333333-3333-4333-8333-333333333333";
const EXECUTION_ID="44444444-4444-4444-8444-444444444444";
const SECOND_EXECUTION_ID="55555555-5555-4555-8555-555555555555";
const CHECKPOINT_ID="77777777-7777-4777-8777-777777777777";
const OPERATION_IDS=[
  "66666666-6666-4666-8666-666666666661",
  "66666666-6666-4666-8666-666666666662",
  "66666666-6666-4666-8666-666666666663",
  "66666666-6666-4666-8666-666666666664",
];

const projectAtRevision=(revision:number):Project=>ProjectSchema.parse({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Project One",revision,createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
});

const analyzeStep=(id="step-1",dependsOn:string[]=[]):ProductionPlanStep=>({
  id,kind:"analyze-script",title:`Analyze ${id}`,objective:"Produce durable script analysis evidence.",dependsOn,
  risk:"low",owner:"agent",reviewRequired:false,requiresProjectRevision:false,evidence:[],
});

const editStep=():ProductionPlanStep=>({
  id:"edit-project",kind:"edit-project",title:"Edit project",objective:"Apply an approved bounded Project edit.",dependsOn:[],
  risk:"medium",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:[],
});

const planFixture=(steps:ProductionPlanStep[]= [analyzeStep()],id=PLAN_ID):ProductionPlan=>ProductionPlanSchema.parse({
  id,projectId:PROJECT_ID,missionId:MISSION_ID,version:1,baseProjectRevision:5,
  summary:"Execute the bounded production plan.",steps,generatedAt:"2026-08-29T00:00:01.000Z",
});

const missionFixture=(overrides:Partial<ProductionMission>={}):ProductionMission=>ProductionMissionSchema.parse({
  id:MISSION_ID,projectId:PROJECT_ID,title:"Builder ad",brief:"Create a proof-led B2B video.",
  target:{platform:"facebook",format:"product-ad",language:"en-AU"},
  autonomyPolicy:{mode:"auto",finalReviewRequired:false},baseProjectRevision:5,status:"ready",planId:PLAN_ID,
  agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:01.000Z",...overrides,
});

const completedRunner=(calls?:string[]):ProductionStepRunner=>({
  execute:async input=>{
    calls?.push(input.step.id);
    return{status:"completed",evidence:[{kind:"agent-session",id:`evidence-${input.step.id}`}]};
  },
});

const setup=async(
  runner:ProductionStepRunner=completedRunner(),
  missionOverrides:Partial<ProductionMission>={},
  plan:ProductionPlan=planFixture(),
  projectReader?:ProductionExecutionProjectReader,
)=>{
  const fs=new InMemoryFileSystemAdapter();
  const missions=new ProductionMissionRepository(fs,"/data");
  const plans=new ProductionPlanRepository(fs,"/data");
  const executions=new ProductionExecutionRepository(fs,"/data");
  await missions.create(missionFixture(missionOverrides));
  await plans.create(plan);
  const executionIds=[EXECUTION_ID,SECOND_EXECUTION_ID];
  const operationIds=[...OPERATION_IDS];
  const projects=projectReader??{load:async()=>projectAtRevision(5)};
  const executor=new ProductionMissionExecutor(missions,plans,executions,projects,runner,{
    now:()=>"2026-08-29T00:00:05.000Z",
    createExecutionId:()=>executionIds.shift()??SECOND_EXECUTION_ID,
    createOperationId:()=>operationIds.shift()??OPERATION_IDS[3],
    createCheckpointId:()=>CHECKPOINT_ID,
  });
  return{fs,missions,plans,executions,executor,projects};
};

describe("ProductionMissionExecutor",()=>{
  it("advances one low-risk step only after durable completion evidence",async()=>{
    const calls:string[]=[];
    const{executor,missions}=await setup(completedRunner(calls));
    const execution=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(execution).toMatchObject({id:EXECUTION_ID,status:"completed",expectedProjectRevision:5});
    expect(execution.steps[0]).toMatchObject({status:"completed",attempts:1,operationId:OPERATION_IDS[0]});
    expect(execution.steps[0].evidence).toEqual([{kind:"agent-session",id:"evidence-step-1"}]);
    expect(calls).toEqual(["step-1"]);
    expect(await missions.require(PROJECT_ID,MISSION_ID)).toMatchObject({status:"completed",executionId:EXECUTION_ID});
  });

  it("creates an application-owned checkpoint before a guided medium-risk step",async()=>{
    let calls=0;
    const runner:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5};}};
    const{executor,missions}=await setup(runner,{autonomyPolicy:{mode:"guided",finalReviewRequired:false}},planFixture([editStep()]));
    const execution=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(execution).toMatchObject({status:"waiting-review",activeStepId:"edit-project"});
    expect(execution.steps[0].checkpoint).toMatchObject({id:CHECKPOINT_ID,status:"pending"});
    expect(calls).toBe(0);
    expect(await missions.require(PROJECT_ID,MISSION_ID)).toMatchObject({status:"waiting-review",activeStepId:"edit-project"});
  });

  it("fails closed before invoking a runner when Project revision is stale",async()=>{
    let calls=0;
    const runner:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}]};}};
    const{executor}=await setup(runner,{},planFixture(),{load:async()=>projectAtRevision(6)});
    const execution=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(execution.status).toBe("blocked");
    expect(execution.steps[0].lastFailure?.code).toBe("PRODUCTION_EXECUTION_STALE_PROJECT");
    expect(calls).toBe(0);
  });

  it("reuses the same operationId across retryable attempts and blocks at the attempt budget",async()=>{
    const operationIds:string[]=[];
    const runner:ProductionStepRunner={execute:async input=>{
      operationIds.push(input.operationId);
      return{status:"retryable-failure",code:"TEMPORARY_PROVIDER_FAILURE",message:"Temporary bounded provider failure."};
    }};
    const{executor}=await setup(runner);
    const first=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(first.steps[0]).toMatchObject({status:"retrying",attempts:1,operationId:OPERATION_IDS[0]});
    const second=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(second).toMatchObject({status:"blocked"});
    expect(second.steps[0]).toMatchObject({status:"blocked",attempts:2,operationId:OPERATION_IDS[0]});
    expect(operationIds).toEqual([OPERATION_IDS[0],OPERATION_IDS[0]]);
  });

  it("records real runner usage and blocks immediately when a usage budget is exceeded",async()=>{
    const runner:ProductionStepRunner={execute:async()=>({
      status:"completed",evidence:[{kind:"agent-session",id:"agent-result"}],usage:{providerCalls:33,agentTurns:0,repairLoops:0},
    })};
    const{executor,missions}=await setup(runner);
    const execution=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(execution.status).toBe("blocked");
    expect(execution.counters.providerCalls).toBe(33);
    expect(execution.steps[0].status).toBe("completed");
    expect((await missions.require(PROJECT_ID,MISSION_ID)).status).toBe("blocked");
  });

  it("does not claim success for a revision-guarded step without verified revision evidence",async()=>{
    const runner:ProductionStepRunner={execute:async()=>({status:"completed",evidence:[{kind:"project",id:PROJECT_ID}]})};
    const{executor}=await setup(runner,{autonomyPolicy:{mode:"auto",finalReviewRequired:false}},planFixture([editStep()]));
    const execution=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(execution.status).toBe("blocked");
    expect(execution.steps[0].status).toBe("blocked");
    expect(execution.steps[0].lastFailure?.code).toBe("PROJECT_REVISION_EVIDENCE_REQUIRED");
  });

  it("refuses to create an execution for an already-cancelled Mission",async()=>{
    const{executor,executions}=await setup(completedRunner(),{status:"cancelled"});
    await expect(executor.advance(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionExecutionMissionCancelledError);
    expect(await executions.list(PROJECT_ID,MISSION_ID)).toEqual([]);
  });

  it("stops after in-flight cancellation while preserving verifiable durable completion evidence",async()=>{
    let start!:()=>void;
    let finish!:()=>void;
    const started=new Promise<void>(resolve=>{start=resolve;});
    const finished=new Promise<void>(resolve=>{finish=resolve;});
    const runner:ProductionStepRunner={execute:async()=>{
      start();
      await finished;
      return{status:"completed",evidence:[{kind:"agent-session",id:"durable-after-cancel"}]};
    }};
    const{executor,missions}=await setup(runner);
    const advancing=executor.advance(PROJECT_ID,MISSION_ID);
    await started;
    const cancelling=executor.cancel(PROJECT_ID,MISSION_ID);
    while((await missions.require(PROJECT_ID,MISSION_ID)).status!=="cancelled")await Promise.resolve();
    finish();
    const[advanced,cancelled]=await Promise.all([advancing,cancelling]);
    expect(advanced.status).toBe("cancelled");
    expect(cancelled?.status).toBe("cancelled");
    expect(advanced.steps[0].status).toBe("completed");
    expect(advanced.steps[0].evidence).toContainEqual({kind:"agent-session",id:"durable-after-cancel"});
    const cancelledMission=await missions.require(PROJECT_ID,MISSION_ID);
    expect(cancelledMission.status).toBe("cancelled");
    expect(cancelledMission.activeStepId).toBeUndefined();
  });

  it("invalidates an old checkpoint after re-plan and starts a fresh execution for the new Plan",async()=>{
    const firstPlan=planFixture([editStep()]);
    const calls:string[]=[];
    const{executor,missions,plans,executions}=await setup(completedRunner(calls),{autonomyPolicy:{mode:"guided",finalReviewRequired:false}},firstPlan);
    const waiting=await executor.advance(PROJECT_ID,MISSION_ID);
    const checkpointId=waiting.steps[0].checkpoint!.id;
    const secondPlan=planFixture([analyzeStep("new-step")],SECOND_PLAN_ID);
    await plans.create(secondPlan);
    await missions.mutate(PROJECT_ID,MISSION_ID,current=>({...current,planId:SECOND_PLAN_ID,status:"ready",activeStepId:undefined,updatedAt:"2026-08-29T00:00:03.000Z"}));

    await expect(executor.review(PROJECT_ID,MISSION_ID,{checkpointId,decision:"approved"})).rejects.toBeInstanceOf(ProductionExecutionPlanMismatchError);
    const fresh=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(fresh).toMatchObject({id:SECOND_EXECUTION_ID,planId:SECOND_PLAN_ID,status:"completed"});
    expect((await executions.require(PROJECT_ID,EXECUTION_ID)).status).toBe("blocked");
    expect(await missions.require(PROJECT_ID,MISSION_ID)).toMatchObject({executionId:SECOND_EXECUTION_ID,planId:SECOND_PLAN_ID,status:"completed"});
    expect(calls).toEqual(["new-step"]);
  });

  it("resumes durable execution after repository restart without rerunning a completed step",async()=>{
    const calls:string[]=[];
    const twoStepPlan=planFixture([analyzeStep("step-1"),analyzeStep("step-2",["step-1"])]);
    const{fs,missions,plans,executor,projects}=await setup(completedRunner(calls),{},twoStepPlan);
    const first=await executor.advance(PROJECT_ID,MISSION_ID);
    expect(first.status).toBe("running");
    expect(first.steps.map(step=>step.status)).toEqual(["completed","pending"]);

    const restartedExecutions=new ProductionExecutionRepository(fs,"/data");
    const restarted=new ProductionMissionExecutor(missions,plans,restartedExecutions,projects,completedRunner(calls),{
      now:()=>"2026-08-29T00:00:06.000Z",
      createExecutionId:()=>SECOND_EXECUTION_ID,
      createOperationId:()=>OPERATION_IDS[3],
      createCheckpointId:()=>CHECKPOINT_ID,
    });
    const second=await restarted.advance(PROJECT_ID,MISSION_ID);
    expect(second).toMatchObject({id:EXECUTION_ID,status:"completed"});
    expect(calls).toEqual(["step-1","step-2"]);
  });
});
