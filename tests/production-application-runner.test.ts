import {describe,expect,it,vi} from "vitest";
import type {AgentSessionRepository} from "@/lib/ai/session/repository";
import type {DurableJobRuntime} from "@/lib/jobs/runtime";
import {
  ApplicationProductionStepRunner,
  ProductionVisualPlanProposalResolver,
  ProductionVisualPlanTargetResolver,
  type ProductionAgentStepPort,
} from "@/lib/production/execution/application-runner";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {VisualPlanService} from "@/lib/visual-planner/service";
import type {WorkflowService} from "@/lib/workflows/service";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const PLAN_ID="22222222-2222-4222-8222-222222222222";
const EXECUTION_ID="33333333-3333-4333-8333-333333333333";
const OPERATION_ID="44444444-4444-4444-8444-444444444444";
const SESSION_ID="55555555-5555-4555-8555-555555555555";
const PROPOSAL_ID="66666666-6666-4666-8666-666666666666";
const GENERATED_AT="2026-08-29T00:00:00.000Z";

const visualPlan={
  version:2 as const,
  projectId:PROJECT_ID,
  generatedAt:GENERATED_AT,
  source:"rules" as const,
  suggestions:[{
    id:"suggestion-1",
    sceneId:"scene-1",
    startFrame:0,
    endFrame:30,
    spokenText:"Proof",
    semanticType:"proof" as const,
    recommendation:{engine:"remotion" as const,effectId:"stat-card",props:{}},
    reason:"Show evidence",
    confidence:.9,
    alternatives:[],
  }],
  densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
};

const agentSession={
  id:SESSION_ID,
  projectId:PROJECT_ID,
  providerId:"deterministic-b6",
  status:"active" as const,
  createdAt:GENERATED_AT,
  updatedAt:GENERATED_AT,
  messages:[],
  turns:[],
  proposals:[{
    id:PROPOSAL_ID,
    sessionId:SESSION_ID,
    projectId:PROJECT_ID,
    baseProjectRevision:1,
    title:"Visual plan proposal",
    summary:"Add one bounded visual",
    rationale:[],
    operations:[{id:"visual-op",kind:"visual-plan" as const,summary:"Apply visual",payload:{plan:visualPlan,selectedIds:["suggestion-1"]}}],
    warnings:[],
    createdAt:GENERATED_AT,
    status:"draft" as const,
  }],
  approvedOperations:[],
};

const inputFor=(kind:ProductionStepRunnerInput["step"]["kind"],overrides:Partial<ProductionStepRunnerInput["step"]>={}):ProductionStepRunnerInput=>({
  mission:{id:MISSION_ID,projectId:PROJECT_ID,autonomyPolicy:"assist"} as ProductionStepRunnerInput["mission"],
  plan:{id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,baseProjectRevision:1} as ProductionStepRunnerInput["plan"],
  step:{
    id:`step-${kind}`,
    kind,
    title:kind,
    objective:kind,
    dependsOn:[],
    risk:"low",
    owner:kind==="run-workflow"?"workflow":kind==="render-final"||kind==="render-preview"?"job":kind==="human-review"?"human-review":"agent",
    reviewRequired:false,
    requiresProjectRevision:kind!=="human-review",
    evidence:[],
    ...overrides,
  },
  execution:{id:EXECUTION_ID,projectId:PROJECT_ID,missionId:MISSION_ID,planId:PLAN_ID,expectedProjectRevision:1,steps:[]} as ProductionStepRunnerInput["execution"],
  operationId:OPERATION_ID,
  expectedProjectRevision:1,
  remainingUsageBudget:{agentTurns:4,providerCalls:4,repairLoops:2},
});

const sessionsWithProposal=(revision=1)=>({
  list:vi.fn(async()=>[{...agentSession,proposals:agentSession.proposals.map(proposal=>({...proposal,baseProjectRevision:revision}))}]),
}) as unknown as AgentSessionRepository;

