import {z} from "zod";
import {AgentProposalApplicationError,AgentProposalNotFoundError,AgentProposalStaleError,AgentSessionIdSchema,AgentWorkflowActionError,AgentWorkflowActionStaleError} from "@/lib/ai";
import {agentProposalApplicationService} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;sessionId:string;proposalId:string}>};

const ProposalActionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("review"),operationIds:z.array(z.string().min(1)).max(64).optional(),changeIds:z.array(z.string().min(1)).max(128).optional()}).strict(),
  z.object({action:z.literal("apply"),expectedRevision:z.number().int().nonnegative(),operationIds:z.array(z.string().min(1)).max(64).optional(),changeIds:z.array(z.string().min(1)).max(128).optional()}).strict(),
  z.object({action:z.literal("reject")}).strict(),
]);

const errorResponse=(error:unknown)=>{
  if(error instanceof AgentProposalStaleError)return Response.json({code:error.code,message:"The proposal is stale because the Project changed.",retryable:true,expectedRevision:error.expectedRevision,currentRevision:error.currentRevision,action:"Reload the latest Project and ask the Agent to re-plan."},{status:409});
  if(error instanceof AgentWorkflowActionStaleError)return Response.json({code:error.code,message:"The Workflow changed after this proposal was generated.",retryable:true,workflowId:error.workflowId,action:"Reload Workflow status and ask the Agent to re-plan the action."},{status:409});
  if(error instanceof AgentProposalNotFoundError)return Response.json({code:error.code,message:"Agent proposal was not found.",retryable:false,action:"Refresh the Agent session."},{status:404});
  if(error instanceof AgentProposalApplicationError||error instanceof AgentWorkflowActionError)return Response.json({code:error.code,message:error.message,retryable:false,action:"Review the proposal and current Workflow state before retrying."},{status:400});
  if(error instanceof z.ZodError)return Response.json({code:"INVALID_AGENT_PROPOSAL_ACTION",message:"Proposal action input is invalid.",retryable:false,action:"Refresh the proposal and retry."},{status:400});
  return Response.json({code:"AGENT_PROPOSAL_ACTION_FAILED",message:"Agent proposal action failed.",retryable:true,action:"Reload the latest Project, Workflow and Agent session before retrying."},{status:500});
};

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId,sessionId:rawSessionId,proposalId}=await params;
    const sessionId=AgentSessionIdSchema.parse(rawSessionId);
    const input=ProposalActionSchema.parse(await request.json());
    if(input.action==="review")return Response.json(await agentProposalApplicationService.preview({projectId,sessionId,proposalId,operationIds:input.operationIds,changeIds:input.changeIds}));
    if(input.action==="reject")return Response.json({session:await agentProposalApplicationService.reject({projectId,sessionId,proposalId})});
    return Response.json(await agentProposalApplicationService.apply({projectId,sessionId,proposalId,expectedRevision:input.expectedRevision,operationIds:input.operationIds,changeIds:input.changeIds}));
  }catch(error){return errorResponse(error);}
}
