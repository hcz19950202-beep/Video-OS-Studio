import {WorkflowActionRequestSchema,workflowErrorResponse} from "@/lib/workflows/http";
import {workflowService} from "@/lib/server/runtime";
import {WorkflowNotFoundError} from "@/lib/workflows/store";

export const runtime="nodejs";
type Context={params:Promise<{workflowId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{workflowId}=await params;
    const workflow=await workflowService.get(workflowId);
    if(!workflow)throw new WorkflowNotFoundError(workflowId);
    return Response.json({workflow});
  }catch(error){return workflowErrorResponse(error);}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{workflowId}=await params;
    const body=WorkflowActionRequestSchema.parse(await request.json());
    await workflowService.bindAssetBaseUrl(workflowId,new URL(request.url).origin);
    let workflow;
    if(body.action==="start")workflow=await workflowService.start(workflowId);
    else if(body.action==="pause")workflow=await workflowService.pause(workflowId);
    else if(body.action==="resume")workflow=await workflowService.resume(workflowId);
    else if(body.action==="cancel")workflow=await workflowService.cancel(workflowId);
    else if(body.action==="approve")workflow=await workflowService.approveCheckpoint(workflowId,body.checkpointId);
    else if(body.action==="retry")workflow=await workflowService.retryStage(workflowId,body.stageId);
    else workflow=await workflowService.replayFromStage(workflowId,body.stageId);
    return Response.json({workflow});
  }catch(error){return workflowErrorResponse(error);}
}
