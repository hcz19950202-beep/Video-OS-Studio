import {join} from "node:path";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {NodeFfmpegAdapter} from "@/adapters/ffmpeg";
import {NodeRemotionCliAdapter} from "@/adapters/remotion-cli";
import {NodeHyperFramesAdapter} from "@/adapters/hyperframes";
import {NodeVideoUseAdapter} from "@/adapters/video-use";
import {AssetIntelligenceRepository} from "@/lib/assets/intelligence/repository";
import {AssetIntelligenceService,DeterministicAssetIntelligenceAnalyzer} from "@/lib/assets/intelligence/service";
import {AssetLibraryService} from "@/lib/assets/service";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {createJobExecutors} from "@/lib/jobs/executors";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {MediaDataMaintenanceService} from "@/lib/media/data-maintenance";
import {MediaImportService} from "@/lib/media/import-service";
import {WaveformService} from "@/lib/media/waveform-service";
import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {ProductionEditProtectionService} from "@/lib/production/autonomy/service";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionService} from "@/lib/production/mission/service";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {ProductionQAService} from "@/lib/production/qa/service";
import {ProductionWorkspaceService} from "@/lib/production/workspace/service";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import {RenderJobManager} from "@/lib/render/render-jobs";
import {VideoUseService} from "@/lib/video-use/service";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {VisualPlanService} from "@/lib/visual-planner/service";
import {createWorkflowJobRuntimePort} from "@/lib/workflows/job-port";
import {registerProductionWorkflowDefinitions} from "@/lib/workflows/production-definitions";
import {registerProductionWorkflowStages} from "@/lib/workflows/production-stages";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";
import {registerW4WorkflowDefinitions} from "@/lib/workflows/w4-definitions";
import {registerW4WorkflowStages} from "@/lib/workflows/w4-stages";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

export const dataRoot=process.env.VIDEO_OS_DATA_ROOT||join(process.cwd(),".video-os-data");
export const fileSystem=new NodeFileSystemAdapter();
export const projectRepository=new ProjectRepository(fileSystem,dataRoot);
export const projectMutations=new ProjectMutationCoordinator(fileSystem,projectRepository);

export const ffmpegAdapter=new NodeFfmpegAdapter();
export const remotionRenderAdapter=new NodeRemotionCliAdapter();
export const hyperFramesAdapter=new NodeHyperFramesAdapter();
export const videoUseAdapter=new NodeVideoUseAdapter();

export const mediaImportService=new MediaImportService(fileSystem,ffmpegAdapter,projectRepository,undefined,projectMutations);
export const waveformService=new WaveformService(fileSystem,ffmpegAdapter,projectRepository);
export const hyperFramesRenderService=new HyperFramesRenderService(fileSystem,hyperFramesAdapter,projectRepository,projectMutations);
export const videoUseService=new VideoUseService(fileSystem,videoUseAdapter,projectRepository,projectMutations);

export const jobStore=getGlobalRuntime(`${dataRoot}:job-store`,()=>new FileJobStore(dataRoot));
export const mediaDataMaintenanceService=new MediaDataMaintenanceService(fileSystem,projectRepository,jobStore);
export const jobRuntime=getGlobalRuntime(`${dataRoot}:job-runtime`,()=>new DurableJobRuntime(jobStore,createJobExecutors({
  fs:fileSystem,
  repository:projectRepository,
  remotion:remotionRenderAdapter,
  ffmpeg:ffmpegAdapter,
  hyperFrames:hyperFramesRenderService,
  videoUse:videoUseService,
})));
export const renderJobs=new RenderJobManager(jobRuntime);

