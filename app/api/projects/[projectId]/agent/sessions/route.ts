import {z} from "zod";
import {AgentSelectionSnapshotSchema} from "@/lib/ai";
import {builtInVideoSkillRegistry} from "@/lib/production/skills";
import {
  AgentProviderRuntimeError,
  agentSessionRepository,
  createServerAgentSessionService,
  getAgentProviderRuntimeStatus,
  listAgentProviderRuntimeStatuses,
  resolveAgentProviderModel,
} from "@/lib/server/agent-runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string}>};

const CreateSessionRequestSchema=z.object({
  selection:AgentSelectionSnapshotSchema.partial().optional(),
  providerId:z.string().trim().min(1).max(120).optional(),
  model:z.string().trim().min(1).max(256).optional(),
}).strict();

const errorResponse=(error:unknown)=>{
  if(error instanceof AgentProviderRuntimeError){
    const unsupportedProvider=error.code==="unsupported_provider";
    const unsupportedModel=error.code==="unsupported_model";
    return Response.json({
      code:unsupportedProvider?"AGENT_PROVIDER_UNSUPPORTED":unsupportedModel?"AGENT_MODEL_UNSUPPORTED":"AGENT_PROVIDER_NOT_CONFIGURED",
      message:unsupportedProvider
        ?"Requested Agent provider is not supported."
        :unsupportedModel
          ?"Requested Agent model is not supported by the selected provider."
          :"Requested Agent provider is not configured for the server runtime.",
      retryable:!unsupportedProvider&&!unsupportedModel,
      action:unsupportedProvider
        ?"Choose a supported built-in Agent provider."
        :unsupportedModel
          ?"Choose a model advertised by the selected built-in Agent provider."
          :"Configure the selected provider locally and retry.",
    },{status:unsupportedProvider||unsupportedModel?400:503});
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
      skills:builtInVideoSkillRegistry.list(),
    });
  }catch(error){return errorResponse(error);}
}

export async function POST(request:Request,{params}:Context){
  try{
    const{projectId}=await params;
    const input=CreateSessionRequestSchema.parse(await request.json());
    const provider=getAgentProviderRuntimeStatus(input.providerId);
    if(!provider.configured||!provider.selectable)throw new AgentProviderRuntimeError("provider_not_configured",provider.providerId);
    const model=resolveAgentProviderModel(provider.providerId,input.model);
    const service=createServerAgentSessionService(undefined,provider.providerId,model);
    const session=await service.create({projectId,model,selection:input.selection});
    return Response.json({session,provider:{...provider,model},providers:listAgentProviderRuntimeStatuses()},{status:201});
  }catch(error){return errorResponse(error);}
}
