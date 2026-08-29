import {describe,expect,it,vi} from "vitest";
import type {AgentRunnerInput} from "@/lib/ai/runner";
import type {AgentSession} from "@/lib/ai/session/schema";
import {ApplicationProductionAgentStepPort} from "@/lib/production/execution/agent-step-port";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const PLAN_ID="22222222-2222-4222-8222-222222222222";
const EXECUTION_ID="33333333-3333-4333-8333-333333333333";
const OPERATION_ID="44444444-4444-4444-8444-444444444444";
const PROPOSAL_ID="55555555-5555-4555-8555-555555555555";
const TURN_ID="66666666-6666-4666-8666-666666666666";
const MESSAGE_ID="message-1";
const NOW="2026-08-29T00:00:00.000Z";

const inputFor=(kind:"analyze-script"|"plan-visuals"|"prepare-assets"):ProductionStepRunnerInput=>({
  mission:{id:MISSION_ID,projectId:PROJECT_ID,autonomyPolicy:"assist"} as unknown as ProductionStepRunnerInput["mission"],
  plan:{id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,baseProjectRevision:1} as ProductionStepRunnerInput["plan"],
  step:{
    id:`step-${kind}`,
    kind,
    title:"UNTRUSTED TITLE powershell -Command bad",
    objective:"UNTRUSTED OBJECTIVE cmd.exe /c bad",
    dependsOn:[],
    risk:"low",
    owner:"agent",
    reviewRequired:false,
    requiresProjectRevision:true,
    evidence:[],
  },
  execution:{id:EXECUTION_ID,projectId:PROJECT_ID,missionId:MISSION_ID,planId:PLAN_ID,expectedProjectRevision:1,steps:[]} as unknown as ProductionStepRunnerInput["execution"],
  operationId:OPERATION_ID,
  expectedProjectRevision:1,
  remainingUsageBudget:{agentTurns:3,providerCalls:4,repairLoops:2},
});

const completedSession=(kind:"analyze-script"|"plan-visuals"|"prepare-assets"="plan-visuals"):AgentSession=>({
  id:OPERATION_ID,
  projectId:PROJECT_ID,
  providerId:"deterministic-b6",
  status:"active",
  createdAt:NOW,
  updatedAt:NOW,
  messages:[],
  turns:[{
    id:TURN_ID,
    baseProjectRevision:1,
    userMessageId:MESSAGE_ID,
    startedAt:NOW,
    completedAt:NOW,
    status:"completed",
    providerRoundTrips:2,
    toolExecutions:[],
    proposalIds:kind==="plan-visuals"?[PROPOSAL_ID]:[],
  }],
  proposals:kind==="plan-visuals"?[{
    id:PROPOSAL_ID,
    sessionId:OPERATION_ID,
    projectId:PROJECT_ID,
    baseProjectRevision:1,
    title:"Visual plan",
    summary:"One visual",
    rationale:[],
    operations:[{id:"visual-op",kind:"visual-plan",summary:"Plan visual",payload:{}}],
    warnings:[],
    createdAt:NOW,
    status:"draft",
  }]:[],
  approvedOperations:[],
});

const repository=(initial:AgentSession|null=null)=>{
  let stored=initial;
  return{
    load:vi.fn(async()=>stored),
    create:vi.fn(async(session:AgentSession)=>{stored=session;return session;}),
  };
};

describe("ApplicationProductionAgentStepPort",()=>{
  it("uses the stable Mission operation id for the durable Agent session and ignores free-form Plan command text",async()=>{
    const sessions=repository();
    const completed=completedSession("plan-visuals");
    const runner={runTurn:vi.fn(async(_input:AgentRunnerInput)=>completed)};
    const port=new ApplicationProductionAgentStepPort(runner,sessions as never,{providerId:"deterministic-b6",now:()=>NOW});

    const result=await port.execute(inputFor("plan-visuals"));

    expect(sessions.create).toHaveBeenCalledWith(expect.objectContaining({id:OPERATION_ID,projectId:PROJECT_ID,providerId:"deterministic-b6"}));
    expect(runner.runTurn).toHaveBeenCalledWith(expect.objectContaining({
      projectId:PROJECT_ID,
      sessionId:OPERATION_ID,
      userContent:expect.stringContaining("structured visual-plan proposal"),
      budget:expect.objectContaining({maxProviderRoundTrips:4}),
    }));
    const userContent=runner.runTurn.mock.calls[0]![0].userContent;
    expect(userContent).not.toContain("UNTRUSTED TITLE");
    expect(userContent).not.toContain("UNTRUSTED OBJECTIVE");
    expect(result).toEqual({
      status:"completed",
      evidence:[{kind:"agent-session",id:OPERATION_ID},{kind:"proposal",id:PROPOSAL_ID},{kind:"visual-plan",id:PROPOSAL_ID}],
      usage:{agentTurns:1,providerCalls:2,repairLoops:0},
    });
  });

  it("recovers a completed durable Agent turn without dispatching a second provider turn",async()=>{
    const sessions=repository(completedSession("plan-visuals"));
    const runner={runTurn:vi.fn()};
    const port=new ApplicationProductionAgentStepPort(runner as never,sessions as never,{providerId:"deterministic-b6"});

    const result=await port.execute(inputFor("plan-visuals"));

    expect(runner.runTurn).not.toHaveBeenCalled();
    expect(result).toMatchObject({status:"completed",evidence:expect.arrayContaining([{kind:"proposal",id:PROPOSAL_ID}])});
  });

  it("fails closed when a completed visual-planning turn did not persist exactly one visual proposal",async()=>{
    const session=completedSession("analyze-script");
    const sessions=repository(session);
    const runner={runTurn:vi.fn()};
    const port=new ApplicationProductionAgentStepPort(runner as never,sessions as never,{providerId:"deterministic-b6"});

    const result=await port.execute(inputFor("plan-visuals"));

    expect(result).toMatchObject({status:"blocked",code:"PRODUCTION_AGENT_VISUAL_PROPOSAL_INVALID"});
    expect(runner.runTurn).not.toHaveBeenCalled();
  });

  it("does not dispatch when the Production execution has no remaining provider budget",async()=>{
    const sessions=repository();
    const runner={runTurn:vi.fn()};
    const port=new ApplicationProductionAgentStepPort(runner as never,sessions as never,{providerId:"deterministic-b6"});
    const input=inputFor("analyze-script");
    input.remainingUsageBudget.providerCalls=0;

    const result=await port.execute(input);

    expect(result).toMatchObject({status:"blocked",code:"PRODUCTION_AGENT_BUDGET_EXHAUSTED"});
    expect(sessions.create).not.toHaveBeenCalled();
    expect(runner.runTurn).not.toHaveBeenCalled();
  });
});