export const productionMissionRepository=getGlobalRuntime(`${dataRoot}:production-mission-repository`,()=>new ProductionMissionRepository(fileSystem,dataRoot));
export const productionMissionService=getGlobalRuntime(`${dataRoot}:production-mission-service`,()=>new ProductionMissionService(productionMissionRepository,projectRepository));
export const productionPlanRepository=getGlobalRuntime(`${dataRoot}:production-plan-repository`,()=>new ProductionPlanRepository(fileSystem,dataRoot));
export const productionExecutionRepository=getGlobalRuntime(`${dataRoot}:production-execution-repository`,()=>new ProductionExecutionRepository(fileSystem,dataRoot));
export const productionEditProtectionRepository=getGlobalRuntime(`${dataRoot}:production-edit-protection-repository`,()=>new ProductionEditProtectionRepository(fileSystem,dataRoot));
export const productionEditProtectionService=getGlobalRuntime(`${dataRoot}:production-edit-protection-service`,()=>new ProductionEditProtectionService(productionEditProtectionRepository));
export const qaReportRepository=getGlobalRuntime(`${dataRoot}:qa-report-repository`,()=>new QAReportRepository(fileSystem,dataRoot));
export const productionQAService=getGlobalRuntime(`${dataRoot}:production-qa-service`,()=>new ProductionQAService(qaReportRepository,projectRepository,jobStore,productionMissionService,fileSystem,ffmpegAdapter));
export const productionWorkspaceService=getGlobalRuntime(`${dataRoot}:production-workspace-service`,()=>new ProductionWorkspaceService(projectRepository,productionMissionRepository,productionPlanRepository,productionExecutionRepository,qaReportRepository));

export const visualPlannerAdapter=new RulesVisualPlannerAdapter();
export const visualPlanService=new VisualPlanService(fileSystem,projectRepository,visualPlannerAdapter,hyperFramesRenderService,projectMutations);
export const assetLibraryService=new AssetLibraryService(fileSystem,dataRoot,projectRepository,hyperFramesRenderService,projectMutations);
export const assetIntelligenceRepository=getGlobalRuntime(`${dataRoot}:asset-intelligence-repository`,()=>new AssetIntelligenceRepository(fileSystem,dataRoot));
export const assetIntelligenceAnalyzer=getGlobalRuntime(`${dataRoot}:asset-intelligence-analyzer`,()=>new DeterministicAssetIntelligenceAnalyzer());
export const assetIntelligenceService=getGlobalRuntime(`${dataRoot}:asset-intelligence-service`,()=>new AssetIntelligenceService(projectRepository,assetIntelligenceRepository,assetIntelligenceAnalyzer));

const fallbackWorkflowAssetBaseUrl=resolveTrustedAssetBaseUrl();
const workflowJobPollIntervalMs=250;
export const workflowStore=getGlobalRuntime(`${dataRoot}:workflow-store`,()=>new FileWorkflowStore(dataRoot));
export const workflowDefinitions=getGlobalRuntime(`${dataRoot}:workflow-definitions`,()=>registerW4WorkflowDefinitions(registerProductionWorkflowDefinitions(new WorkflowDefinitionRegistry())));
export const workflowStages=getGlobalRuntime(`${dataRoot}:workflow-stages`,()=>{
  const registry=registerProductionWorkflowStages(new WorkflowStageRegistry(),{
    fs:fileSystem,
    repository:projectRepository,
    mutations:projectMutations,
    jobs:jobRuntime,
    visualPlan:visualPlanService,
    assetBaseUrl:fallbackWorkflowAssetBaseUrl,
  });
  return registerW4WorkflowStages(registry,{repository:projectRepository,jobs:jobRuntime,fallbackAssetBaseUrl:fallbackWorkflowAssetBaseUrl});
});
export const workflowJobRuntime=getGlobalRuntime(`${dataRoot}:workflow-job-runtime`,()=>createWorkflowJobRuntimePort(jobRuntime));
export const workflowRunner=getGlobalRuntime(`${dataRoot}:workflow-runner`,()=>new WorkflowRunner(workflowStore,workflowDefinitions,workflowStages,workflowJobRuntime,{jobPollIntervalMs:workflowJobPollIntervalMs}));
export const workflowService=getGlobalRuntime(`${dataRoot}:workflow-service`,()=>new WorkflowService(projectRepository,workflowStore,workflowDefinitions,workflowRunner));
