import {videoUseService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
export async function POST(_request:Request,{params}:Context){
  try{const{projectId}=await params;return Response.json({result:await videoUseService.prepare(projectId)});}
  catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Verify the video-use installation, Python environment and ffmpeg, then retry.",retryable:true},{status:400});}
}
