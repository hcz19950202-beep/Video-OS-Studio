import {JobNotFoundError,JobStateError} from "@/lib/jobs/runtime";
import {jobRuntime} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{jobId:string}>};

export async function POST(_request:Request,{params}:Context){
  try{
    const{jobId}=await params;
    return Response.json({job:await jobRuntime.retry(jobId)},{status:202});
  }catch(error){
    if(error instanceof JobNotFoundError)return Response.json({code:error.code,error:error.message,retryable:false},{status:404});
    if(error instanceof JobStateError)return Response.json({code:error.code,error:error.message,retryable:false,details:{status:error.status}},{status:409});
    return Response.json({code:"JOB_RETRY_FAILED",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