const makeRunner=(options:{sessions?:AgentSessionRepository;visualApply?:ReturnType<typeof vi.fn>;workflow?:Partial<WorkflowService>;jobs?:Partial<DurableJobRuntime>}={})=>{
  const sessions=options.sessions??sessionsWithProposal();
  const proposals=new ProductionVisualPlanProposalResolver(sessions);
  const agent:ProductionAgentStepPort={execute:vi.fn(async()=>({status:"completed",evidence:[{kind:"agent-session",id:SESSION_ID}]}))};
  const visualApply=options.visualApply??vi.fn(async()=>({project:{project:{revision:2}}}));
  const workflow=options.workflow??{
    create:vi.fn(),
    start:vi.fn(),
    get:vi.fn(),
    runner:{waitForIdle:vi.fn()},
    projects:{load:vi.fn()},
  };
  const jobs=options.jobs??{create:vi.fn(),get:vi.fn()};
  const runner=new ApplicationProductionStepRunner(
    agent,
    proposals,
    {apply:visualApply} as unknown as Pick<VisualPlanService,"apply">,
    workflow as WorkflowService,
    jobs as DurableJobRuntime,
    {resolve:vi.fn(async()=>"http://127.0.0.1:3000")},
    {pollIntervalMs:1,waitTimeoutMs:1_000},
  );
  return{runner,proposals,agent,visualApply,workflow,jobs};
};

