import {randomUUID} from "node:crypto";
import type {AIProvider} from "@/lib/ai/provider";
import type {AgentContextService,AgentSelectionSnapshot} from "@/lib/ai/context";
import type {ContextReference} from "@/lib/ai/context-reference";
import type {ContextReferenceService} from "@/lib/ai/context-reference-service";
import type {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {AgentRunner,reconcileStaleProposals} from "@/lib/ai/runner";
import type {AgentTurnBudgetInput} from "@/lib/ai/budget";
import {DEFAULT_AGENT_EXECUTION_MODE,type AgentExecutionMode} from "@/lib/ai/execution-mode";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema,AgentTurnSchema,type AgentSession} from "@/lib/ai/session/schema";
import type {VideoSkillRef} from "@/lib/production/skills/schema";

export type AgentServiceDependencies={
  provider:AIProvider;
  context:AgentContextService;
  contextReferences?:ContextReferenceService;
  tools:AgentToolRegistry;
  sessions:AgentSessionRepository;
  now?:()=>string;
  nowMs?:()=>number;
  makeId?:()=>string;
};

export type CreateAgentSessionInput={
  projectId:string;
  model?:string;
  selection?:Partial<AgentSelectionSnapshot>;
};

export type RunAgentTurnInput={
  projectId:string;
  sessionId:string;
  userContent:string;
  executionMode?:AgentExecutionMode;
  selection?:Partial<AgentSelectionSnapshot>;
  contextReferences?:ReadonlyArray<ContextReference>;
  skill?:VideoSkillRef;
  budget?:AgentTurnBudgetInput;
  signal?:AbortSignal;
};

export class AgentSessionService{
  private readonly runner:AgentRunner;
  private readonly now:()=>string;
  private readonly makeId:()=>string;

  constructor(private readonly dependencies:AgentServiceDependencies){
    this.now=dependencies.now??(()=>new Date().toISOString());
    this.makeId=dependencies.makeId??randomUUID;
    this.runner=new AgentRunner(dependencies);
  }

  async create(input:CreateAgentSessionInput):Promise<AgentSession>{
    const context=await this.dependencies.context.build(input.projectId,input.selection);
    const createdAt=this.now();
    const session=AgentSessionSchema.parse({
      id:this.makeId(),
      projectId:context.projectId,
      providerId:this.dependencies.provider.id,
      ...(input.model?{model:input.model}:{}),
      status:"active",
      createdAt,
      updatedAt:createdAt,
      messages:[],
      turns:[],
      proposals:[],
      approvedOperations:[],
      lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection,references:[]},
    });
    return this.dependencies.sessions.create(session);
  }

  async open(projectId:string,sessionId:string):Promise<AgentSession>{
    const snapshot=await this.dependencies.sessions.require(projectId,sessionId);
    const context=await this.dependencies.context.build(projectId,snapshot.lastContext?.selection);
    const now=this.now();
    return this.dependencies.sessions.mutate(projectId,sessionId,current=>{
      let changed=false;
      const turns=current.turns.map(turn=>{
        if(turn.status!=="running")return turn;
        changed=true;
        return{
          ...turn,
          status:"interrupted" as const,
          completedAt:now,
          error:{
            category:"recovery" as const,
            code:"incomplete_turn",
            message:"Agent turn was interrupted before completion and can be retried.",
            retryable:true,
          },
        };
      });
      let next=AgentSessionSchema.parse({...current,turns});
      const reconciled=reconcileStaleProposals(next,context.baseProjectRevision);
      if(reconciled!==next){next=AgentSessionSchema.parse(reconciled);changed=true;}
      const references=next.lastContext?.references??[];
      if(next.lastContext?.baseProjectRevision!==context.baseProjectRevision||JSON.stringify(next.lastContext?.selection)!==JSON.stringify(context.selection)){
        next=AgentSessionSchema.parse({...next,lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection,references}});
        changed=true;
      }
      return changed?AgentSessionSchema.parse({...next,updatedAt:now}):next;
    });
  }

  async runTurn(input:RunAgentTurnInput):Promise<AgentSession>{
    const{skill,...runnerInput}=input;
    const session=await this.runner.runTurn({...runnerInput,executionMode:runnerInput.executionMode??DEFAULT_AGENT_EXECUTION_MODE});
    if(!skill)return session;
    const turn=session.turns.at(-1);
    if(!turn)return session;
    return this.dependencies.sessions.mutate(input.projectId,input.sessionId,current=>AgentSessionSchema.parse({
      ...current,
      turns:current.turns.map(item=>item.id===turn.id?AgentTurnSchema.parse({...item,skill}):item),
      updatedAt:this.now(),
    }));
  }

  async list(projectId:string):Promise<AgentSession[]>{
    return this.dependencies.sessions.list(projectId);
  }

  async close(projectId:string,sessionId:string):Promise<AgentSession>{
    const session=await this.open(projectId,sessionId);
    if(session.status==="closed")return session;
    return this.dependencies.sessions.mutate(projectId,sessionId,current=>AgentSessionSchema.parse({...current,status:"closed",updatedAt:this.now()}));
  }

  async recordApprovedOperation(input:{projectId:string;sessionId:string;proposalId:string;operationId:string}):Promise<AgentSession>{
    return this.dependencies.sessions.mutate(input.projectId,input.sessionId,current=>{
      const existing=current.approvedOperations.find(item=>item.operationId===input.operationId);
      if(existing){
        if(existing.proposalId!==input.proposalId)throw new Error("Approved Agent operation ID is already bound to another proposal.");
        return current;
      }
      const proposal=current.proposals.find(item=>item.id===input.proposalId);
      if(!proposal)throw new Error("Approved Agent operation references an unknown proposal.");
      if(proposal.status!=="draft"&&proposal.status!=="reviewed")throw new Error("Only current reviewable Agent proposals can register approved operations.");
      const now=this.now();
      return AgentSessionSchema.parse({
        ...current,
        approvedOperations:[...current.approvedOperations,{operationId:input.operationId,proposalId:input.proposalId,approvedAt:now}],
        updatedAt:now,
      });
    });
  }
}
