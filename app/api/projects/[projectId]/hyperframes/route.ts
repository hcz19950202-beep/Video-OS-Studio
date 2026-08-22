import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {hyperFramesRenderService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const InputSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema,effectId:z.string().min(1),props:z.record(z.string(),z.unknown()).default({}),startFrame:z.number().int().nonnegative(),durationInFrames:z.number().int().positive()});
export async function POST(request:Request,{params}:Context){try{const{projectId}=await params;const input=InputSchema.parse(await request.json());const project=await hyperFramesRenderService.renderAndAdd({projectId,effectId:input.effectId,props:input.props,startFrame:input.startFrame,durationInFrames:input.durationInFrames},{expectedRevision:input.expectedRevision,operationId:input.operationId});return Response.json({project});}catch(error){return projectMutationErrorResponse(error,"Reload the latest Project, verify HyperFrames/Node/FFmpeg/Chrome, then retry this effect.");}}
