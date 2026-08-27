import {randomUUID} from "node:crypto";
import {AgentProposalSchema,AgentToolDefinitionSchema} from "@/lib/ai/schema";
import {AgentToolSafeError} from "@/lib/ai/tools/registry";
import {GetWorkflowStatusInputSchema,RequestWorkflowActionInputSchema,WorkflowActionProposalPayloadSchema,WorkflowActionProposalToolOutputSchema,WorkflowStatusToolOutputSchema,type RegisteredAgentTool,type WorkflowActionProposalPayload} from "@/lib/ai/tools/schema";
import type {WorkflowService} from "@/lib/workflows/service";
import type {WorkflowRun} from "@/lib/workflows/schema";

export const GET_WORKFLOW_STATUS_TOOL_ID="get_workflow_status" as const;
export const REQUEST_WORKFLOW_ACTION_TOOL_ID="request_workflow_action" as const;
export type AgentWorkflowReader=Pick<WorkflowService,"get"|"list">;

const safeWorkflowMessage=(message:string)=>message
  .replace(/(?:api[_-]?key|token|secret|authorization)\s*[:=]\s*\S+/gi,"credential=[redacted]")
  .replace(/[A-Za-z]:\\[^\r\n]*/g,"[redacted-path]")
  .replace(/\/(?:Users|home|mnt|tmp|var)\/[^\r\n]*/g,"[redacted-path]")
  .slice(0,1_000);

const summarizeWorkflow=(workflow:WorkflowRun)=>({
  id:workflow.id,
  scenario:workflow.scenario,
  status:workflow.status,
  ...(workflow.currentStageId?{currentStageId:workflow.currentStageId}:{}),
  updatedAt:workflow.updatedAt,
  lastKnownProjectRevision:workflow.lastKnownProjectRevision,
  stages:workflow.stageExecutions.slice(0,32).map(stage=>({
    stageId:stage.stageId,
    status:stage.status,
    attempt:stage.attempt,
    ...(stage.error?{error:{code:stage.error.code,message:safeWorkflowMessage(stage.error.message),retryable:stage.error.retryable}}:{}),
  })),
  checkpoints:workflow.checkpoints.slice(0,16).map(checkpoint=>({id:checkpoint.id,stageId:checkpoint.stageId,status:checkpoint.status,baseProjectRevision:checkpoint.baseProjectRevision})),
  artifacts:workflow.artifacts.slice(0,32).map(artifact=>({id:artifact.id,stageId:artifact.stageId,kind:artifact.kind,...(artifact.projectRevision===undefined?{}:{projectRevision:artifact.projectRevision}),...(artifact.logicalAssetId?{logicalAssetId:artifact.logicalAssetId}:{})})),
});

const requireProjectWorkflow=async(workflows:AgentWorkflowReader,workflowId:string,projectId:string)=>{
  const workflow=await workflows.get(workflowId);
  if(!workflow||workflow.projectId!==projectId)throw new AgentToolSafeError("workflow_not_found","The requested Workflow is not available for the current Project.");
  return workflow;
};

const actionSummary=(payload:WorkflowActionProposalPayload)=>{
  if(payload.action==="create_first_draft")return`Create and start a ${payload.scenario} first-draft Workflow using ${payload.sourceAssetIds.length} source asset${payload.sourceAssetIds.length===1?"":"s"}.`;
  if(payload.action==="resume")return`Resume paused Workflow ${payload.workflowId}.`;
  if(payload.action==="retry")return`Retry failed/interrupted Stage ${payload.stageId} in Workflow ${payload.workflowId}.`;
  return`Approve the assembly review for Workflow ${payload.workflowId} so the accepted Workflow Runtime may continue to FINAL_RENDER.`;
};

const buildWorkflowProposal=(payload:WorkflowActionProposalPayload,context:Parameters<RegisteredAgentTool["handler"]>[1])=>{
  const proposalId=context.makeId?.()??randomUUID();
  const createdAt=context.now?.()??new Date().toISOString();
  const summary=actionSummary(payload);
  return AgentProposalSchema.parse({
    id:proposalId,
    sessionId:context.sessionId,
    projectId:context.context.projectId,
    baseProjectRevision:context.context.baseProjectRevision,
    title:"Workflow action proposal",
    summary,
    rationale:["This proposal only records a bounded Workflow request. No Workflow or Project state changes until the user reviews and explicitly applies it."],
    operations:[{id:`workflow-action-${proposalId}`,kind:"workflow-action",summary,payload}],
    warnings:payload.action==="final_render"?["Applying this request may start the accepted FINAL_RENDER stage after the existing assembly review checkpoint is approved."]:[],
    createdAt,
    status:"draft",
  });
};

