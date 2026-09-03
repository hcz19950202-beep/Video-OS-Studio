import {
  AgentContextService,
  AgentProposalApplicationService,
  AgentSessionRepository,
  AgentSessionService,
  AgentWorkflowActionExecutor,
  ContextReferenceService,
  createA1AgentToolRegistry,
  createC5ControlledMutationRegistry,
  observeAIProvider,
  type AgentProviderProgressObserver,
} from "@/lib/ai";
import {builtInVideoSkillRegistry} from "@/lib/production/skills";
import {createAgentProviderForRuntime} from "@/lib/server/agent-provider-runtime";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {assetIntelligenceService,dataRoot,fileSystem,jobRuntime,productionMissionRepository,productionPlanRepository,productionQAService,projectMutations,projectRepository,qaReportRepository,visualPlanService,workflowService} from "@/lib/server/runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

export {
  AgentProviderRuntimeError,
  getAgentProviderRuntimeStatus,
  listAgentProviderRuntimeStatuses,
  resolveAgentProviderId,
} from "@/lib/server/agent-provider-runtime";
export type {AgentProviderId,AgentProviderRuntimeStatus} from "@/lib/server/agent-provider-runtime";

const sessions=getGlobalRuntime(`${dataRoot}:agent-sessions`,()=>new AgentSessionRepository(fileSystem,dataRoot));
const context=getGlobalRuntime(`${dataRoot}:agent-context`,()=>new AgentContextService(projectRepository));
const contextReferences=getGlobalRuntime(`${dataRoot}:agent-context-references`,()=>new ContextReferenceService({
  projects:projectRepository,
  qaReports:qaReportRepository,
  missions:productionMissionRepository,
  plans:productionPlanRepository,
}));
const sharedTools=getGlobalRuntime(`${dataRoot}:shared-tools`,()=>createC5ControlledMutationRegistry({
  reads:{
    assetIntelligence:assetIntelligenceService,
    missions:productionMissionRepository,
    qaReports:productionQAService,
  },
  proposals:{sessions},
}));
const tools=getGlobalRuntime(`${dataRoot}:agent-tools`,()=>createA1AgentToolRegistry({
  visualPlans:visualPlanService,
  workflows:workflowService,
  assetIntelligence:assetIntelligenceService,
  videoSkills:builtInVideoSkillRegistry,
  qaReports:productionQAService,
  sharedToolRegistry:sharedTools,
}));
const trustedAssetBaseUrl=resolveTrustedAssetBaseUrl();
const workflowActions=getGlobalRuntime(`${dataRoot}:agent-workflow-actions`,()=>new AgentWorkflowActionExecutor(workflowService,{assetBaseUrl:trustedAssetBaseUrl}));
const applications=getGlobalRuntime(`${dataRoot}:agent-applications`,()=>new AgentProposalApplicationService({sessions,projects:projectRepository,mutations:projectMutations,visualPlans:visualPlanService,workflowActions,jobs:jobRuntime,trustedAssetBaseUrl}));

export const createServerAgentSessionService=(observer?:AgentProviderProgressObserver,providerId?:string)=>{
  const baseProvider=createAgentProviderForRuntime(providerId);
  const provider=observer?observeAIProvider(baseProvider,observer):baseProvider;
  return new AgentSessionService({provider,context,contextReferences,tools,sessions});
};

export const agentSessionRepository=sessions;
export const agentContextService=context;
export const agentContextReferenceService=contextReferences;
export const sharedAgentToolRegistry=sharedTools;
export const sharedAgentReadToolRegistry=sharedTools;
export const agentProposalApplicationService=applications;
