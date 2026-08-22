import {z} from "zod";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {VisualPlanSchema} from "@/lib/visual-planner/schema";
import {visualPlanService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema,plan:VisualPlanSchema,selectedIds:z.array(z.string().min(1))});
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const input=RequestSchema.parse(await request.json());return Response.json(await visualPlanService.apply(projectId,input.plan,input.selectedIds,{expectedRevision:input.expectedRevision,operationId:input.operationId}));}
  catch(error){return projectMutationErrorResponse(error,"Reload the latest Project, review the selected AI Director suggestions and local HyperFrames availability, then retry.");}
}
