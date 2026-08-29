import {describe,expect,it,vi} from "vitest";
import {ApplicationProductionQAStepPort} from "@/lib/production/execution/qa-step-port";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {ProductionQAService} from "@/lib/production/qa/service";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const PLAN_ID="22222222-2222-4222-8222-222222222222";
const EXECUTION_ID="33333333-3333-4333-8333-333333333333";
const QA_OPERATION_ID="44444444-4444-4444-8444-444444444444";
const RENDER_OPERATION_ID="55555555-5555-4555-8555-555555555555";
const NOW="2026-08-29T00:00:00.000Z";

const input=():ProductionStepRunnerInput=>({
  mission:{id:MISSION_ID,projectId:PROJECT_ID,autonomyPolicy:"assist"} as unknown as ProductionStepRunnerInput["mission"],
  plan:{
    id:PLAN_ID,
    projectId:PROJECT_ID,
    missionId:MISSION_ID,
    baseProjectRevision:3,
    steps:[
      {id:"render",kind:"render-final",title:"Render",objective:"Render",dependsOn:[],risk:"medium",owner:"job",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
      {id:"qa",kind:"qa",title:"QA",objective:"QA",dependsOn:["render"],risk:"low",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
    ],
  } as ProductionStepRunnerInput["plan"],
  step:{id:"qa",kind:"qa",title:"QA",objective:"QA",dependsOn:["render"],risk:"low",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
  execution:{
    id:EXECUTION_ID,
    projectId:PROJECT_ID,
    missionId:MISSION_ID,
    planId:PLAN_ID,
    expectedProjectRevision:3,
    steps:[{
      stepId:"render",
      status:"completed",
      operationId:RENDER_OPERATION_ID,
      attempts:1,
      evidence:[{kind:"job",id:RENDER_OPERATION_ID},{kind:"render",id:RENDER_OPERATION_ID}],
      completedAt:NOW,
    }],
  } as unknown as ProductionStepRunnerInput["execution"],
  operationId:QA_OPERATION_ID,
  expectedProjectRevision:3,
  remainingUsageBudget:{agentTurns:4,providerCalls:4,repairLoops:2},
});

const report=(revision=3)=>({
  id:QA_OPERATION_ID,
  projectId:PROJECT_ID,
  missionId:MISSION_ID,
  renderJobId:RENDER_OPERATION_ID,
  projectRevision:revision,
  renderSourceProjectRevision:revision,
  status:"pass",
  expectations:{hookTerms:[],ctaTerms:[],evidenceTerms:[],hookWindowSeconds:5},
  technicalEvidence:{},
  findings:[],
  createdAt:NOW,
});

describe("ApplicationProductionQAStepPort",()=>{
  it("runs QA from completed render-final evidence using the stable Mission step operation id as report id",async()=>{
    const qa={run:vi.fn(async()=>report())};
    const port=new ApplicationProductionQAStepPort(qa as unknown as Pick<ProductionQAService,"run">);

    const result=await port.execute(input());

    expect(qa.run).toHaveBeenCalledWith(PROJECT_ID,{missionId:MISSION_ID,renderJobId:RENDER_OPERATION_ID},{reportId:QA_OPERATION_ID});
    expect(result).toEqual({status:"completed",evidence:[{kind:"qa-report",id:QA_OPERATION_ID},{kind:"render",id:RENDER_OPERATION_ID}],projectRevisionAfter:3});
  });

  it("fails closed without one direct completed render-final evidence source",async()=>{
    const qa={run:vi.fn()};
    const port=new ApplicationProductionQAStepPort(qa as unknown as Pick<ProductionQAService,"run">);
    const value=input();
    value.execution.steps=[];

    const result=await port.execute(value);

    expect(result).toMatchObject({status:"blocked",code:"PRODUCTION_QA_RENDER_EVIDENCE_INVALID"});
    expect(qa.run).not.toHaveBeenCalled();
  });

  it("blocks QA evidence that does not prove the expected Project revision",async()=>{
    const qa={run:vi.fn(async()=>report(2))};
    const port=new ApplicationProductionQAStepPort(qa as unknown as Pick<ProductionQAService,"run">);

    const result=await port.execute(input());

    expect(result).toMatchObject({status:"blocked",code:"PRODUCTION_QA_REVISION_MISMATCH"});
  });
});
