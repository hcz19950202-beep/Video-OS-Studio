import {z} from "zod";
import {QAProjectUnavailableError} from "@/lib/production/qa/errors";
import {QAReportIdSchema} from "@/lib/production/qa/schema";
import {productionQAService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;reportId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId,reportId}=await params;
    const report=await productionQAService.load(projectId,QAReportIdSchema.parse(reportId));
    if(!report)return Response.json({error:"qa_report_not_found",message:"The QA report was not found.",retryable:false},{status:404});
    return Response.json({report});
  }catch(error){
    if(error instanceof z.ZodError)return Response.json({error:"invalid_qa_report_id",message:"The QA report identifier is invalid.",retryable:false},{status:400});
    if(error instanceof QAProjectUnavailableError)return Response.json({error:"project_unavailable",message:"The Project is unavailable for QA.",retryable:false},{status:404});
    return Response.json({error:"qa_report_read_failed",message:"The QA report could not be read without exposing internal runtime details.",retryable:true},{status:500});
  }
}
