import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionMissionExecutor,type ProductionStepRunner} from "@/lib/production/execution/executor";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionExecutionSchema} from "@/lib/production/execution/schema";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanSchema} from "@/lib/production/plan/schema";
import {ProjectSchema} from "@/schemas/project";

const PROJECT_ID="project-runner-ownership";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const EXECUTION_ID="44444444-4444-4444-8444-444444444444";
const OPERATION_ID="66666666-6666-4666-8666-666666666661";
const OWNER_TOKEN="77777777-7777-4777-8777-777777777777";
const REPLACEMENT_TOKEN="88888888-8888-4888-8888-888888888888";
const NOW="2026-08-30T08:00:00.000Z";

const project=ProjectSchema.parse({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Runner ownership",revision:5,createdAt:NOW,updatedAt:NOW},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
});

const plan=ProductionPlanSchema.parse({
  id:PLAN_ID,
  projectId:PROJECT_ID,
  missionId:MISSION_ID,
  version:1,
  baseProjectRevision:5,
  summary:"Verify crash-safe runner ownership.",
  steps:[{
    id:"step-1",
    kind:"analyze-script",
    title:"Analyze",
    objective:"Produce durable analysis evidence.",
    dependsOn:[],
    risk:"low",
    owner:"agent",
    reviewRequired:false,
    requiresProjectRevision:false,
    evidence:[],
  }],
  generatedAt:NOW,
});

const mission=ProductionMissionSchema.parse({
  id:MISSION_ID,
  projectId:PROJECT_ID,
  title:"Runner ownership",
  brief:"Verify restart-safe production execution.",
  target:{platform:"facebook",format:"product-ad",language:"en-AU"},
  autonomyPolicy:{mode:"auto",finalReviewRequired:false},
  baseProjectRevision:5,
  status:"running",
  planId:PLAN_ID,
  executionId:EXECUTION_ID,
  activeStepId:"step-1",
  agentSessionIds:[],
  workflowRunIds:[],
  jobIds:[],
  createdAt:NOW,
  updatedAt:NOW,
});

const runningExecution=(owner?:{pid:number;token:string})=>ProductionExecutionSchema.parse({
  id:EXECUTION_ID,
  projectId:PROJECT_ID,
  missionId:MISSION_ID,
  planId:PLAN_ID,
  planBaseProjectRevision:5,
  expectedProjectRevision:5,
  status:"running",
  activeStepId:"step-1",
  steps:[{
    stepId:"step-1",
    status:"running",
    operationId:OPERATION_ID,
    ...(owner?{runnerOwnerPid:owner.pid,runnerOwnerToken:owner.token,runnerClaimedAt:NOW}:{}),
    attempts:1,
    evidence:[],
    startedAt:NOW,
  }],
  budget:{},
  counters:{totalAttempts:1},
  createdAt:NOW,
  updatedAt:NOW,
});

const setup=async(runner:ProductionStepRunner,execution=runningExecution())=>{
  const fs=new InMemoryFileSystemAdapter();
  const missions=new ProductionMissionRepository(fs,"/data");
  const plans=new ProductionPlanRepository(fs,"/data");
  const executions=new ProductionExecutionRepository(fs,"/data");
  await missions.create(mission);
  await plans.create(plan);
  await executions.create(execution);
  const executor=new ProductionMissionExecutor(missions,plans,executions,{load:async()=>project},runner,{now:()=>NOW});
  return{executor,executions};
};

describe("ProductionMissionExecutor durable runner ownership",()=>{
  it("recovers a crash after durable claim but before runner execution without consuming another attempt",async()=>{
    const calls:string[]=[];
    const runner:ProductionStepRunner={execute:async input=>{
      calls.push(input.operationId);
      return{status:"completed",evidence:[{kind:"agent-session",id:"recovered-analysis"}]};
    }};
    const{executor}=await setup(runner);

    const result=await executor.advance(PROJECT_ID,MISSION_ID);

    expect(calls).toEqual([OPERATION_ID]);
    expect(result.status).toBe("completed");
    expect(result.steps[0]).toMatchObject({status:"completed",operationId:OPERATION_ID,attempts:1});
    expect(result.steps[0].runnerOwnerToken).toBeUndefined();
  });

  it("does not replay a running step while its persisted owner process is alive",async()=>{
    let calls=0;
    const runner:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"agent-session",id:"unexpected"}]};}};
    const{executor}=await setup(runner,runningExecution({pid:process.pid,token:OWNER_TOKEN}));

    const result=await executor.advance(PROJECT_ID,MISSION_ID);

    expect(calls).toBe(0);
    expect(result.status).toBe("running");
    expect(result.steps[0]).toMatchObject({status:"running",runnerOwnerPid:process.pid,runnerOwnerToken:OWNER_TOKEN});
  });

  it("reclaims a running step whose persisted owner process is gone and reuses the stable operation id",async()=>{
    const calls:string[]=[];
    const runner:ProductionStepRunner={execute:async input=>{
      calls.push(input.operationId);
      return{status:"completed",evidence:[{kind:"agent-session",id:"dead-owner-recovery"}]};
    }};
    const{executor}=await setup(runner,runningExecution({pid:2_147_483_647,token:OWNER_TOKEN}));

    const result=await executor.advance(PROJECT_ID,MISSION_ID);

    expect(calls).toEqual([OPERATION_ID]);
    expect(result.status).toBe("completed");
    expect(result.steps[0]).toMatchObject({status:"completed",operationId:OPERATION_ID,attempts:1});
  });

  it("ignores a late runner result after durable ownership has moved to a replacement claim",async()=>{
    let release!:()=>void;
    let started!:()=>void;
    const runnerStarted=new Promise<void>(resolve=>{started=resolve;});
    const runnerRelease=new Promise<void>(resolve=>{release=resolve;});
    const runner:ProductionStepRunner={execute:async()=>{
      started();
      await runnerRelease;
      return{status:"completed",evidence:[{kind:"agent-session",id:"late-result"}]};
    }};
    const pending=ProductionExecutionSchema.parse({
      ...runningExecution(),
      activeStepId:undefined,
      steps:[{stepId:"step-1",status:"pending",operationId:OPERATION_ID,attempts:0,evidence:[]}],
      counters:{},
    });
    const{executor,executions}=await setup(runner,pending);

    const advancing=executor.advance(PROJECT_ID,MISSION_ID);
    await runnerStarted;
    const claimed=await executions.require(PROJECT_ID,EXECUTION_ID);
    const originalToken=claimed.steps[0].runnerOwnerToken;
    expect(originalToken).toBeDefined();
    await executions.mutate(PROJECT_ID,EXECUTION_ID,current=>ProductionExecutionSchema.parse({
      ...current,
      steps:current.steps.map(step=>step.stepId==="step-1"?{
        ...step,
        runnerOwnerPid:process.pid,
        runnerOwnerToken:REPLACEMENT_TOKEN,
        runnerClaimedAt:NOW,
      }:step),
    }));
    release();

    const result=await advancing;

    expect(result.status).toBe("running");
    expect(result.steps[0]).toMatchObject({status:"running",runnerOwnerToken:REPLACEMENT_TOKEN});
    expect(result.steps[0].evidence).toEqual([]);
  });
});
