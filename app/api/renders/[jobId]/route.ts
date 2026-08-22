import {renderJobs} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{jobId:string}>};

export async function GET(_request:Request,{params}:Context){
  const{jobId}=await params;
  const job=await renderJobs.get(jobId);
  return job?Response.json({job}):Response.json({error:"Render job not found",retryable:false},{status:404});
}

export async function DELETE(_request:Request,{params}:Context){
  try{
    const{jobId}=await params;
    const job=await renderJobs.cancel(jobId);
    return job?Response.json({job}):Response.json({error:"Render job not found",retryable:false},{status:404});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
