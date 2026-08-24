import {workflowErrorResponse} from "@/lib/workflows/http";
import {workflowService} from "@/lib/server/runtime";
import {WorkflowNotFoundError} from "@/lib/workflows/store";

export const runtime="nodejs";
type Context={params:Promise<{workflowId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{workflowId}=await params;
    const workflow=await workflowService.get(workflowId);
    if(!workflow)throw new WorkflowNotFoundError(workflowId);
    return Response.json({activity:await workflowService.activity(workflowId)});
  }catch(error){return workflowErrorResponse(error);}
}
