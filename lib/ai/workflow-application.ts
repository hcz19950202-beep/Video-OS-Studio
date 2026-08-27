import {createHash} from "node:crypto";
import {WorkflowActionProposalPayloadSchema,type WorkflowActionProposalPayload} from "@/lib/ai/tools/schema";
import {WorkflowRuntimeStateError} from "@/lib/workflows/runner";
import type {WorkflowService} from "@/lib/workflows/service";
import type {WorkflowRun} from "@/lib/workflows/schema";

export class AgentWorkflowActionStaleError extends Error{
  readonly code="AGENT_WORKFLOW_ACTION_STALE";
  constructor(readonly workflowId:string,readonly expectedUpdatedAt:string,readonly currentUpdatedAt:string){
    super("The Workflow changed after this Agent proposal was generated.");
    this.name="AgentWorkflowActionStaleError";
  }
}

export class AgentWorkflowActionError extends Error{
  readonly code="AGENT_WORKFLOW_ACTION_ERROR";
  constructor(message:string){super(message);this.name="AgentWorkflowActionError";}
}

export type AgentWorkflowActionRuntime=Pick<WorkflowService,"get"|"create"|"start"|"resume"|"retryStage"|"approveCheckpoint">;
export type AgentWorkflowActionPreview={
  action:WorkflowActionProposalPayload["action"];
  workflowId?:string;
  scenario?:string;
  stageId?:string;
  checkpointId?:string;
  sourceAssetIds?:string[];
  currentStatus?:WorkflowRun["status"];
};
export type AgentWorkflowActionApplyResult={workflow:WorkflowRun;alreadyApplied:boolean};

const stableWorkflowId=(operationId:string)=>{
  const chars=createHash("sha256").update(`agent-workflow:${operationId}`).digest("hex").slice(0,32).split("");
  chars[12]="5";
  chars[16]=(((Number.parseInt(chars[16]??"0",16)&0x3)|0x8).toString(16));
  const hex=chars.join("");
  return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

export class AgentWorkflowActionExecutor{
  constructor(private readonly workflows:AgentWorkflowActionRuntime){}

  private async requireWorkflow(projectId:string,workflowId:string){
    const workflow=await this.workflows.get(workflowId);
    if(!workflow||workflow.projectId!==projectId)throw new AgentWorkflowActionError("Workflow action target was not found for the current Project.");
    return workflow;
  }

  private async requireExpectedWorkflow(projectId:string,payload:Exclude<WorkflowActionProposalPayload,{action:"create_first_draft"}>){
    const workflow=await this.requireWorkflow(projectId,payload.workflowId);
    if(workflow.updatedAt!==payload.expectedWorkflowUpdatedAt||workflow.status!==payload.expectedWorkflowStatus)throw new AgentWorkflowActionStaleError(workflow.id,payload.expectedWorkflowUpdatedAt,workflow.updatedAt);
    if(payload.action==="retry"){
      const stage=workflow.stageExecutions.find(item=>item.stageId===payload.stageId);
      if(!stage||(stage.status!=="failed"&&stage.status!=="interrupted"))throw new AgentWorkflowActionStaleError(workflow.id,payload.expectedWorkflowUpdatedAt,workflow.updatedAt);
    }
    if(payload.action==="final_render"){
      const checkpoint=workflow.checkpoints.find(item=>item.id===payload.checkpointId);
      if(!checkpoint||checkpoint.status!=="waiting_review"||checkpoint.stageId!=="ASSEMBLY_REVIEW")throw new AgentWorkflowActionStaleError(workflow.id,payload.expectedWorkflowUpdatedAt,workflow.updatedAt);
    }
    return workflow;
  }

  async preview(projectId:string,payloadInput:WorkflowActionProposalPayload):Promise<AgentWorkflowActionPreview>{
    const payload=WorkflowActionProposalPayloadSchema.parse(payloadInput);
    if(payload.action==="create_first_draft")return{action:payload.action,scenario:payload.scenario,sourceAssetIds:[...payload.sourceAssetIds]};
    const workflow=await this.requireExpectedWorkflow(projectId,payload);
    return{
      action:payload.action,
      workflowId:workflow.id,
      currentStatus:workflow.status,
      ...(payload.action==="retry"?{stageId:payload.stageId}:{}),
      ...(payload.action==="final_render"?{checkpointId:payload.checkpointId}:{}),
    };
  }

  async apply(projectId:string,payloadInput:WorkflowActionProposalPayload,expectedProjectRevision:number,operationId:string):Promise<AgentWorkflowActionApplyResult>{
    const payload=WorkflowActionProposalPayloadSchema.parse(payloadInput);
    if(payload.action==="create_first_draft"){
      const workflowId=stableWorkflowId(operationId);
      const created=await this.workflows.create({
        workflowId,
        projectId,
        definitionId:`video-production-${payload.scenario}`,
        definitionVersion:"2",
        sourceAssetIds:payload.sourceAssetIds,
        expectedProjectRevision,
      });
      if(created.status!=="pending")return{workflow:created,alreadyApplied:true};
      try{return{workflow:await this.workflows.start(created.id),alreadyApplied:false};}
      catch(error){
        if(error instanceof WorkflowRuntimeStateError){
          const current=await this.requireWorkflow(projectId,created.id);
          if(current.status!=="pending")return{workflow:current,alreadyApplied:true};
        }
        throw error;
      }
    }

    await this.requireExpectedWorkflow(projectId,payload);
    try{
      if(payload.action==="resume")return{workflow:await this.workflows.resume(payload.workflowId),alreadyApplied:false};
      if(payload.action==="retry")return{workflow:await this.workflows.retryStage(payload.workflowId,payload.stageId),alreadyApplied:false};
      return{workflow:await this.workflows.approveCheckpoint(payload.workflowId,payload.checkpointId),alreadyApplied:false};
    }catch(error){
      if(error instanceof WorkflowRuntimeStateError){
        const current=await this.requireWorkflow(projectId,payload.workflowId);
        throw new AgentWorkflowActionStaleError(current.id,payload.expectedWorkflowUpdatedAt,current.updatedAt);
      }
      throw error;
    }
  }
}

export const workflowIdForAgentApply=stableWorkflowId;
