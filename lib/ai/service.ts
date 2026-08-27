import {randomUUID} from "node:crypto";
import type {AIProvider} from "@/lib/ai/provider";
import type {AgentContextService,AgentSelectionSnapshot} from "@/lib/ai/context";
import type {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {AgentRunner,reconcileStaleProposals} from "@/lib/ai/runner";
import type {AgentTurnBudgetInput} from "@/lib/ai/budget";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";

export type AgentServiceDependencies={
  provider:AIProvider;
  context:AgentContextService;
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
  selection?:Partial<AgentSelectionSnapshot>;
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
      lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection},
    });
    return this.dependencies.sessions.create(session);
  }

  async open(projectId:string,sessionId:string):Promise<AgentSession>{
    return this.dependencies.sessions.withSessionLock(projectId,sessionId,async()=>{
      let session=await this.dependencies.sessions.require(projectId,sessionId);
      const now=this.now();
      let changed=false;
      const turns=session.turns.map(turn=>{
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
      if(changed)session=AgentSessionSchema.parse({...session,turns,updatedAt:now});

      const selection=session.lastContext?.selection;
      const context=await this.dependencies.context.build(projectId,selection);
      const reconciled=reconcileStaleProposals(session,context.baseProjectRevision);
      if(reconciled!==session){session=AgentSessionSchema.parse({...reconciled,updatedAt:now});changed=true;}
      if(session.lastContext?.baseProjectRevision!==context.baseProjectRevision){
        session=AgentSessionSchema.parse({...session,lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection},updatedAt:now});
        changed=true;
      }
      if(changed)await this.dependencies.sessions.save(session);
      return session;
    });
  }

  async runTurn(input:RunAgentTurnInput):Promise<AgentSession>{
    return this.runner.runTurn(input);
  }

  async list(projectId:string):Promise<AgentSession[]>{
    return this.dependencies.sessions.list(projectId);
  }

  async close(projectId:string,sessionId:string):Promise<AgentSession>{
    return this.dependencies.sessions.withSessionLock(projectId,sessionId,async()=>{
      const session=await this.openUnlocked(projectId,sessionId);
      if(session.status==="closed"){
        await this.dependencies.sessions.save(session);
        return session;
      }
      const closed=AgentSessionSchema.parse({...session,status:"closed",updatedAt:this.now()});
      await this.dependencies.sessions.save(closed);
      return closed;
    });
  }

  async recordApprovedOperation(input:{projectId:string;sessionId:string;proposalId:string;operationId:string}):Promise<AgentSession>{
    return this.dependencies.sessions.withSessionLock(input.projectId,input.sessionId,async()=>{
      const session=await this.openUnlocked(input.projectId,input.sessionId);
      const existing=session.approvedOperations.find(item=>item.operationId===input.operationId);
      if(existing){
        if(existing.proposalId!==input.proposalId)throw new Error("Approved Agent operation ID is already bound to another proposal.");
        await this.dependencies.sessions.save(session);
        return session;
      }
      const proposal=session.proposals.find(item=>item.id===input.proposalId);
      if(!proposal)throw new Error("Approved Agent operation references an unknown proposal.");
      if(proposal.status!=="draft"&&proposal.status!=="reviewed")throw new Error("Only current reviewable Agent proposals can register approved operations.");
      const now=this.now();
      const updated=AgentSessionSchema.parse({
        ...session,
        approvedOperations:[...session.approvedOperations,{operationId:input.operationId,proposalId:input.proposalId,approvedAt:now}],
        updatedAt:now,
      });
      await this.dependencies.sessions.save(updated);
      return updated;
    });
  }

  private async openUnlocked(projectId:string,sessionId:string):Promise<AgentSession>{
    let session=await this.dependencies.sessions.require(projectId,sessionId);
    const now=this.now();
    const context=await this.dependencies.context.build(projectId,session.lastContext?.selection);
    const turns=session.turns.map(turn=>turn.status==="running"?{
      ...turn,
      status:"interrupted" as const,
      completedAt:now,
      error:{category:"recovery" as const,code:"incomplete_turn",message:"Agent turn was interrupted before completion and can be retried.",retryable:true},
    }:turn);
    session=AgentSessionSchema.parse({...session,turns});
    session=reconcileStaleProposals(session,context.baseProjectRevision);
    return AgentSessionSchema.parse({...session,lastContext:{baseProjectRevision:context.baseProjectRevision,selection:context.selection}});
  }
}
