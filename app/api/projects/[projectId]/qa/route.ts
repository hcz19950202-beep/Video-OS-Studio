import {z} from "zod";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {QAInvalidRenderJobError,QAProjectUnavailableError} from "@/lib/production/qa/errors";
import {RunProductionQAInputSchema} from "@/lib/production/qa/schema";
import {productionQAService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

const safeError=(error:unknown)=>{
  if(error instanceof z.ZodError)return{status:400,body:{error:"invalid_qa_request",message:"The QA request did not match the accepted bounded contract.",retryable:false}};
  if(error instanceof QAInvalidRenderJobError)return{status:409,body:{error:"invalid_render_job",message:error.message,retryable:false}};
  if(error instanceof QAProjectUnavailableError)return{status:404,body:{error:"project_unavailable",message:"The Project is unavailable for QA.",retryable:false}};
  return{status:500,body:{error:"qa_run_failed",message:"The QA run failed without exposing internal runtime details.",retryable:true}};
};

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=RunProductionQAInputSchema.parse(await request.json());
    return Response.json({report:await productionQAService.run(projectId,input)},{status:201});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}

export async function GET(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const url=new URL(request.url);
    const missionIdRaw=url.searchParams.get("missionId")??undefined;
    const missionId=missionIdRaw?ProductionMissionIdSchema.parse(missionIdRaw):undefined;
    const latest=url.searchParams.get("latest")==="1";
    if(latest)return Response.json({report:await productionQAService.latest(projectId,missionId)});
    const reports=await productionQAService.list(projectId);
    return Response.json({reports:missionId?reports.filter(report=>report.missionId===missionId):reports});
  }catch(error){const response=safeError(error);return Response.json(response.body,{status:response.status});}
}