describe("ApplicationProductionStepRunner",()=>{
  it("resolves one persisted visual proposal and applies it with the stable step operation id",async()=>{
    const{runner,visualApply}=makeRunner();
    const input=inputFor("edit-project",{evidence:[{kind:"visual-plan",id:PROPOSAL_ID}],targets:[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"visual-suggestion-1",action:"create"}]});

    const result=await runner.execute(input);

    expect(result).toMatchObject({status:"completed",projectRevisionAfter:2});
    expect(visualApply).toHaveBeenCalledWith(PROJECT_ID,visualPlan,["suggestion-1"],{expectedRevision:1,operationId:OPERATION_ID});
    expect(result.status==="completed"?result.evidence:[]).toEqual(expect.arrayContaining([
      {kind:"agent-session",id:SESSION_ID},
      {kind:"proposal",id:PROPOSAL_ID},
      {kind:"apply-operation",id:OPERATION_ID},
    ]));
  });

  it("fails closed when visual proposal evidence is stale",async()=>{
    const{runner,visualApply}=makeRunner({sessions:sessionsWithProposal(0)});
    const result=await runner.execute(inputFor("edit-project",{evidence:[{kind:"visual-plan",id:PROPOSAL_ID}]}));

    expect(result).toMatchObject({status:"blocked",code:"VISUAL_PLAN_EVIDENCE_INVALID"});
    expect(visualApply).not.toHaveBeenCalled();
  });

  it("derives actual remotion mutation targets from proposal contents instead of trusting declared targets",async()=>{
    const resolver=new ProductionVisualPlanTargetResolver(new ProductionVisualPlanProposalResolver(sessionsWithProposal()));
    const targets=await resolver.resolve(inputFor("edit-project",{evidence:[{kind:"visual-plan",id:PROPOSAL_ID}]}));

    expect(targets).toEqual([
      {kind:"track",id:"motion-main",action:"append"},
      {kind:"clip",id:"visual-suggestion-1",action:"create"},
    ]);
  });

  it("uses the stable step operation id as Workflow id and returns durable Workflow/Job evidence",async()=>{
    const workflow={
      create:vi.fn(async()=>({id:OPERATION_ID,status:"pending",stageExecutions:[]})),
      start:vi.fn(async()=>({id:OPERATION_ID,status:"running"})),
      get:vi.fn(async()=>({id:OPERATION_ID,status:"completed",stageExecutions:[{jobIds:["77777777-7777-4777-8777-777777777777"]}]})),
      runner:{waitForIdle:vi.fn(async()=>undefined)},
      projects:{load:vi.fn(async()=>({project:{revision:3}}))},
    };
    const{runner}=makeRunner({workflow:workflow as unknown as Partial<WorkflowService>});
    const result=await runner.execute(inputFor("run-workflow",{evidence:[{kind:"workflow",id:"w2-capability-talking-head@1"},{kind:"asset",id:"media-1"}]}));

    expect(workflow.create).toHaveBeenCalledWith(expect.objectContaining({workflowId:OPERATION_ID,projectId:PROJECT_ID,definitionId:"w2-capability-talking-head",definitionVersion:"1",sourceAssetIds:["media-1"],expectedProjectRevision:1}));
    expect(workflow.start).toHaveBeenCalledWith(OPERATION_ID);
    expect(result).toMatchObject({status:"completed",projectRevisionAfter:3});
    expect(result.status==="completed"?result.evidence:[]).toEqual([{kind:"workflow",id:OPERATION_ID},{kind:"job",id:"77777777-7777-4777-8777-777777777777"}]);
  });

  it("never auto-approves a Workflow-owned checkpoint",async()=>{
    const workflow={
      create:vi.fn(async()=>({id:OPERATION_ID,status:"waiting_review",stageExecutions:[]})),
      start:vi.fn(),
      get:vi.fn(async()=>({id:OPERATION_ID,status:"waiting_review",stageExecutions:[]})),
      runner:{waitForIdle:vi.fn(async()=>undefined)},
      projects:{load:vi.fn()},
    };
    const{runner}=makeRunner({workflow:workflow as unknown as Partial<WorkflowService>});
    const result=await runner.execute(inputFor("run-workflow",{evidence:[{kind:"workflow",id:"video-production-talking-head@1"}]}));

    expect(result).toMatchObject({status:"blocked",code:"WORKFLOW_REVIEW_REQUIRED"});
    expect(workflow.start).not.toHaveBeenCalled();
  });

  it("uses the stable step operation id as render Job id and verifies encoded source revision",async()=>{
    const jobs={
      create:vi.fn(async()=>({id:OPERATION_ID,status:"queued"})),
      get:vi.fn(async()=>({id:OPERATION_ID,status:"completed",output:{sourceProjectRevision:1}})),
    };
    const{runner}=makeRunner({jobs:jobs as unknown as Partial<DurableJobRuntime>});
    const result=await runner.execute(inputFor("render-final"));

    expect(jobs.create).toHaveBeenCalledWith({jobId:OPERATION_ID,type:"render-final",projectId:PROJECT_ID,input:{assetBaseUrl:"http://127.0.0.1:3000"}});
    expect(result).toMatchObject({status:"completed",projectRevisionAfter:1});
    expect(result.status==="completed"?result.evidence:[]).toEqual([{kind:"job",id:OPERATION_ID},{kind:"render",id:OPERATION_ID}]);
  });

  it("blocks completed render evidence from a different Project revision",async()=>{
    const jobs={
      create:vi.fn(async()=>({id:OPERATION_ID,status:"completed"})),
      get:vi.fn(async()=>({id:OPERATION_ID,status:"completed",output:{sourceProjectRevision:2}})),
    };
    const{runner}=makeRunner({jobs:jobs as unknown as Partial<DurableJobRuntime>});
    const result=await runner.execute(inputFor("render-final"));

    expect(result).toMatchObject({status:"blocked",code:"RENDER_SOURCE_REVISION_MISMATCH"});
  });

  it("delegates bounded Agent steps without exposing generic execution authority",async()=>{
    const{runner,agent}=makeRunner();
    const input=inputFor("plan-visuals");
    const result=await runner.execute(input);

    expect(agent.execute).toHaveBeenCalledWith(input);
    expect(result).toMatchObject({status:"completed"});
  });
});
