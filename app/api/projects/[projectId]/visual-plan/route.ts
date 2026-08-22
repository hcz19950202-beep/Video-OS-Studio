import {visualPlanService} from "@/lib/server/runtime";
import {VisualPlannerContextSchema} from "@/lib/visual-planner/schema";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
export async function POST(request:Request,{params}:Context){
  try{const{projectId}=await params;const body=await request.json().catch(()=>({}));const context=VisualPlannerContextSchema.parse((body as{context?:unknown}).context??{});return Response.json({plan:await visualPlanService.generate(projectId,context)});}
  catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Ensure the project has timed Caption clips and Scenes, then retry AI Director analysis.",retryable:true},{status:400});}
}
