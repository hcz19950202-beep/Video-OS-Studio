import {z} from "zod";
import {applyScriptSegmentStatus} from "@/lib/script/editing";
import {projectRepository} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const BodySchema=z.object({segmentId:z.string().min(1),status:z.enum(["active","removed"])});

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const body=BodySchema.parse(await request.json());
    const project=await projectRepository.load(projectId);
    const next=applyScriptSegmentStatus(project,body.segmentId,body.status);
    await projectRepository.save(next);
    return Response.json({project:next});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),action:"Script cuts are only allowed before Scene/Caption/Motion/B-roll/Audio design. Review the project state and retry.",retryable:true},{status:400});
  }
}
