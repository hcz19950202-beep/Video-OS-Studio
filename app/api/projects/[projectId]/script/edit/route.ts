import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {applyScriptSegmentStatus} from "@/lib/script/editing";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {projectMutations} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const BodySchema=z.object({
  expectedRevision:ExpectedProjectRevisionSchema,
  operationId:ProjectOperationIdSchema,
  segmentId:z.string().min(1),
  status:z.enum(["active","removed"]),
});

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const body=BodySchema.parse(await request.json());
    return Response.json(await projectMutations.mutate({projectId,expectedRevision:body.expectedRevision,operationId:body.operationId,kind:"script",payload:{segmentId:body.segmentId,status:body.status},apply:current=>applyScriptSegmentStatus(current,body.segmentId,body.status)}));
  }catch(error){
    return projectMutationErrorResponse(error,"Script cuts are only allowed from the latest Project revision and before downstream Scene/Caption/Motion/B-roll/Audio design.");
  }
}
