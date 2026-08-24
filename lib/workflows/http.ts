import {ZodError,z} from "zod";
import {WorkflowRuntimeStateError} from "@/lib/workflows/runner";
import {WorkflowProjectRevisionConflictError,WorkflowSourceAssetNotFoundError} from "@/lib/workflows/service";
import {WorkflowNotFoundError} from "@/lib/workflows/store";
import {WorkflowScenarioSchema} from "@/lib/workflows/schema";

export const CreateWorkflowRequestSchema=z.object({
  projectId:z.string().min(1),
  scenario:WorkflowScenarioSchema,
  sourceAssetIds:z.array(z.string().min(1)).min(1),
  expectedProjectRevision:z.number().int().nonnegative(),
});

export const WorkflowActionRequestSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("start")}),
  z.object({action:z.literal("pause")}),
  z.object({action:z.literal("resume")}),
  z.object({action:z.literal("cancel")}),
  z.object({action:z.literal("approve"),checkpointId:z.string().min(1)}),
  z.object({action:z.literal("retry"),stageId:z.string().min(1)}),
  z.object({action:z.literal("replay"),stageId:z.string().min(1)}),
]);

const payload=(code:string,message:string,retryable:boolean,details?:Record<string,unknown>)=>({code,message,retryable,details});

export const workflowErrorResponse=(error:unknown)=>{
  if(error instanceof WorkflowNotFoundError)return Response.json(payload(error.code,error.message,false),{status:404});
  if(error instanceof WorkflowProjectRevisionConflictError)return Response.json(payload(error.code,error.message,false,{expectedRevision:error.expectedRevision,currentRevision:error.currentRevision}),{status:409});
  if(error instanceof WorkflowSourceAssetNotFoundError)return Response.json(payload(error.code,error.message,false,{assetId:error.assetId}),{status:400});
  if(error instanceof WorkflowRuntimeStateError)return Response.json(payload(error.code,error.message,false,{workflowId:error.workflowId}),{status:409});
  if(error instanceof ZodError)return Response.json(payload("WORKFLOW_REQUEST_INVALID","The workflow request is invalid.",false,{issues:error.issues}),{status:400});
  return Response.json(payload("WORKFLOW_REQUEST_FAILED",error instanceof Error?error.message:String(error),true),{status:400});
};
