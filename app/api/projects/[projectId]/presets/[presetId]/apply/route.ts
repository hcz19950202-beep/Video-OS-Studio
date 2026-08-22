import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {assetLibraryService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string;presetId:string}>};
const RequestSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema,startFrame:z.number().int().nonnegative()});
export async function POST(request:Request,{params}:Context){try{const{projectId,presetId}=await params;const input=RequestSchema.parse(await request.json());return Response.json({project:await assetLibraryService.applyToProject(projectId,presetId,input.startFrame,{expectedRevision:input.expectedRevision,operationId:input.operationId})});}catch(error){return projectMutationErrorResponse(error,"Reload the latest Project, verify the preset and current project duration, then retry.");}}
