import {projectRepository} from "@/lib/server/runtime";
import {canonicalMediaMime,createStreamingFileResponse} from "@/lib/http/streaming-file";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{projectId:string;assetId:string}>};

const serve=async(request:Request,{params}:Context)=>{
  try{
    const{projectId,assetId}=await params;
    const project=await projectRepository.load(projectId);
    const asset=project.assets.find(item=>item.id===assetId);
    if(!asset)throw new Error(`Asset ${assetId} was not found in project ${projectId}.`);
    const path=projectRepository.resolveProjectFile(projectId,asset.relativePath);
    return createStreamingFileResponse(request,path,{mimeType:canonicalMediaMime(asset.relativePath),cacheControl:"no-store"});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),action:"Re-import the missing asset or reload the project.",retryable:false},{status:404,headers:{"X-Content-Type-Options":"nosniff"}});
  }
};

export const GET=serve;
export const HEAD=serve;
