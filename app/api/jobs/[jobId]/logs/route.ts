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
    const text=await jobRuntime.readLog(jobId,stream);
    const bytes=Buffer.from(text,"utf8");
    const tail=bytes.subarray(Math.max(0,bytes.length-tailBytes)).toString("utf8");
    return Response.json({jobId,stream,tailBytes,totalBytes:bytes.length,text:tail});
  }catch(error){
    return Response.json({code:"JOB_LOG_READ_FAILED",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
