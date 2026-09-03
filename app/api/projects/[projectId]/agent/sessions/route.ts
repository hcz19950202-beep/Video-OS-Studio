import {z} from "zod";
import {AgentSelectionSnapshotSchema} from "@/lib/ai";
import {
  AgentProviderRuntimeError,
  agentSessionRepository,
  createServerAgentSessionService,
  getAgentProviderRuntimeStatus,
  listAgentProviderRuntimeStatuses,
} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

const CreateSessionRequestSchema=z.object({
  selection:AgentSelectionSnapshotSchema.partial().optional(),
  providerId:z.string().trim().min(1).max(120).optional(),
}).strict();

const errorResponse=(error:unknown)=>{
  if(error instanceof AgentProviderRuntimeError){
    const unsupported=error.code==="unsupported_provider";
    return Response.json({
      code:unsupported?"AGENT_PROVIDER_UNSUPPORTED":"AGENT_PROVIDER_NOT_CONFIGURED",
      message:unsupported?"Requested Agent provider is not supported.":"Requested Agent provider is not configured for the server runtime.",
      retryable:!unsupported,
      action:unsupported?"Choose a supported built-in Agent provider.":"Configure the selected provider locally and retry.",
    },{status:unsupported?400:503});
  }
  return Response.json({
    code:"AGENT_SESSION_ERROR",
    message:"Agent session request failed.",
    retryable:true,
    action:"Reload the Project and retry.",
  },{status:400});
};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    return Response.json({
      sessions:await agentSessionRepository.list(projectId),
      provider:getAgentProviderRuntimeStatus(),
      providers:listAgentProviderRuntimeStatuses(),
    });
  }catch(error){return errorResponse(error);}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=CreateSessionRequestSchema.parse(await request.json());
    const provider=getAgentProviderRuntimeStatus(input.providerId);
    if(!provider.configured||!provider.selectable)throw new AgentProviderRuntimeError("provider_not_configured",provider.providerId);
    const service=createServerAgentSessionService(undefined,provider.providerId);
    const session=await service.create({projectId,model:provider.model,selection:input.selection});
    return Response.json({session,provider,providers:listAgentProviderRuntimeStatuses()},{status:201});
  }catch(error){return errorResponse(error);}
}
