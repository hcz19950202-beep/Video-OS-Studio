import {jobRuntime} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{jobId:string}>};

export async function GET(request:Request,{params}:Context){
  try{
    const{jobId}=await params;
    const job=await jobRuntime.get(jobId);
    if(!job)return Response.json({code:"JOB_NOT_FOUND",error:"Job not found",retryable:false},{status:404});
    const url=new URL(request.url);
    const stream=url.searchParams.get("stream")==="stderr"?"stderr":"stdout";
    const rawTail=Number(url.searchParams.get("tailBytes")??65536);
    const tailBytes=Number.isFinite(rawTail)?Math.max(1024,Math.min(1024*1024,Math.round(rawTail))):65536;
    const{text,totalBytes}=await jobRuntime.store.readLogTail(jobId,stream,tailBytes);
    return Response.json({jobId,stream,tailBytes,totalBytes,text});
  }catch(error){
    return Response.json({code:"JOB_LOG_READ_FAILED",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
