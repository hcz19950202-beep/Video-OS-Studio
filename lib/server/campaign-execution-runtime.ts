import {ApplicationProductionAgentStepPort} from "@/lib/production/execution/agent-step-port";
import {
  ApplicationProductionStepRunner,
  ProductionVisualPlanProposalResolver,
  ProductionVisualPlanTargetResolver,
} from "@/lib/production/execution/application-runner";
import {createProtectedProductionExecutionService} from "@/lib/production/autonomy/composition";
import {ApplicationProductionQAStepPort} from "@/lib/production/execution/qa-step-port";
import {
  ApplicationProductionRepairStepPort,
  ProductionQARepairResolver,
  ProductionQARepairTargetResolver,
} from "@/lib/production/execution/repair-step-port";
import {ProductionMissionExecutor} from "@/lib/production/execution/executor";
import {ProductionExecutionService} from "@/lib/production/execution/service";
import {ProductionExecutionCampaignMissionPort} from "@/lib/production/campaign/execution-port";
import {ProductionCampaignExecutionUnavailableError} from "@/lib/production/campaign/errors";
import {ProductionCampaignRunner} from "@/lib/production/campaign/runner";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {
  agentSessionRepository,
  createServerAgentSessionService,
  getAgentProviderRuntimeStatus,
} from "@/lib/server/agent-runtime";
import {productionCampaignRepository} from "@/lib/server/campaign-runtime";
import {projectHistoryAttributions} from "@/lib/server/history-runtime";
import {
  dataRoot,
  jobRuntime,
  productionEditProtectionService,
  productionExecutionRepository,
  productionMissionRepository,
  productionPlanRepository,
  productionQAService,
  projectMutations,
  projectRepository,
  visualPlanService,
  workflowService,
} from "@/lib/server/runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

const createProductionExecutionService=()=>{
  const provider=getAgentProviderRuntimeStatus();
  const agentService=createServerAgentSessionService();
  const agent=new ApplicationProductionAgentStepPort(
    agentService,
    agentSessionRepository,
    {providerId:provider.providerId,model:provider.model},
  );
  const proposals=new ProductionVisualPlanProposalResolver(agentSessionRepository);
  const visualTargets=new ProductionVisualPlanTargetResolver(proposals);
  const qa=new ApplicationProductionQAStepPort(productionQAService);
  const repairs=new ProductionQARepairResolver(productionQAService);
  const repair=new ApplicationProductionRepairStepPort(repairs,projectRepository,projectMutations,projectHistoryAttributions);
  const repairTargets=new ProductionQARepairTargetResolver(repairs,projectRepository);
  const assetBaseUrl=resolveTrustedAssetBaseUrl();
  const application=new ApplicationProductionStepRunner(
    agent,
    proposals,
    visualPlanService,
    workflowService,
    jobRuntime,
    {resolve:async()=>assetBaseUrl},
    {qa,repair},
  );
  return createProtectedProductionExecutionService({
    missions:productionMissionRepository,
    plans:productionPlanRepository,
    executions:productionExecutionRepository,
    projects:projectRepository,
    runner:application,
    targets:{
      resolve:input=>input.step.kind==="repair"?repairTargets.resolve(input):visualTargets.resolve(input),
    },
    protection:productionEditProtectionService,
  });
};

export const getServerProductionExecutionService=()=>{
  try{
    return getGlobalRuntime(`${dataRoot}:production-execution-service`,createProductionExecutionService);
  }catch{
    throw new ProductionCampaignExecutionUnavailableError();
  }
};

export const getServerCampaignRunner=()=>{
  try{
    return getGlobalRuntime(
      `${dataRoot}:production-campaign-runner`,
      ()=>new ProductionCampaignRunner(
        productionCampaignRepository,
        new ProductionExecutionCampaignMissionPort(getServerProductionExecutionService()),
      ),
    );
  }catch(error){
    if(error instanceof ProductionCampaignExecutionUnavailableError)throw error;
    throw new ProductionCampaignExecutionUnavailableError();
  }
};

const cancellationExecutionService=getGlobalRuntime(
  `${dataRoot}:production-campaign-cancellation-execution-service`,
  ()=>new ProductionExecutionService(new ProductionMissionExecutor(
    productionMissionRepository,
    productionPlanRepository,
    productionExecutionRepository,
    projectRepository,
  )),
);

export const serverCampaignCancellationRunner=getGlobalRuntime(
  `${dataRoot}:production-campaign-cancellation-runner`,
  ()=>new ProductionCampaignRunner(productionCampaignRepository,{
    runMission:async()=>{throw new Error("Cancellation-only Campaign runner cannot execute Missions.");},
    cancelMission:async ref=>{await cancellationExecutionService.cancel(ref.projectId,ref.missionId);},
  }),
);
