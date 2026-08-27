import {AgentSessionIdSchema} from "@/lib/ai";
import {createServerAgentSessionService,getAgentProviderRuntimeStatus} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;sessionId:string}>};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId,sessionId:rawSessionId}=await params;
    const sessionId=AgentSessionIdSchema.parse(rawSessionId);
    const provider=getAgentProviderRuntimeStatus();
    if(!provider.configured){
      return Response.json({code:"AGENT_PROVIDER_NOT_CONFIGURED",message:"Volcengine Agent Plan is not configured for the server runtime.",retryable:true,action:"Configure the local Agent Plan runtime and retry."},{status:503});
    }
    const session=await createServerAgentSessionService().open(projectId,sessionId);
    return Response.json({session,provider});
  }catch(error){
    return Response.json({code:"AGENT_SESSION_NOT_FOUND",message:"Agent session could not be reopened.",retryable:true,action:"Refresh the session list or start a new session."},{status:404});
  }
}
