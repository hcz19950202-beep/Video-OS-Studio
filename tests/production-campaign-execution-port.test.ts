import {describe,expect,it} from "vitest";
import type {ProductionExecution} from "@/lib/production/execution/schema";
import {ProductionExecutionCampaignMissionPort} from "@/lib/production/campaign/execution-port";

const REF={projectId:"campaign-project",missionId:"11111111-1111-4111-8111-111111111111"};
const base=(status:ProductionExecution["status"],patch:Partial<ProductionExecution>={}):ProductionExecution=>({
  id:"22222222-2222-4222-8222-222222222222",
  projectId:REF.projectId,
  missionId:REF.missionId,
  planId:"33333333-3333-4333-8333-333333333333",
  planBaseProjectRevision:1,
  expectedProjectRevision:1,
  status,
  steps:[{stepId:"render",status:status==="completed"?"completed":"pending",operationId:"44444444-4444-4444-8444-444444444444",attempts:status==="completed"?1:0,evidence:status==="completed"?[{kind:"render",id:"55555555-5555-4555-8555-555555555555"}]:[],...(status==="completed"?{completedAt:"2026-08-29T13:00:00.000Z"}:{})}],
  budget:{maxStepAttempts:2,maxTotalAttempts:64,maxAgentTurns:32,maxProviderCalls:32,maxRepairLoops:2,maxRenderAttempts:4,maxWorkflowRetries:2},
  counters:{totalAttempts:0,agentTurns:0,providerCalls:0,repairLoops:0,renderAttempts:0,workflowRetries:0},
  createdAt:"2026-08-29T13:00:00.000Z",
  updatedAt:"2026-08-29T13:00:00.000Z",
  ...patch,
});

describe("B7 Campaign ProductionExecution adapter",()=>{
  it("advances a Mission only until durable completion and returns render evidence",async()=>{
    const states=[base("running"),base("running"),base("completed")];
    let calls=0;
    const port=new ProductionExecutionCampaignMissionPort({
      advance:async()=>states[calls++]!,
      cancel:async()=>null,
    });
    await expect(port.runMission(REF)).resolves.toEqual({status:"completed",finalArtifactIds:["55555555-5555-4555-8555-555555555555"]});
    expect(calls).toBe(3);
  });

  it("surfaces waiting review without auto-approving the checkpoint",async()=>{
    const waiting=base("waiting-review",{activeStepId:"review",steps:[{stepId:"review",status:"waiting-review",operationId:"44444444-4444-4444-8444-444444444444",attempts:0,evidence:[],checkpoint:{id:"66666666-6666-4666-8666-666666666666",stepId:"review",reason:"Human review required.",status:"pending",createdAt:"2026-08-29T13:00:00.000Z"}}]});
    const port=new ProductionExecutionCampaignMissionPort({advance:async()=>waiting,cancel:async()=>null});
    await expect(port.runMission(REF)).resolves.toEqual({status:"waiting-review",currentStep:"review",finalArtifactIds:[]});
  });

  it("preserves durable blocked evidence instead of retrying forever",async()=>{
    const blocked=base("blocked",{steps:[{stepId:"edit",status:"blocked",operationId:"44444444-4444-4444-8444-444444444444",attempts:1,evidence:[],lastFailure:{code:"PRODUCTION_EXECUTION_STALE_PROJECT",message:"Project revision changed.",retryable:false}}]});
    let calls=0;
    const port=new ProductionExecutionCampaignMissionPort({advance:async()=>{calls++;return blocked;},cancel:async()=>null});
    await expect(port.runMission(REF)).resolves.toMatchObject({status:"blocked",blocker:"Project revision changed."});
    expect(calls).toBe(1);
  });

  it("cancels through the accepted Mission execution boundary when the Campaign signal aborts",async()=>{
    const controller=new AbortController();controller.abort();
    let cancelled=0;
    const port=new ProductionExecutionCampaignMissionPort({advance:async()=>base("running"),cancel:async()=>{cancelled++;return null;}});
    await expect(port.runMission(REF,controller.signal)).resolves.toEqual({status:"cancelled",finalArtifactIds:[]});
    expect(cancelled).toBe(1);
  });

  it("stops at a hard bounded advance limit",async()=>{
    let calls=0;
    const port=new ProductionExecutionCampaignMissionPort({advance:async()=>{calls++;return base("running");},cancel:async()=>null},{maxAdvances:3});
    await expect(port.runMission(REF)).resolves.toMatchObject({status:"blocked",blocker:expect.stringContaining("bounded Campaign advance limit")});
    expect(calls).toBe(3);
  });
});
