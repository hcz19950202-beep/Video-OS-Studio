import {getAgentProviderRuntimeStatus} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

export async function GET(_request:Request,{params}:Context){
  const{projectId}=await params;
  const provider=getAgentProviderRuntimeStatus();
  return Response.json({projectId,provider});
}
