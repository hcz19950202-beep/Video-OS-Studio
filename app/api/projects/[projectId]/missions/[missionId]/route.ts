import {z} from "zod";
import {ProductionExecutionNotFoundError} from "@/lib/production/execution/errors";
import {ProductionMissionNotFoundError,ProductionMissionProjectUnavailableError,ProductionMissionTerminalStateError} from "@/lib/production/mission/errors";
import {ProductionMissionIdSchema,UpdateProductionMissionDetailsInputSchema} from "@/lib/production/mission/schema";
import {ProductionPlanNotFoundError} from "@/lib/production/plan/errors";
import {QAReportNotFoundError} from "@/lib/production/qa/errors";
import {ProductionWorkspaceTruthInconsistentError} from "@/lib/production/workspace/errors";
import {productionMissionService,productionWorkspaceService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;missionId:string}>};

const safeError=(error:unknown)=>{
  if(error instanceof z.ZodError)return{status:400,body:{error:"invalid_mission_request",message:"The Mission request did not match the accepted bounded contract.",retryable:false}};
  if(error instanceof ProductionMissionNotFoundError)return{status:404,body:{error:"mission_not_found",message:"The Production Mission was not found.",retryable:false}};
  if(error instanceof ProductionMissionProjectUnavailableError)return{status:404,body:{error:"project_unavailable",message:"The Project is unavailable for this Production Mission.",retryable:false}};
  if(error instanceof ProductionMissionTerminalStateError)return{status:409,body:{error:"mission_terminal",message:error.message,retryable:false}};
  if(error instanceof ProductionPlanNotFoundError||error instanceof ProductionExecutionNotFoundError||error instanceof QAReportNotFoundError||error instanceof ProductionWorkspaceTruthInconsistentError)return{status:409,body:{error:"mission_truth_inconsistent",message:"The Production Mission references durable production truth that is unavailable or inconsistent.",retryable:false}};
  return{status:500,body:{error:"mission_workspace_failed",message:"The Production Workspace request failed without exposing internal runtime details.",retryable:true}};
};

const ids=async(params:Context["params"])=>{
  const{projectId,missionId}=await params;
  return{projectId,missionId:ProductionMissionIdSchema.parse(missionId)};
};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId,missionId}=await ids(params);
    return Response.json({workspace:await productionWorkspaceService.snapshot(projectId,missionId)});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}

export async function PATCH(request:Request,{params}:Context){
  try{
    const{projectId,missionId}=await ids(params);
    const update=UpdateProductionMissionDetailsInputSchema.parse(await request.json());
    await productionMissionService.updateDetails(projectId,missionId,update);
    return Response.json({workspace:await productionWorkspaceService.snapshot(projectId,missionId)});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}

export async function DELETE(_request:Request,{params}:Context){
  try{
    const{projectId,missionId}=await ids(params);
    await productionMissionService.cancel(projectId,missionId);
    return Response.json({workspace:await productionWorkspaceService.snapshot(projectId,missionId)});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}
