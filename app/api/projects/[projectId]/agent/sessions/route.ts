import {z} from "zod";
import {AgentSelectionSnapshotSchema} from "@/lib/ai";
import {agentSessionRepository,createServerAgentSessionService,getAgentProviderRuntimeStatus} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

const CreateSessionRequestSchema=z.object({
  selection:AgentSelectionSnapshotSchema.partial().optional(),
}).strict();

const errorResponse=(error:unknown)=>{
  const message=error instanceof Error?error.message:"Agent request failed.";
  const providerMissing=message.includes("VOLCENGINE_AGENT_API_KEY")||message.includes("VOLCENGINE_AGENT_MODEL");
  return Response.json({
    code:providerMissing?"AGENT_PROVIDER_NOT_CONFIGURED":"AGENT_SESSION_ERROR",
    message:providerMissing?"Volcengine Agent Plan is not configured for the server runtime.":"Agent session request failed.",
    retryable:true,
    action:providerMissing?"Configure the local Agent Plan runtime and retry.":"Reload the Project and retry.",
  },{status:providerMissing?503:400});
};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    return Response.json({sessions:await agentSessionRepository.list(projectId),provider:getAgentProviderRuntimeStatus()});
  }catch(error){return errorResponse(error);}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=CreateSessionRequestSchema.parse(await request.json());
    const provider=getAgentProviderRuntimeStatus();
    if(!provider.configured)return errorResponse(new Error("VOLCENGINE_AGENT_API_KEY is required"));
    const service=createServerAgentSessionService();
    const session=await service.create({projectId,model:provider.model,selection:input.selection});
    return Response.json({session,provider},{status:201});
  }catch(error){return errorResponse(error);}
}
