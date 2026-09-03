import {AgentSessionIdSchema} from "@/lib/ai";
import {
  AgentProviderRuntimeError,
  agentSessionRepository,
  createServerAgentSessionService,
  getAgentProviderRuntimeStatus,
  listAgentProviderRuntimeStatuses,
} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;sessionId:string}>};

export async function GET(_request:Request,{params}:Context){
  let projectId:string;
  let sessionId:string;
  try{
    ({projectId,sessionId}=await params);
    sessionId=AgentSessionIdSchema.parse(sessionId);
  }catch{
    return Response.json({code:"AGENT_SESSION_NOT_FOUND",message:"Agent session could not be reopened.",retryable:true,action:"Refresh the session list or start a new session."},{status:404});
  }

  let persisted;
  try{persisted=await agentSessionRepository.require(projectId,sessionId);}
  catch{return Response.json({code:"AGENT_SESSION_NOT_FOUND",message:"Agent session could not be reopened.",retryable:true,action:"Refresh the session list or start a new session."},{status:404});}

  try{
    const provider=getAgentProviderRuntimeStatus(persisted.providerId);
    const providers=listAgentProviderRuntimeStatuses();
    if(!provider.configured||!provider.selectable)return Response.json({session:persisted,provider,providers});
    const session=await createServerAgentSessionService(undefined,provider.providerId).open(projectId,sessionId);
    return Response.json({session,provider,providers});
  }catch(error){
    if(error instanceof AgentProviderRuntimeError){
      return Response.json({
        code:"AGENT_SESSION_PROVIDER_UNAVAILABLE",
        message:"The provider recorded by this Agent session is unavailable in the current runtime.",
        retryable:false,
        action:"Open another built-in Agent session or restore support for the recorded provider.",
      },{status:409});
    }
    return Response.json({code:"AGENT_SESSION_NOT_FOUND",message:"Agent session could not be reopened.",retryable:true,action:"Refresh the session list or start a new session."},{status:404});
  }
}
