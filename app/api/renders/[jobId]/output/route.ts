import {projectRepository,renderJobs} from "@/lib/server/runtime";
import {createStreamingFileResponse} from "@/lib/http/streaming-file";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{jobId:string}>};

const serve=async(request:Request,{params}:Context)=>{
  try{
    const{jobId}=await params;
    const job=await renderJobs.get(jobId);
    if(!job||job.status!=="completed"||!job.outputRelativePath)throw new Error("Render output is not available.");
    const overlay=job.mode==="overlay";
    const path=projectRepository.resolveProjectFile(job.projectId,job.outputRelativePath);
    return createStreamingFileResponse(request,path,{
      mimeType:overlay?"video/webm":"video/mp4",
      contentDisposition:`attachment; filename="video-os-${job.mode}.${overlay?"webm":"mp4"}"`,
      cacheControl:"no-store",
    });
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),retryable:false},{status:404,headers:{"X-Content-Type-Options":"nosniff"}});
  }
};

export const GET=serve;
export const HEAD=serve;
