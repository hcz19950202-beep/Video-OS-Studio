import {applyProjectCommandTransaction,ProjectCommandTransactionSchema} from "@/lib/project/history";
import {projectRepository} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const transaction=ProjectCommandTransactionSchema.parse(await request.json());
    const project=await projectRepository.load(projectId);
    const next=applyProjectCommandTransaction(project,transaction);
    await projectRepository.save(next);
    return Response.json({project:next});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:String(error),action:"Review the requested project changes and retry.",retryable:true},{status:400});
  }
}
