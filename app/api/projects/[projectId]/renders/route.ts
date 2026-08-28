import {z} from "zod";
import {ExportProfileSchema} from "@/lib/render/profile";
import {renderJobs} from "@/lib/server/runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({mode:z.enum(["final","overlay"]),profile:ExportProfileSchema.partial().optional()});

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const{mode,profile}=RequestSchema.parse(await request.json());
    return Response.json({job:await renderJobs.create(projectId,mode,resolveTrustedAssetBaseUrl(),profile)},{status:202});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),action:"Verify the project, export profile, trusted local asset origin, Remotion CLI installation and render directory, then retry.",retryable:true},{status:400});
  }
}
