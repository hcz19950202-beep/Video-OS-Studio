import {ProductionCampaignDashboardService} from "@/lib/production/campaign/dashboard";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";
import {ProductionCampaignService} from "@/lib/production/campaign/service";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {
  dataRoot,
  fileSystem,
  productionMissionRepository,
  productionWorkspaceService,
} from "@/lib/server/runtime";

export const productionCampaignRepository=getGlobalRuntime(
  `${dataRoot}:production-campaign-repository`,
  ()=>new ProductionCampaignRepository(fileSystem,dataRoot),
);

export const productionCampaignService=getGlobalRuntime(
  `${dataRoot}:production-campaign-service`,
  ()=>new ProductionCampaignService(productionCampaignRepository,{
    load:(projectId,missionId)=>productionMissionRepository.load(projectId,missionId),
  }),
);

export const productionCampaignDashboardService=getGlobalRuntime(
  `${dataRoot}:production-campaign-dashboard-service`,
  ()=>new ProductionCampaignDashboardService(productionCampaignRepository,productionWorkspaceService),
);
