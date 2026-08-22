import {ProjectCommandMutationSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {projectMutations} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=ProjectCommandMutationSchema.parse(await request.json());
    return Response.json(await projectMutations.applyCommand(projectId,input));
  }catch(error){
    return projectMutationErrorResponse(error,"Reload the latest project revision and retry the validated command.");
  }
}
