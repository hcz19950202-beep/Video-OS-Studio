import type {AgentTurnBudgetInput} from "@/lib/ai/budget";
import type {AgentRunner} from "@/lib/ai/runner";
import {AgentSessionSchema,type AgentSession,type AgentTurn} from "@/lib/ai/session/schema";
import {AgentSessionAlreadyExistsError,type AgentSessionRepository} from "@/lib/ai/session/repository";
import type {ProductionAgentStepPort} from "@/lib/production/execution/application-runner";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {StepExecutionResult} from "@/lib/production/execution/schema";

export type ApplicationProductionAgentStepPortOptions={
  providerId:string;
  model?:string;
  maxToolCalls?:number;
  maxWallClockMs?:number;
  now?:()=>string;
};

type ProductionAgentSessionRepository=Pick<AgentSessionRepository,"load"|"create">;
type ProductionAgentRunner=Pick<AgentRunner,"runTurn">;

const fixedInstruction=(input:ProductionStepRunnerInput)=>{
  switch(input.step.kind){
    case"analyze-script":
      return"Analyze the current bounded Project context. Persist the Agent turn and use only allow-listed tools. Do not mutate the Project.";
    case"plan-visuals":
      return"Create exactly one structured visual-plan proposal for the current bounded Project using the approved visual-planning tool. Persist the proposal and do not apply it.";
    case"prepare-assets":
      return"Inspect bounded asset requirements for the current Project using only approved asset-intelligence or asset-search tools. Persist the Agent turn and do not mutate the Project.";
    default:
      throw new Error("Production Agent port only accepts explicitly bounded Agent step kinds.");
  }
};

const usageForTurn=(turn:AgentTurn)=>({agentTurns:1,providerCalls:turn.providerRoundTrips,repairLoops:0});

const resultFromCompletedTurn=(input:ProductionStepRunnerInput,session:AgentSession,turn:AgentTurn):StepExecutionResult=>{
  if(input.step.kind!=="plan-visuals"){
    return{status:"completed",evidence:[{kind:"agent-session",id:session.id}],usage:usageForTurn(turn)};
  }
  const proposalIds=[...new Set(turn.proposalIds.filter(id=>{
    const proposal=session.proposals.find(item=>item.id===id);
    return proposal?.operations.some(operation=>operation.kind==="visual-plan")===true;
  }))];
  if(proposalIds.length!==1){
    return{
      status:"blocked",
      code:"PRODUCTION_AGENT_VISUAL_PROPOSAL_INVALID",
      message:"Visual-planning Agent step must persist exactly one visual-plan proposal.",
      usage:usageForTurn(turn),
    };
  }
  const proposalId=proposalIds[0]!;
  return{
    status:"completed",
    evidence:[
      {kind:"agent-session",id:session.id},
      {kind:"proposal",id:proposalId},
      {kind:"visual-plan",id:proposalId},
    ],
    usage:usageForTurn(turn),
  };
};

const resultFromTerminalTurn=(turn:AgentTurn):StepExecutionResult=>{
  const usage=usageForTurn(turn);
  if(turn.error?.retryable){
    return{
      status:"retryable-failure",
      code:"PRODUCTION_AGENT_STEP_RETRYABLE",
      message:"The bounded Agent step did not complete and may be retried from its durable session.",
      usage,
    };
  }
  return{
    status:"blocked",
    code:"PRODUCTION_AGENT_STEP_FAILED",
    message:"The bounded Agent step ended without durable completion evidence.",
    usage,
  };
};

export class ApplicationProductionAgentStepPort implements ProductionAgentStepPort{
  private readonly now:()=>string;
  private readonly maxToolCalls:number;
  private readonly maxWallClockMs:number;

  constructor(
    private readonly runner:ProductionAgentRunner,
    private readonly sessions:ProductionAgentSessionRepository,
    private readonly options:ApplicationProductionAgentStepPortOptions,
  ){
    this.now=options.now??(()=>new Date().toISOString());
    this.maxToolCalls=Math.max(0,Math.min(256,options.maxToolCalls??24));
    this.maxWallClockMs=Math.max(1,Math.min(10*60_000,options.maxWallClockMs??60_000));
  }

  private async ensureSession(input:ProductionStepRunnerInput):Promise<AgentSession>{
    const existing=await this.sessions.load(input.mission.projectId,input.operationId);
    if(existing)return existing;
    const now=this.now();
    const session=AgentSessionSchema.parse({
      id:input.operationId,
      projectId:input.mission.projectId,
      providerId:this.options.providerId,
      ...(this.options.model?{model:this.options.model}:{}),
      status:"active",
      createdAt:now,
      updatedAt:now,
      messages:[],
      turns:[],
      proposals:[],
      approvedOperations:[],
    });
    try{return await this.sessions.create(session);}
    catch(error){
      if(!(error instanceof AgentSessionAlreadyExistsError))throw error;
      const raced=await this.sessions.load(input.mission.projectId,input.operationId);
      if(!raced)throw error;
      return raced;
    }
  }

  private completedRecovery(input:ProductionStepRunnerInput,session:AgentSession):StepExecutionResult|null{
    const completed=[...session.turns].reverse().find(turn=>turn.status==="completed");
    return completed?resultFromCompletedTurn(input,session,completed):null;
  }

  async execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    if(input.remainingUsageBudget.agentTurns<1||input.remainingUsageBudget.providerCalls<1){
      return{
        status:"blocked",
        code:"PRODUCTION_AGENT_BUDGET_EXHAUSTED",
        message:"Production execution has no remaining bounded Agent or provider-call budget.",
      };
    }

    let session:AgentSession;
    try{session=await this.ensureSession(input);}
    catch{
      return{
        status:"retryable-failure",
        code:"PRODUCTION_AGENT_SESSION_UNAVAILABLE",
        message:"The durable Agent session could not be created or recovered.",
      };
    }
    if(session.providerId!==this.options.providerId||session.status!=="active"){
      return{
        status:"blocked",
        code:"PRODUCTION_AGENT_SESSION_CONFLICT",
        message:"The stable Production Agent session does not match the configured bounded provider state.",
      };
    }

    const recovered=this.completedRecovery(input,session);
    if(recovered)return recovered;

    const budget:AgentTurnBudgetInput={
      maxProviderRoundTrips:Math.max(1,Math.min(64,input.remainingUsageBudget.providerCalls)),
      maxToolCalls:this.maxToolCalls,
      maxWallClockMs:this.maxWallClockMs,
    };
    try{
      session=await this.runner.runTurn({
        projectId:input.mission.projectId,
        sessionId:input.operationId,
        userContent:fixedInstruction(input),
        budget,
      });
    }catch{
      return{
        status:"retryable-failure",
        code:"PRODUCTION_AGENT_RUNTIME_UNAVAILABLE",
        message:"The bounded Agent runtime could not resume its durable step session.",
      };
    }

    const turn=session.turns.at(-1);
    if(!turn){
      return{
        status:"blocked",
        code:"PRODUCTION_AGENT_EVIDENCE_MISSING",
        message:"The bounded Agent runtime returned without a durable turn record.",
      };
    }
    return turn.status==="completed"?resultFromCompletedTurn(input,session,turn):resultFromTerminalTurn(turn);
  }
}
