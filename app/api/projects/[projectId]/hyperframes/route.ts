import { z } from "zod";
import { hyperFramesRenderService } from "@/lib/server/runtime";
export const runtime = "nodejs";
type Context={params:Promise<{projectId:string}>};
const InputSchema=z.object({effectId:z.string().min(1),props:z.record(z.string(),z.unknown()).default({}),startFrame:z.number().int().nonnegative(),durationInFrames:z.number().int().positive()});
export async function POST(request:Request,{params}:Context){try{const{projectId}=await params;const input=InputSchema.parse(await request.json());const project=await hyperFramesRenderService.renderAndAdd({projectId,...input});return Response.json({project});}catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Run npx hyperframes doctor, verify Node/FFmpeg/Chrome, then retry this effect.",retryable:true},{status:400});}}
