import {JobNotFoundError} from "@/lib/jobs/runtime";
import {jobRuntime} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{jobId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{jobId}=await params;
    const job=await jobRuntime.get(jobId);
    if(!job)return Response.json({code:"JOB_NOT_FOUND",error:"Job not found",retryable:false},{status:404});
    const artifacts=await jobRuntime.getArtifacts(jobId);
    return Response.json({job,artifacts});
  }catch(error){
    return Response.json({code:"JOB_READ_FAILED",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}

export async function DELETE(_request:Request,{params}:Context){
  try{
    const{jobId}=await params;
    return Response.json({job:await jobRuntime.cancel(jobId)});
  }catch(error){
    if(error instanceof JobNotFoundError)return Response.json({code:error.code,error:error.message,retryable:false},{status:404});
    return Response.json({code:"JOB_CANCEL_FAILED",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
