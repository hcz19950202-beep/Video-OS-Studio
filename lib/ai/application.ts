import {createHash} from "node:crypto";
import {z} from "zod";
import {AgentProposalIdSchema,AgentProposalSchema,AgentSessionIdSchema,type AgentProposal,type AgentProposedOperation} from "@/lib/ai/schema";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import type {AgentSessionRepository} from "@/lib/ai/session/repository";
import {ProjectRevisionConflictError,type ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";
import {VisualPlanSchema,type VisualPlanDiff} from "@/lib/visual-planner/schema";
import type {VisualPlanService} from "@/lib/visual-planner/service";
import type {Project} from "@/schemas/project";

const VisualPlanOperationPayloadSchema=z.object({
  plan:VisualPlanSchema,
  selectedIds:z.array(z.string().min(1)).min(1).max(128),
}).strict();

export class AgentProposalNotFoundError extends Error{
  readonly code="AGENT_PROPOSAL_NOT_FOUND";
  constructor(){super("Agent proposal was not found.");this.name="AgentProposalNotFoundError";}
}

export class AgentProposalStaleError extends Error{
  readonly code="AGENT_PROPOSAL_STALE";
  constructor(readonly expectedRevision:number,readonly currentRevision:number){
    super("Agent proposal is stale because the Project revision changed.");
    this.name="AgentProposalStaleError";
  }
}

export class AgentProposalApplicationError extends Error{
  readonly code="AGENT_PROPOSAL_APPLICATION_ERROR";
  constructor(message:string){super(message);this.name="AgentProposalApplicationError";}
}

export type AgentProposalOperationPreview={
  operationId:string;
  kind:AgentProposedOperation["kind"];
  summary:string;
  selectableChangeIds:string[];
  selectedChangeIds:string[];
  visualPlanDiff?:VisualPlanDiff;
};

export type AgentProposalPreview={
  proposalId:string;
  baseProjectRevision:number;
  currentProjectRevision:number;
  status:AgentProposal["status"];
  selectedOperationIds:string[];
  operations:AgentProposalOperationPreview[];
};

export type AgentProposalApplyResult={
  project:Project;
  session:AgentSession;
  proposalId:string;
  applyOperationId:string;
  appliedOperationIds:string[];
  appliedChangeIds:string[];
  transactionId:string|null;
  alreadyApplied:boolean;
};

export type AgentProposalApplicationDependencies={
  sessions:AgentSessionRepository;
  projects:Pick<ProjectRepository,"load">;
  mutations:Pick<ProjectMutationCoordinator,"getOperation">;
  visualPlans:Pick<VisualPlanService,"preview"|"apply">;
  now?:()=>string;
};

const replaceProposal=(session:AgentSession,proposal:AgentProposal)=>AgentSessionSchema.parse({
  ...session,
  proposals:session.proposals.map(item=>item.id===proposal.id?proposal:item),
});

const proposalWithStatus=(proposal:AgentProposal,status:AgentProposal["status"])=>AgentProposalSchema.parse({...proposal,status});

const selectOperations=(proposal:AgentProposal,requestedIds?:string[])=>{
  const requested=requestedIds?.length?requestedIds:proposal.operations.map(item=>item.id);
  const unique=[...new Set(requested)];
  if(unique.length===0)throw new AgentProposalApplicationError("Select at least one proposal operation.");
  const byId=new Map(proposal.operations.map(item=>[item.id,item]));
  const selected=unique.map(id=>byId.get(id));
  if(selected.some(item=>!item))throw new AgentProposalApplicationError("Selected proposal operation was not found.");
  return selected as AgentProposedOperation[];
};

const selectVisualChanges=(allowedIds:string[],requestedIds?:string[])=>{
  const requested=requestedIds?.length?requestedIds:allowedIds;
  const unique=[...new Set(requested)];
  if(unique.length===0)throw new AgentProposalApplicationError("Select at least one visual change.");
  const allowed=new Set(allowedIds);
  if(unique.some(id=>!allowed.has(id)))throw new AgentProposalApplicationError("Selected visual change was not part of the proposal.");
  return unique;
};

const stableApplyOperationId=(proposalId:string,operationIds:string[],changeIds:string[])=>{
  const fingerprint={operationIds:[...operationIds].sort(),changeIds:[...changeIds].sort()};
  const digest=createHash("sha256").update(JSON.stringify(fingerprint)).digest("hex").slice(0,16);
  return`agent-apply:${proposalId}:${digest}`;
};

export class AgentProposalApplicationService{
  private readonly now:()=>string;
  constructor(private readonly dependencies:AgentProposalApplicationDependencies){this.now=dependencies.now??(()=>new Date().toISOString());}

  async preview(input:{projectId:string;sessionId:string;proposalId:string;operationIds?:string[];changeIds?:string[]}):Promise<{preview:AgentProposalPreview;session:AgentSession}>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    return this.dependencies.sessions.withSessionLock(input.projectId,sessionId,async()=>{
      let session=await this.dependencies.sessions.require(input.projectId,sessionId);
      let proposal=session.proposals.find(item=>item.id===proposalId);
      if(!proposal)throw new AgentProposalNotFoundError();
      const project=await this.dependencies.projects.load(input.projectId);
      const selected=selectOperations(proposal,input.operationIds);

      if(proposal.baseProjectRevision!==project.project.revision||proposal.status==="stale"){
        if(proposal.status==="draft"||proposal.status==="reviewed"){
          proposal=proposalWithStatus(proposal,"stale");
          session=AgentSessionSchema.parse({...replaceProposal(session,proposal),updatedAt:this.now()});
          await this.dependencies.sessions.save(session);
        }
        return{preview:{proposalId:proposal.id,baseProjectRevision:proposal.baseProjectRevision,currentProjectRevision:project.project.revision,status:"stale",selectedOperationIds:selected.map(item=>item.id),operations:[]},session};
      }

      if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be reviewed for Apply.");
      const operations:AgentProposalOperationPreview[]=[];
      for(const operation of selected){
        if(operation.kind!=="visual-plan")throw new AgentProposalApplicationError(`Proposal operation kind ${operation.kind} is not applyable in A4 yet.`);
        const payload=VisualPlanOperationPayloadSchema.parse(operation.payload);
        const selectedChangeIds=selectVisualChanges(payload.selectedIds,selected.length===1?input.changeIds:undefined);
        operations.push({
          operationId:operation.id,
          kind:operation.kind,
          summary:operation.summary,
          selectableChangeIds:payload.selectedIds,
          selectedChangeIds,
          visualPlanDiff:await this.dependencies.visualPlans.preview(input.projectId,payload.plan,selectedChangeIds),
        });
      }
      if(proposal.status==="draft"){
        proposal=proposalWithStatus(proposal,"reviewed");
        session=AgentSessionSchema.parse({...replaceProposal(session,proposal),updatedAt:this.now()});
        await this.dependencies.sessions.save(session);
      }
      return{preview:{proposalId:proposal.id,baseProjectRevision:proposal.baseProjectRevision,currentProjectRevision:project.project.revision,status:proposal.status,selectedOperationIds:selected.map(item=>item.id),operations},session};
    });
  }

  async reject(input:{projectId:string;sessionId:string;proposalId:string}):Promise<AgentSession>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    return this.dependencies.sessions.withSessionLock(input.projectId,sessionId,async()=>{
      let session=await this.dependencies.sessions.require(input.projectId,sessionId);
      const proposal=session.proposals.find(item=>item.id===proposalId);
      if(!proposal)throw new AgentProposalNotFoundError();
      if(proposal.status==="applied")throw new AgentProposalApplicationError("Applied proposals cannot be rejected.");
      if(proposal.status==="rejected")return session;
      const rejected=proposalWithStatus(proposal,"rejected");
      session=AgentSessionSchema.parse({...replaceProposal(session,rejected),updatedAt:this.now()});
      await this.dependencies.sessions.save(session);
      return session;
    });
  }

  async apply(input:{projectId:string;sessionId:string;proposalId:string;expectedRevision:number;operationIds?:string[];changeIds?:string[]}):Promise<AgentProposalApplyResult>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    return this.dependencies.sessions.withSessionLock(input.projectId,sessionId,async()=>{
      let session=await this.dependencies.sessions.require(input.projectId,sessionId);
      let proposal=session.proposals.find(item=>item.id===proposalId);
      if(!proposal)throw new AgentProposalNotFoundError();
      const selected=selectOperations(proposal,input.operationIds);
      if(selected.length!==1||selected[0].kind!=="visual-plan")throw new AgentProposalApplicationError("A4 currently applies one visual-plan proposal operation per logical transaction.");
      const payload=VisualPlanOperationPayloadSchema.parse(selected[0].payload);
      const selectedChangeIds=selectVisualChanges(payload.selectedIds,input.changeIds);
      const applyOperationId=stableApplyOperationId(proposal.id,selected.map(item=>item.id),selectedChangeIds);
      const priorApproved=session.approvedOperations.find(item=>item.operationId===applyOperationId);
      if(priorApproved&&priorApproved.proposalId!==proposal.id)throw new AgentProposalApplicationError("Apply operation ID is already bound to another proposal.");

      const priorMutation=await this.dependencies.mutations.getOperation(input.projectId,applyOperationId);
      if(priorMutation?.status==="applied"){
        const project=await this.dependencies.projects.load(input.projectId);
        proposal=proposalWithStatus(proposal,"applied");
        session=AgentSessionSchema.parse({
          ...replaceProposal(session,proposal),
          approvedOperations:priorApproved?session.approvedOperations:[...session.approvedOperations,{operationId:applyOperationId,proposalId:proposal.id,approvedAt:this.now()}],
          updatedAt:this.now(),
        });
        await this.dependencies.sessions.save(session);
        return{project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:selected.map(item=>item.id),appliedChangeIds:selectedChangeIds,transactionId:applyOperationId,alreadyApplied:true};
      }

      const current=await this.dependencies.projects.load(input.projectId);
      if(proposal.status==="stale"||proposal.baseProjectRevision!==current.project.revision||input.expectedRevision!==proposal.baseProjectRevision){
        if(proposal.status==="draft"||proposal.status==="reviewed"){
          proposal=proposalWithStatus(proposal,"stale");
          session=AgentSessionSchema.parse({...replaceProposal(session,proposal),updatedAt:this.now()});
          await this.dependencies.sessions.save(session);
        }
        throw new AgentProposalStaleError(proposal.baseProjectRevision,current.project.revision);
      }
      if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be applied.");
      if(proposal.status==="applied")throw new AgentProposalApplicationError("Proposal is already applied but its mutation record could not be recovered.");

      let applied:Awaited<ReturnType<VisualPlanService["apply"]>>;
      try{
        applied=await this.dependencies.visualPlans.apply(input.projectId,payload.plan,selectedChangeIds,{expectedRevision:input.expectedRevision,operationId:applyOperationId});
      }catch(error){
        if(error instanceof ProjectRevisionConflictError){
          proposal=proposalWithStatus(proposal,"stale");
          session=AgentSessionSchema.parse({...replaceProposal(session,proposal),updatedAt:this.now()});
          await this.dependencies.sessions.save(session);
          throw new AgentProposalStaleError(error.expectedRevision,error.currentRevision);
        }
        throw error;
      }

      proposal=proposalWithStatus(proposal,"applied");
      session=AgentSessionSchema.parse({
        ...replaceProposal(session,proposal),
        approvedOperations:priorApproved?session.approvedOperations:[...session.approvedOperations,{operationId:applyOperationId,proposalId:proposal.id,approvedAt:this.now()}],
        updatedAt:this.now(),
      });
      await this.dependencies.sessions.save(session);
      return{project:applied.project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:selected.map(item=>item.id),appliedChangeIds:selectedChangeIds,transactionId:applied.transactionId,alreadyApplied:Boolean(applied.alreadyApplied)};
    });
  }
}
