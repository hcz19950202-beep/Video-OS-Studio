import {ProjectReplacementMutationSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {projectMutations,projectRepository} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    return Response.json({project:await projectRepository.load(projectId)});
  }catch(error){
    return Response.json({code:"PROJECT_NOT_FOUND",message:error instanceof Error?error.message:String(error),retryable:true,action:"Confirm the project still exists under VIDEO_OS_DATA_ROOT and retry."},{status:404});
  }
}

export async function PUT(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=ProjectReplacementMutationSchema.parse(await request.json());
    return Response.json(await projectMutations.replaceProject(projectId,input));
  }catch(error){
    return projectMutationErrorResponse(error,"Whole-project replacement is reserved for explicit restore/import/migration/maintenance flows. Reload the latest project before retrying.");
  }
}
