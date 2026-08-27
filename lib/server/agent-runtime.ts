import {
  AgentContextService,
  AgentProposalApplicationService,
  AgentSessionRepository,
  AgentSessionService,
  createA1AgentToolRegistry,
  createVolcengineAgentPlanProviderFromProcessEnv,
  observeAIProvider,
  type AgentProviderProgressObserver,
} from "@/lib/ai";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {dataRoot,fileSystem,projectMutations,projectRepository,visualPlanService} from "@/lib/server/runtime";

const sessions=getGlobalRuntime(`${dataRoot}:agent-sessions`,()=>new AgentSessionRepository(fileSystem,dataRoot));
const context=getGlobalRuntime(`${dataRoot}:agent-context`,()=>new AgentContextService(projectRepository));
const tools=getGlobalRuntime(`${dataRoot}:agent-tools`,()=>createA1AgentToolRegistry({visualPlans:visualPlanService}));
const applications=getGlobalRuntime(`${dataRoot}:agent-applications`,()=>new AgentProposalApplicationService({sessions,projects:projectRepository,mutations:projectMutations,visualPlans:visualPlanService}));

export type AgentProviderRuntimeStatus={
  providerId:"volcengine-agent-plan";
  model:string;
  configured:boolean;
};

export const getAgentProviderRuntimeStatus=():AgentProviderRuntimeStatus=>({
  providerId:"volcengine-agent-plan",
  model:process.env.VOLCENGINE_AGENT_MODEL?.trim()||"ark-code-latest",
  configured:Boolean(process.env.VOLCENGINE_AGENT_API_KEY?.trim()),
});

export const createServerAgentSessionService=(observer?:AgentProviderProgressObserver)=>{
  const baseProvider=createVolcengineAgentPlanProviderFromProcessEnv();
  const provider=observer?observeAIProvider(baseProvider,observer):baseProvider;
  return new AgentSessionService({provider,context,tools,sessions});
};

export const agentSessionRepository=sessions;
export const agentContextService=context;
export const agentProposalApplicationService=applications;
