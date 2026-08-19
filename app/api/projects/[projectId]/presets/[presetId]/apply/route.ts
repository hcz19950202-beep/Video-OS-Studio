import {z} from "zod";
import {assetLibraryService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string;presetId:string}>};
const RequestSchema=z.object({startFrame:z.number().int().nonnegative()});
export async function POST(request:Request,{params}:Context){try{const{projectId,presetId}=await params;const{startFrame}=RequestSchema.parse(await request.json());return Response.json({project:await assetLibraryService.applyToProject(projectId,presetId,startFrame)});}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Verify the preset and current project duration, then retry.",retryable:true},{status:400});}}
