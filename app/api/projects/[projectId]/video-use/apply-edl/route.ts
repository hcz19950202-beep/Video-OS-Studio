import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {VideoUseEdlSchema} from "@/lib/video-use/edl";
import {videoUseService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema,edl:VideoUseEdlSchema});
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const input=RequestSchema.parse(await request.json());return Response.json({project:await videoUseService.applyEdl(projectId,input.edl,{expectedRevision:input.expectedRevision,operationId:input.operationId})});}
  catch(error){return projectMutationErrorResponse(error,"Reload the latest Project, review EDL ranges, and apply rough cuts before adding Motion/B-roll/Audio tracks.");}
}
