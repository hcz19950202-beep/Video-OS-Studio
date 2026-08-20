import {z} from "zod";
import {assetLibraryService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({clipId:z.string().min(1),name:z.string().trim().min(1).max(120)});
export async function POST(request:Request,{params}:Context){try{const{projectId}=await params;const input=RequestSchema.parse(await request.json());return Response.json({preset:await assetLibraryService.saveFromMotionClip(projectId,input.clipId,input.name)},{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Select a valid Motion clip and give the preset a name.",retryable:true},{status:400});}}
