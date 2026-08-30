import {createHash,randomUUID} from "node:crypto";
import {z} from "zod";
import {AgentProposalIdSchema,AgentProposalSchema,AgentSessionIdSchema,type AgentProposal,type AgentProposedOperation} from "@/lib/ai/schema";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import type {AgentSessionRepository} from "@/lib/ai/session/repository";
import {WorkflowActionProposalPayloadSchema,type WorkflowActionProposalPayload} from "@/lib/ai/tools/schema";
import {AgentWorkflowActionExecutor,AgentWorkflowActionStaleError,type AgentWorkflowActionPreview} from "@/lib/ai/workflow-application";
import {ProjectRevisionConflictError,type ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";
import {VisualPlanSchema,type VisualPlanDiff} from "@/lib/visual-planner/schema";
import type {VisualPlanService} from "@/lib/visual-planner/service";
import type {WorkflowRun} from "@/lib/workflows/schema";
import type {Project} from "@/schemas/project";
import {currentProcessIdentity,isProcessIdentityAlive} from "@/lib/process/process-identity";

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
  workflowAction?:AgentWorkflowActionPreview;
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
  workflow?:WorkflowRun;
  workflowAction?:WorkflowActionProposalPayload["action"];
};

export type AgentProposalApplicationDependencies={
  sessions:AgentSessionRepository;
  projects:Pick<ProjectRepository,"load">;
  mutations:Pick<ProjectMutationCoordinator,"getOperation">;
  visualPlans:Pick<VisualPlanService,"preview"|"apply">;
  workflowActions?:AgentWorkflowActionExecutor;
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
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export class AgentProposalApplicationService{
  private readonly now:()=>string;
  constructor(private readonly dependencies:AgentProposalApplicationDependencies){this.now=dependencies.now??(()=>new Date().toISOString());}

  private async saveStale(session:AgentSession,proposal:AgentProposal){
    const next=await this.dependencies.sessions.mutate(session.projectId,session.id,current=>{
      const latest=current.proposals.find(item=>item.id===proposal.id);
      const stale=latest&&(latest.status==="draft"||latest.status==="reviewed")?proposalWithStatus(latest,"stale"):latest??proposalWithStatus(proposal,"stale");
      return AgentSessionSchema.parse({...replaceProposal(current,stale),updatedAt:this.now()});
    });
    return{session:next,proposal:next.proposals.find(item=>item.id===proposal.id)??proposalWithStatus(proposal,"stale")};
  }

  private async claimApplyOperation(projectId:string,sessionId:string,proposalId:string,operationId:string){
    const claimToken=randomUUID();
    const session=await this.dependencies.sessions.mutate(projectId,sessionId,async current=>{
      const proposal=current.proposals.find(item=>item.id===proposalId);
      if(!proposal)throw new AgentProposalNotFoundError();
      if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be applied.");
      if(proposal.status==="applied")throw new AgentProposalApplicationError("Proposal is already applied but its durable Apply record could not be recovered.");
      if(current.approvedOperations.some(item=>item.operationId===operationId))return current;
      const existing=current.operationClaims.find(item=>item.operationId===operationId);
      if(existing&&await isProcessIdentityAlive({pid:existing.ownerPid,startedAt:existing.ownerStartedAt}))return current;
      const ownerIdentity=currentProcessIdentity();
      return AgentSessionSchema.parse({
        ...current,
        operationClaims:[...current.operationClaims.filter(item=>item.operationId!==operationId),{operationId,proposalId,claimToken,ownerPid:ownerIdentity.pid,ownerStartedAt:ownerIdentity.startedAt,claimedAt:this.now()}],
        updatedAt:this.now(),
      });
    });
    if(session.approvedOperations.some(item=>item.operationId===operationId))return{status:"applied" as const,session,claimToken};
    const claim=session.operationClaims.find(item=>item.operationId===operationId);
    return claim?.claimToken===claimToken?{status:"claimed" as const,session,claimToken}:{status:"in-flight" as const,session,claimToken};
  }

  private async waitForApplyOperation(projectId:string,sessionId:string,operationId:string){
    const deadline=Date.now()+30_000;
    for(;;){
      const session=await this.dependencies.sessions.require(projectId,sessionId);
      if(session.approvedOperations.some(item=>item.operationId===operationId))return{status:"applied" as const,session};
      const claim=session.operationClaims.find(item=>item.operationId===operationId);
      if(!claim)return{status:"retry" as const,session};
      if(!(await isProcessIdentityAlive({pid:claim.ownerPid,startedAt:claim.ownerStartedAt}))){
        await this.dependencies.sessions.mutate(projectId,sessionId,current=>AgentSessionSchema.parse({...current,operationClaims:current.operationClaims.filter(item=>item.claimToken!==claim.claimToken),updatedAt:this.now()}));
        continue;
      }
      if(Date.now()>=deadline)throw new AgentProposalApplicationError("Another Agent confirmation is still applying this operation; retry after it finishes.");
      await sleep(25);
    }
  }

  private async releaseApplyOperation(projectId:string,sessionId:string,operationId:string,claimToken:string){
    await this.dependencies.sessions.mutate(projectId,sessionId,current=>{
      const claim=current.operationClaims.find(item=>item.operationId===operationId);
      if(!claim||claim.claimToken!==claimToken)return current;
      return AgentSessionSchema.parse({...current,operationClaims:current.operationClaims.filter(item=>item.claimToken!==claimToken),updatedAt:this.now()});
    });
  }

  private async markApplied(projectId:string,sessionId:string,proposalId:string,operationId:string,claimToken?:string):Promise<AgentSession>{
    return this.dependencies.sessions.mutate(projectId,sessionId,current=>{
      const proposal=current.proposals.find(item=>item.id===proposalId);
      if(!proposal)throw new AgentProposalNotFoundError();
      if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be applied.");
      const existing=current.approvedOperations.find(item=>item.operationId===operationId);
      if(existing&&existing.proposalId!==proposalId)throw new AgentProposalApplicationError("Apply operation ID is already bound to another proposal.");
      const claim=current.operationClaims.find(item=>item.operationId===operationId);
      if(claimToken&&claim&&claimToken!==claim.claimToken&&!existing)throw new AgentProposalApplicationError("Agent Apply operation claim is owned by another confirmation.");
      if(claimToken&&!claim&&!existing)throw new AgentProposalApplicationError("Agent Apply operation claim was lost before durable completion.");
      return AgentSessionSchema.parse({
        ...replaceProposal(current,proposal.status==="applied"?proposal:proposalWithStatus(proposal,"applied")),
        approvedOperations:existing?current.approvedOperations:[...current.approvedOperations,{operationId,proposalId,approvedAt:this.now()}],
        operationClaims:current.operationClaims.filter(item=>item.operationId!==operationId),
        updatedAt:this.now(),
      });
    });
  }

  async preview(input:{projectId:string;sessionId:string;proposalId:string;operationIds?:string[];changeIds?:string[]}):Promise<{preview:AgentProposalPreview;session:AgentSession}>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    let session=await this.dependencies.sessions.require(input.projectId,sessionId);
    let proposal=session.proposals.find(item=>item.id===proposalId);
    if(!proposal)throw new AgentProposalNotFoundError();
    const project=await this.dependencies.projects.load(input.projectId);
    const selected=selectOperations(proposal,input.operationIds);

    if(proposal.baseProjectRevision!==project.project.revision||proposal.status==="stale"){
      if(proposal.status==="draft"||proposal.status==="reviewed")({session,proposal}=await this.saveStale(session,proposal));
      return{preview:{proposalId:proposal.id,baseProjectRevision:proposal.baseProjectRevision,currentProjectRevision:project.project.revision,status:"stale",selectedOperationIds:selected.map(item=>item.id),operations:[]},session};
    }

    if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be reviewed for Apply.");
    const operations:AgentProposalOperationPreview[]=[];
    for(const operation of selected){
      if(operation.kind==="visual-plan"){
        const payload=VisualPlanOperationPayloadSchema.parse(operation.payload);
        const selectedChangeIds=selectVisualChanges(payload.selectedIds,selected.length===1?input.changeIds:undefined);
        operations.push({operationId:operation.id,kind:operation.kind,summary:operation.summary,selectableChangeIds:payload.selectedIds,selectedChangeIds,visualPlanDiff:await this.dependencies.visualPlans.preview(input.projectId,payload.plan,selectedChangeIds)});
        continue;
      }
      if(operation.kind==="workflow-action"){
        if(input.changeIds?.length)throw new AgentProposalApplicationError("Workflow actions do not accept visual change selections.");
        if(!this.dependencies.workflowActions)throw new AgentProposalApplicationError("Workflow action application is not configured.");
        const payload=WorkflowActionProposalPayloadSchema.parse(operation.payload);
        try{
          operations.push({operationId:operation.id,kind:operation.kind,summary:operation.summary,selectableChangeIds:[],selectedChangeIds:[],workflowAction:await this.dependencies.workflowActions.preview(input.projectId,payload)});
        }catch(error){
          if(error instanceof AgentWorkflowActionStaleError){
            ({session,proposal}=await this.saveStale(session,proposal));
            return{preview:{proposalId:proposal.id,baseProjectRevision:proposal.baseProjectRevision,currentProjectRevision:project.project.revision,status:"stale",selectedOperationIds:selected.map(item=>item.id),operations:[]},session};
          }
          throw error;
        }
        continue;
      }
      throw new AgentProposalApplicationError(`Proposal operation kind ${operation.kind} is not applyable in A5 yet.`);
    }
    if(proposal.status==="draft"){
      session=await this.dependencies.sessions.mutate(input.projectId,sessionId,current=>{
        const latest=current.proposals.find(item=>item.id===proposalId);
        if(!latest||latest.status!=="draft")return current;
        return AgentSessionSchema.parse({...replaceProposal(current,proposalWithStatus(latest,"reviewed")),updatedAt:this.now()});
      });
      proposal=session.proposals.find(item=>item.id===proposalId)??proposalWithStatus(proposal,"reviewed");
    }
    return{preview:{proposalId:proposal.id,baseProjectRevision:proposal.baseProjectRevision,currentProjectRevision:project.project.revision,status:proposal.status,selectedOperationIds:selected.map(item=>item.id),operations},session};
  }

  async reject(input:{projectId:string;sessionId:string;proposalId:string}):Promise<AgentSession>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    const session=await this.dependencies.sessions.require(input.projectId,sessionId);
    const proposal=session.proposals.find(item=>item.id===proposalId);
    if(!proposal)throw new AgentProposalNotFoundError();
    if(proposal.status==="applied")throw new AgentProposalApplicationError("Applied proposals cannot be rejected.");
    if(proposal.status==="rejected")return session;
    return this.dependencies.sessions.mutate(input.projectId,sessionId,current=>{
      const latest=current.proposals.find(item=>item.id===proposalId);
      if(!latest)throw new AgentProposalNotFoundError();
      if(latest.status==="applied")throw new AgentProposalApplicationError("Applied proposals cannot be rejected.");
      if(latest.status==="rejected")return current;
      return AgentSessionSchema.parse({...replaceProposal(current,proposalWithStatus(latest,"rejected")),updatedAt:this.now()});
    });
  }

  async apply(input:{projectId:string;sessionId:string;proposalId:string;expectedRevision:number;operationIds?:string[];changeIds?:string[]}):Promise<AgentProposalApplyResult>{
    const sessionId=AgentSessionIdSchema.parse(input.sessionId);
    const proposalId=AgentProposalIdSchema.parse(input.proposalId);
    let session=await this.dependencies.sessions.require(input.projectId,sessionId);
    let proposal=session.proposals.find(item=>item.id===proposalId);
    if(!proposal)throw new AgentProposalNotFoundError();
    const selected=selectOperations(proposal,input.operationIds);
    if(selected.length!==1)throw new AgentProposalApplicationError("A5 applies one proposal operation per explicit confirmation.");
    const operation=selected[0];
    const visualPayload=operation.kind==="visual-plan"?VisualPlanOperationPayloadSchema.parse(operation.payload):undefined;
    const workflowPayload=operation.kind==="workflow-action"?WorkflowActionProposalPayloadSchema.parse(operation.payload):undefined;
    const workflowActions=this.dependencies.workflowActions;
    if(!visualPayload&&!workflowPayload)throw new AgentProposalApplicationError(`Proposal operation kind ${operation.kind} is not applyable in A5 yet.`);
    if(workflowPayload&&input.changeIds?.length)throw new AgentProposalApplicationError("Workflow actions do not accept visual change selections.");
    if(workflowPayload&&!workflowActions)throw new AgentProposalApplicationError("Workflow action application is not configured.");
    const selectedChangeIds=visualPayload?selectVisualChanges(visualPayload.selectedIds,input.changeIds):[];
    const applyOperationId=stableApplyOperationId(proposal.id,[operation.id],selectedChangeIds);
    const priorApproved=session.approvedOperations.find(item=>item.operationId===applyOperationId);
    if(priorApproved&&priorApproved.proposalId!==proposal.id)throw new AgentProposalApplicationError("Apply operation ID is already bound to another proposal.");

    if(workflowPayload&&priorApproved){
      const project=await this.dependencies.projects.load(input.projectId);
      session=await this.markApplied(input.projectId,sessionId,proposal.id,applyOperationId);
      return{project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:[],transactionId:null,alreadyApplied:true,workflowAction:workflowPayload.action};
    }

    if(visualPayload){
      const priorMutation=await this.dependencies.mutations.getOperation(input.projectId,applyOperationId);
      if(priorMutation?.status==="applied"){
        const project=await this.dependencies.projects.load(input.projectId);
        session=await this.markApplied(input.projectId,sessionId,proposal.id,applyOperationId);
        return{project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:selectedChangeIds,transactionId:applyOperationId,alreadyApplied:true};
      }
    }

    const current=await this.dependencies.projects.load(input.projectId);
    if(proposal.status==="stale"||proposal.baseProjectRevision!==current.project.revision||input.expectedRevision!==proposal.baseProjectRevision){
      if(proposal.status==="draft"||proposal.status==="reviewed")({session,proposal}=await this.saveStale(session,proposal));
      throw new AgentProposalStaleError(proposal.baseProjectRevision,current.project.revision);
    }
    if(proposal.status==="rejected")throw new AgentProposalApplicationError("Rejected proposals cannot be applied.");
    if(proposal.status==="applied")throw new AgentProposalApplicationError("Proposal is already applied but its durable Apply record could not be recovered.");

    let claimToken:string|undefined;
    let alreadyAppliedSession:AgentSession|undefined;
    for(;;){
      const claim=await this.claimApplyOperation(input.projectId,sessionId,proposal.id,applyOperationId);
      if(claim.status==="applied"){
        alreadyAppliedSession=claim.session;
        break;
      }
      if(claim.status==="in-flight"){
        const settled=await this.waitForApplyOperation(input.projectId,sessionId,applyOperationId);
        if(settled.status==="applied"){
          alreadyAppliedSession=settled.session;
          break;
        }
        continue;
      }
      claimToken=claim.claimToken;
      break;
    }

    if(alreadyAppliedSession){
      const project=await this.dependencies.projects.load(input.projectId);
      session=alreadyAppliedSession;
      if(workflowPayload)return{project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:[],transactionId:null,alreadyApplied:true,workflowAction:workflowPayload.action};
      return{project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:selectedChangeIds,transactionId:applyOperationId,alreadyApplied:true};
    }

    if(workflowPayload){
      let applied:Awaited<ReturnType<AgentWorkflowActionExecutor["apply"]>>;
      let externalCompleted=false;
      try{applied=await workflowActions!.apply(input.projectId,workflowPayload,input.expectedRevision,applyOperationId);}
      catch(error){
        if(!externalCompleted&&claimToken)await this.releaseApplyOperation(input.projectId,sessionId,applyOperationId,claimToken).catch(()=>undefined);
        if(error instanceof AgentWorkflowActionStaleError){({session,proposal}=await this.saveStale(session,proposal));}
        throw error;
      }
      externalCompleted=true;
      session=await this.markApplied(input.projectId,sessionId,proposal.id,applyOperationId,claimToken);
      return{project:current,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:[],transactionId:null,alreadyApplied:applied.alreadyApplied,workflow:applied.workflow,workflowAction:workflowPayload.action};
    }

    let applied:Awaited<ReturnType<VisualPlanService["apply"]>>;
    let externalCompleted=false;
    try{applied=await this.dependencies.visualPlans.apply(input.projectId,visualPayload!.plan,selectedChangeIds,{expectedRevision:input.expectedRevision,operationId:applyOperationId});externalCompleted=true;}
    catch(error){
      if(!externalCompleted&&claimToken)await this.releaseApplyOperation(input.projectId,sessionId,applyOperationId,claimToken).catch(()=>undefined);
      if(error instanceof ProjectRevisionConflictError){({session,proposal}=await this.saveStale(session,proposal));throw new AgentProposalStaleError(error.expectedRevision,error.currentRevision);}
      throw error;
    }

    session=await this.markApplied(input.projectId,sessionId,proposal.id,applyOperationId,claimToken);
    return{project:applied.project,session,proposalId:proposal.id,applyOperationId,appliedOperationIds:[operation.id],appliedChangeIds:selectedChangeIds,transactionId:applied.transactionId,alreadyApplied:Boolean(applied.alreadyApplied)};
  }
}