export function createWorkflowStatusReadTool(workflows:AgentWorkflowReader):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:GET_WORKFLOW_STATUS_TOOL_ID,
      description:"Read bounded Workflow status, Stage/review state, errors and artifact metadata for the current Project. This tool never changes Workflow, Job or Project state.",
      risk:"read",
      inputJsonSchema:{type:"object",properties:{workflowId:{type:"string",format:"uuid"}},additionalProperties:false},
      revisionPolicy:"snapshot",
      idempotency:"read-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","workflow_not_found","tool_execution_failed"],
    }),
    inputSchema:GetWorkflowStatusInputSchema,
    outputSchema:WorkflowStatusToolOutputSchema,
    handler:async(inputValue,context)=>{
      const input=GetWorkflowStatusInputSchema.parse(inputValue);
      if(input.workflowId)return{workflows:[summarizeWorkflow(await requireProjectWorkflow(workflows,input.workflowId,context.context.projectId))]};
      const runs=(await workflows.list()).filter(item=>item.projectId===context.context.projectId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,8);
      return{workflows:runs.map(summarizeWorkflow)};
    },
  };
}

export function createWorkflowActionProposalTool(workflows:AgentWorkflowReader):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:REQUEST_WORKFLOW_ACTION_TOOL_ID,
      description:"Create a reviewable Workflow action proposal. Allowed requests are create_first_draft, resume a paused Workflow, retry a failed/interrupted Stage, or continue from ASSEMBLY_REVIEW to the accepted FINAL_RENDER path. This tool never executes the action; the user must Review and Apply it.",
      risk:"proposal",
      inputJsonSchema:{
        type:"object",
        required:["action"],
        properties:{
          action:{type:"string",enum:["create_first_draft","resume","retry","final_render"]},
          scenario:{type:"string",enum:["talking-head","product-ad","explainer"]},
          sourceAssetIds:{type:"array",items:{type:"string"},minItems:1,maxItems:64,uniqueItems:true},
          workflowId:{type:"string",format:"uuid"},
          stageId:{type:"string"},
        },
        additionalProperties:false,
      },
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","workflow_not_found","workflow_invalid_state","workflow_source_asset_missing","workflow_final_render_not_ready","tool_execution_failed"],
    }),
    inputSchema:RequestWorkflowActionInputSchema,
    outputSchema:WorkflowActionProposalToolOutputSchema,
    handler:async(inputValue,context)=>{
      const input=RequestWorkflowActionInputSchema.parse(inputValue);
      let payload:WorkflowActionProposalPayload;
      if(input.action==="create_first_draft"){
        const available=new Set(context.context.assets.map(asset=>asset.id));
        const missing=input.sourceAssetIds.filter(assetId=>!available.has(assetId));
        if(missing.length)throw new AgentToolSafeError("workflow_source_asset_missing",context.context.truncated.assets?"One or more requested source assets are outside the bounded Agent asset context. Select or narrow the source assets, then ask again.":"One or more requested source assets do not exist in the current Project context.");
        payload=WorkflowActionProposalPayloadSchema.parse(input);
      }else{
        const workflow=await requireProjectWorkflow(workflows,input.workflowId,context.context.projectId);
        if(input.action==="resume"){
          if(workflow.status!=="paused")throw new AgentToolSafeError("workflow_invalid_state",`Workflow ${workflow.id} can only be proposed for resume while paused.`);
          payload=WorkflowActionProposalPayloadSchema.parse({...input,expectedWorkflowUpdatedAt:workflow.updatedAt,expectedWorkflowStatus:"paused"});
        }else if(input.action==="retry"){
          if(workflow.status!=="failed"&&workflow.status!=="interrupted")throw new AgentToolSafeError("workflow_invalid_state",`Workflow ${workflow.id} is not in a retryable run state.`);
          const stage=workflow.stageExecutions.find(item=>item.stageId===input.stageId);
          if(!stage||(stage.status!=="failed"&&stage.status!=="interrupted"))throw new AgentToolSafeError("workflow_invalid_state",`Stage ${input.stageId} is not a failed or interrupted Stage in Workflow ${workflow.id}.`);
          payload=WorkflowActionProposalPayloadSchema.parse({...input,expectedWorkflowUpdatedAt:workflow.updatedAt,expectedWorkflowStatus:workflow.status});
        }else{
          if(workflow.status!=="waiting_review")throw new AgentToolSafeError("workflow_final_render_not_ready",`Workflow ${workflow.id} must be waiting at ASSEMBLY_REVIEW before final render can be requested.`);
          const checkpoint=workflow.checkpoints.find(item=>item.status==="waiting_review"&&item.stageId==="ASSEMBLY_REVIEW");
          if(!checkpoint)throw new AgentToolSafeError("workflow_final_render_not_ready",`Workflow ${workflow.id} has no active ASSEMBLY_REVIEW checkpoint to approve.`);
          payload=WorkflowActionProposalPayloadSchema.parse({...input,checkpointId:checkpoint.id,expectedWorkflowUpdatedAt:workflow.updatedAt,expectedWorkflowStatus:"waiting_review"});
        }
      }
      return{proposal:buildWorkflowProposal(payload,context)};
    },
  };
}

export const createWorkflowAgentTools=(workflows:AgentWorkflowReader)=>[createWorkflowStatusReadTool(workflows),createWorkflowActionProposalTool(workflows)] as const;
