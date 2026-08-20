import {visualPlanService} from "@/lib/server/runtime";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
export async function POST(_request:Request,{params}:Context){
  try{const{projectId}=await params;return Response.json({plan:await visualPlanService.generate(projectId)});}
  catch(error){return Response.json({error:error instanceof Error?error.message:String(error),action:"Ensure the project has timed Caption clips, then retry Visual Plan generation.",retryable:true},{status:400});}
}
