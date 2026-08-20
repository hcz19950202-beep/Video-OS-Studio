import {VideoUseEdlSchema} from "@/lib/video-use/edl";
import {videoUseService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const edl=VideoUseEdlSchema.parse(await request.json());return Response.json({project:await videoUseService.applyEdl(projectId,edl)});}
  catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Review EDL ranges and apply rough cuts before adding Motion/B-roll/Audio tracks.",retryable:true},{status:400});}
}
