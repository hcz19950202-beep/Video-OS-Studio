import type {AIProvider} from "@/lib/ai/provider";
import {DeterministicA4MockProvider} from "@/lib/ai/a4-mock-provider";
import {DeepSeekChatProviderConfigSchema} from "@/lib/ai/providers/deepseek-config";
import {createDeepSeekChatProviderFromEnv} from "@/lib/ai/providers/deepseek-chat";
import {OpenAIResponsesProviderConfigSchema} from "@/lib/ai/providers/openai-config";
import {createOpenAIResponsesProviderFromEnv} from "@/lib/ai/providers/openai-responses";
import {VolcengineAgentPlanProviderConfigSchema} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {createVolcengineAgentPlanProviderFromEnv} from "@/lib/ai/providers/volcengine-agent-plan";

export type AgentProviderId="volcengine-agent-plan"|"openai-responses"|"deepseek-chat"|"a4-mock-provider";
export type AgentProviderEnvironment=Readonly<Record<string,string|undefined>>;

export type AgentProviderRuntimeStatus={
  providerId:AgentProviderId;
  label:string;
  model:string;
  configured:boolean;
  selectable:boolean;
  isDefault:boolean;
};

export class AgentProviderRuntimeError extends Error{
  constructor(readonly code:"unsupported_provider"|"provider_not_configured",readonly providerId:string){
    super(code==="unsupported_provider"?"Requested Agent provider is not supported.":"Requested Agent provider is not configured.");
    this.name="AgentProviderRuntimeError";
  }
}

const aliases:Record<string,AgentProviderId>={
  volcengine:"volcengine-agent-plan",
  "volcengine-agent-plan":"volcengine-agent-plan",
  openai:"openai-responses",
  "openai-responses":"openai-responses",
  deepseek:"deepseek-chat",
  "deepseek-chat":"deepseek-chat",
  mock:"a4-mock-provider",
  "a4-mock-provider":"a4-mock-provider",
};

const trimmed=(value:string|undefined)=>value?.trim()||undefined;

export const resolveAgentProviderId=(value:string):AgentProviderId=>{
  const resolved=aliases[value.trim().toLowerCase()];
  if(!resolved)throw new AgentProviderRuntimeError("unsupported_provider",value);
  return resolved;
};

export const getDefaultAgentProviderId=(env:AgentProviderEnvironment=process.env):AgentProviderId=>{
  const raw=trimmed(env.VIDEO_OS_AGENT_PROVIDER)?.toLowerCase();
  if(!raw)return"volcengine-agent-plan";
  const resolved=aliases[raw];
  if(!resolved)return"volcengine-agent-plan";
  if(resolved==="a4-mock-provider"&&env.NODE_ENV==="production")return"volcengine-agent-plan";
  return resolved;
};

const volcengineEnvironment=(env:AgentProviderEnvironment):AgentProviderEnvironment=>({
  ...env,
  VOLCENGINE_AGENT_MODEL:trimmed(env.VOLCENGINE_AGENT_MODEL)??"ark-code-latest",
});

const baseStatuses=(env:AgentProviderEnvironment):Omit<AgentProviderRuntimeStatus,"isDefault">[]=>{
  const volcModel=trimmed(env.VOLCENGINE_AGENT_MODEL)??"ark-code-latest";
  const volcConfigured=VolcengineAgentPlanProviderConfigSchema.safeParse({
    apiKey:env.VOLCENGINE_AGENT_API_KEY,
    model:volcModel,
  }).success;
  const openAIModel=trimmed(env.OPENAI_MODEL)??"gpt-5.6";
  const openAIConfigured=OpenAIResponsesProviderConfigSchema.safeParse({
    apiKey:env.OPENAI_API_KEY,
    model:env.OPENAI_MODEL,
  }).success;
  const deepSeekModel=trimmed(env.DEEPSEEK_MODEL)??"deepseek-v4-flash";
  const deepSeekConfigured=DeepSeekChatProviderConfigSchema.safeParse({
    apiKey:env.DEEPSEEK_API_KEY,
    model:env.DEEPSEEK_MODEL,
  }).success;
  const mockAvailable=env.NODE_ENV!=="production";
  return[
    {providerId:"volcengine-agent-plan",label:"Volcengine Agent Plan",model:volcModel,configured:volcConfigured,selectable:true},
    {providerId:"openai-responses",label:"OpenAI Responses",model:openAIModel,configured:openAIConfigured,selectable:true},
    {providerId:"deepseek-chat",label:"DeepSeek Chat",model:deepSeekModel,configured:deepSeekConfigured,selectable:true},
    {providerId:"a4-mock-provider",label:"A4 Mock Provider",model:"a4-mock-model",configured:mockAvailable,selectable:mockAvailable},
  ];
};

export const listAgentProviderRuntimeStatuses=(env:AgentProviderEnvironment=process.env):AgentProviderRuntimeStatus[]=>{
  const defaultId=getDefaultAgentProviderId(env);
  return baseStatuses(env).map(status=>({...status,isDefault:status.providerId===defaultId}));
};

export const getAgentProviderRuntimeStatus=(providerId?:string,env:AgentProviderEnvironment=process.env):AgentProviderRuntimeStatus=>{
  const id=providerId===undefined?getDefaultAgentProviderId(env):resolveAgentProviderId(providerId);
  const status=listAgentProviderRuntimeStatuses(env).find(item=>item.providerId===id);
  if(!status)throw new AgentProviderRuntimeError("unsupported_provider",providerId??id);
  return status;
};

export const createAgentProviderForRuntime=(providerId?:string,env:AgentProviderEnvironment=process.env):AIProvider=>{
  const status=getAgentProviderRuntimeStatus(providerId,env);
  if(!status.configured||!status.selectable)throw new AgentProviderRuntimeError("provider_not_configured",status.providerId);
  if(status.providerId==="volcengine-agent-plan")return createVolcengineAgentPlanProviderFromEnv(volcengineEnvironment(env));
  if(status.providerId==="openai-responses")return createOpenAIResponsesProviderFromEnv(env);
  if(status.providerId==="deepseek-chat")return createDeepSeekChatProviderFromEnv(env);
  if(env.NODE_ENV==="production")throw new AgentProviderRuntimeError("provider_not_configured",status.providerId);
  return new DeterministicA4MockProvider();
};
