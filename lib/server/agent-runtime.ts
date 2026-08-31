import {
  AgentContextService,
  AgentProposalApplicationService,
  AgentSessionRepository,
  AgentSessionService,
  AgentWorkflowActionExecutor,
  ContextReferenceService,
  createA1AgentToolRegistry,
  createVolcengineAgentPlanProviderFromProcessEnv,
  observeAIProvider,
  type AgentProviderProgressObserver,
} from "@/lib/ai";
import {DeterministicA4MockProvider} from "@/lib/ai/a4-mock-provider";
import {builtInVideoSkillRegistry} from "@/lib/production/skills";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {assetIntelligenceService,dataRoot,fileSystem,productionMissionRepository,productionPlanRepository,productionQAService,projectMutations,projectRepository,qaReportRepository,visualPlanService,workflowService} from "@/lib/server/runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

const sessions=getGlobalRuntime(`${dataRoot}:agent-sessions`,()=>new AgentSessionRepository(fileSystem,dataRoot));
const context=getGlobalRuntime(`${dataRoot}:agent-context`,()=>new AgentContextService(projectRepository));
const contextReferences=getGlobalRuntime(`${dataRoot}:agent-context-references`,()=>new ContextReferenceService({
  projects:projectRepository,
  qaReports:qaReportRepository,
  missions:productionMissionRepository,
  plans:productionPlanRepository,
}));
const tools=getGlobalRuntime(`${dataRoot}:agent-tools`,()=>createA1AgentToolRegistry({visualPlans:visualPlanService,workflows:workflowService,assetIntelligence:assetIntelligenceService,videoSkills:builtInVideoSkillRegistry,qaReports:productionQAService}));
const workflowActions=getGlobalRuntime(`${dataRoot}:agent-workflow-actions`,()=>new AgentWorkflowActionExecutor(workflowService,{assetBaseUrl:resolveTrustedAssetBaseUrl()}));
const applications=getGlobalRuntime(`${dataRoot}:agent-applications`,()=>new AgentProposalApplicationService({sessions,projects:projectRepository,mutations:projectMutations,visualPlans:visualPlanService,workflowActions}));
const mockProviderRequested=()=>process.env.VIDEO_OS_AGENT_PROVIDER?.trim()==="mock"&&process.env.NODE_ENV!=="production";

export type AgentProviderRuntimeStatus={
  providerId:string;
  model:string;
  configured:boolean;
};

export const getAgentProviderRuntimeStatus=():AgentProviderRuntimeStatus=>mockProviderRequested()?{
  providerId:"a4-mock-provider",
  model:"a4-mock-model",
  configured:true,
}:{
  providerId:"volcengine-agent-plan",
  model:process.env.VOLCENGINE_AGENT_MODEL?.trim()||"ark-code-latest",
  configured:Boolean(process.env.VOLCENGINE_AGENT_API_KEY?.trim()),
};

export const createServerAgentSessionService=(observer?:AgentProviderProgressObserver)=>{
  const baseProvider=mockProviderRequested()?new DeterministicA4MockProvider():createVolcengineAgentPlanProviderFromProcessEnv();
  const provider=observer?observeAIProvider(baseProvider,observer):baseProvider;
  return new AgentSessionService({provider,context,contextReferences,tools,sessions});
};

export const agentSessionRepository=sessions;
export const agentContextService=context;
export const agentContextReferenceService=contextReferences;
export const agentProposalApplicationService=applications;
