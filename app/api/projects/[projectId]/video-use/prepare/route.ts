import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {videoUseService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema});
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const meta=RequestSchema.parse(await request.json());return Response.json({result:await videoUseService.prepare(projectId,meta)});}
  catch(error){return projectMutationErrorResponse(error,"Verify the latest Project revision, video-use installation, Python environment and ffmpeg, then retry.");}
}
