import {ProjectTransactionMutationSchema} from "@/lib/project/mutation-contract";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {projectHistoryAttributions} from "@/lib/server/history-runtime";
import {projectMutations} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

export async function GET(_request:Request,{params}:Context){
  const{projectId}=await params;
  const[transactions,attributions]=await Promise.all([
    projectMutations.listHistory(projectId),
    projectHistoryAttributions.list(projectId),
  ]);
  const originByOperationId=new Map(attributions.map(entry=>[entry.operationId,entry.origin]));
  return Response.json({transactions:transactions.map(transaction=>({...transaction,origin:originByOperationId.get(transaction.operationId)??null}))});
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=ProjectTransactionMutationSchema.parse(await request.json());
    const result=await projectMutations.applyTransaction(projectId,input);
    await projectHistoryAttributions.record(projectId,result.operationId,{kind:"human"}).catch(()=>undefined);
    return Response.json(result);
  }catch(error){
    return projectMutationErrorResponse(error,"Reload the latest project revision, review the requested transaction, and retry.");
  }
}
