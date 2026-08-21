import {z} from "zod";
import {VisualPlanSchema} from "@/lib/visual-planner/schema";
import {visualPlanService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const RequestSchema=z.object({plan:VisualPlanSchema,selectedIds:z.array(z.string().min(1))});
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const{plan,selectedIds}=RequestSchema.parse(await request.json());return Response.json({diff:await visualPlanService.preview(projectId,plan,selectedIds)});}
  catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Regenerate the AI Director plan and review the selected suggestions.",retryable:true},{status:400});}
}
