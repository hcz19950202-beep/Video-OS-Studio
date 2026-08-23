import {z} from "zod";
import {mediaDataMaintenanceService} from "@/lib/server/runtime";
import {ExpectedProjectRevisionSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};
const CleanupRequestSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,confirmProjectIdle:z.literal(true)});

export async function GET(_request:Request,{params}:Context){
  try{const{projectId}=await params;return Response.json(await mediaDataMaintenanceService.inspectImportedMediaOrphans(projectId));}
  catch(error){return projectMutationErrorResponse(error,"Open a valid Project and retry the orphan-media dry run.");}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const body=CleanupRequestSchema.parse(await request.json());
    return Response.json(await mediaDataMaintenanceService.cleanupImportedMediaOrphans({projectId,...body}));
  }catch(error){
    return projectMutationErrorResponse(error,"Stop Project uploads/imports, reload the latest Project revision, dry-run again, then explicitly confirm cleanup.");
  }
}
