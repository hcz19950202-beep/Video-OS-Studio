import type {AIProvider} from "@/lib/ai/provider";
import {DeterministicA4MockProvider} from "@/lib/ai/a4-mock-provider";
import {DeepSeekA3ModelSchema,DeepSeekChatProviderConfigSchema} from "@/lib/ai/providers/deepseek-config";
import {createDeepSeekChatProviderFromEnv} from "@/lib/ai/providers/deepseek-chat";
import {OpenAIA3ModelSchema,OpenAIResponsesProviderConfigSchema} from "@/lib/ai/providers/openai-config";
import {createOpenAIResponsesProviderFromEnv} from "@/lib/ai/providers/openai-responses";
import {VolcengineAgentPlanModelSchema,VolcengineAgentPlanProviderConfigSchema} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {createVolcengineAgentPlanProviderFromEnv} from "@/lib/ai/providers/volcengine-agent-plan";

export type AgentProviderId="volcengine-agent-plan"|"openai-responses"|"deepseek-chat"|"a4-mock-provider";
export type AgentProviderEnvironment=Readonly<Record<string,string|undefined>>;

export type AgentProviderRuntimeStatus={
  providerId:AgentProviderId;
  label:string;
  model:string;
  models:string[];
  configured:boolean;
  selectable:boolean;
  isDefault:boolean;
};

export class AgentProviderRuntimeError extends Error{
  constructor(
    readonly code:"unsupported_provider"|"provider_not_configured"|"unsupported_model",
    readonly providerId:string,
    readonly model?:string,
  ){
    super(code==="unsupported_provider"
      ?"Requested Agent provider is not supported."
      :code==="unsupported_model"
        ?"Requested Agent model is not supported by this provider."
        :"Requested Agent provider is not configured.");
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

const DEFAULT_VOLCENGINE_MODEL="ark-code-latest";
const DEFAULT_OPENAI_MODEL="gpt-5.6";
const DEFAULT_DEEPSEEK_MODEL="deepseek-v4-flash";
const MOCK_MODEL="a4-mock-model";
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

const environmentFor=(providerId:AgentProviderId,env:AgentProviderEnvironment,model?:string):AgentProviderEnvironment=>{
  if(providerId==="volcengine-agent-plan")return{...env,VOLCENGINE_AGENT_MODEL:model??trimmed(env.VOLCENGINE_AGENT_MODEL)??DEFAULT_VOLCENGINE_MODEL};
  if(providerId==="openai-responses")return{...env,OPENAI_MODEL:model??trimmed(env.OPENAI_MODEL)??DEFAULT_OPENAI_MODEL};
  if(providerId==="deepseek-chat")return{...env,DEEPSEEK_MODEL:model??trimmed(env.DEEPSEEK_MODEL)??DEFAULT_DEEPSEEK_MODEL};
  return env;
};

const baseStatuses=(env:AgentProviderEnvironment):Omit<AgentProviderRuntimeStatus,"isDefault">[]=>{
  const volcModel=trimmed(env.VOLCENGINE_AGENT_MODEL)??DEFAULT_VOLCENGINE_MODEL;
  const volcConfigured=VolcengineAgentPlanProviderConfigSchema.safeParse({apiKey:env.VOLCENGINE_AGENT_API_KEY,model:volcModel}).success;
  const openAIModel=trimmed(env.OPENAI_MODEL)??DEFAULT_OPENAI_MODEL;
  const openAIConfigured=OpenAIResponsesProviderConfigSchema.safeParse({apiKey:env.OPENAI_API_KEY,model:openAIModel}).success;
  const deepSeekModel=trimmed(env.DEEPSEEK_MODEL)??DEFAULT_DEEPSEEK_MODEL;
  const deepSeekConfigured=DeepSeekChatProviderConfigSchema.safeParse({apiKey:env.DEEPSEEK_API_KEY,model:deepSeekModel}).success;
  const mockAvailable=env.NODE_ENV!=="production";
  return[
    {providerId:"volcengine-agent-plan",label:"Volcengine Agent Plan",model:volcModel,models:[DEFAULT_VOLCENGINE_MODEL],configured:volcConfigured,selectable:true},
    {providerId:"openai-responses",label:"OpenAI Responses",model:openAIModel,models:[openAIModel],configured:openAIConfigured,selectable:true},
    {providerId:"deepseek-chat",label:"DeepSeek Chat",model:deepSeekModel,models:[...DeepSeekA3ModelSchema.options],configured:deepSeekConfigured,selectable:true},
    {providerId:"a4-mock-provider",label:"A4 Mock Provider",model:MOCK_MODEL,models:[MOCK_MODEL],configured:mockAvailable,selectable:mockAvailable},
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

export const validateAgentProviderRuntimeModel=(providerId:string,model:string):string=>{
  const id=resolveAgentProviderId(providerId);
  const parsed=id==="volcengine-agent-plan"
    ?VolcengineAgentPlanModelSchema.safeParse(model)
    :id==="openai-responses"
      ?OpenAIA3ModelSchema.safeParse(model)
      :id==="deepseek-chat"
        ?DeepSeekA3ModelSchema.safeParse(model)
        :{success:model===MOCK_MODEL,data:model};
  if(!parsed.success)throw new AgentProviderRuntimeError("unsupported_model",id,model);
  return parsed.data;
};

export const resolveAgentProviderModel=(providerId:string,requestedModel?:string,env:AgentProviderEnvironment=process.env):string=>{
  const status=getAgentProviderRuntimeStatus(providerId,env);
  const model=trimmed(requestedModel)??status.model;
  if(!status.models.includes(model))throw new AgentProviderRuntimeError("unsupported_model",status.providerId,model);
  return validateAgentProviderRuntimeModel(status.providerId,model);
};

export const createAgentProviderForRuntime=(providerId?:string,env:AgentProviderEnvironment=process.env,model?:string):AIProvider=>{
  const status=getAgentProviderRuntimeStatus(providerId,env);
  if(!status.configured||!status.selectable)throw new AgentProviderRuntimeError("provider_not_configured",status.providerId);
  const selectedModel=model===undefined?status.model:validateAgentProviderRuntimeModel(status.providerId,model);
  const runtimeEnvironment=environmentFor(status.providerId,env,selectedModel);
  if(status.providerId==="volcengine-agent-plan")return createVolcengineAgentPlanProviderFromEnv(runtimeEnvironment);
  if(status.providerId==="openai-responses")return createOpenAIResponsesProviderFromEnv(runtimeEnvironment);
  if(status.providerId==="deepseek-chat")return createDeepSeekChatProviderFromEnv(runtimeEnvironment);
  if(env.NODE_ENV==="production")throw new AgentProviderRuntimeError("provider_not_configured",status.providerId);
  return new DeterministicA4MockProvider();
};
