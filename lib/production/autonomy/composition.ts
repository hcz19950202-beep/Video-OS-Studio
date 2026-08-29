import type {ProductionExecutionProjectReader,ProductionMissionExecutorOptions,ProductionStepRunner} from "@/lib/production/execution/executor";
import {ProductionMissionExecutor} from "@/lib/production/execution/executor";
import type {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionExecutionService} from "@/lib/production/execution/service";
import type {ProductionMissionRepository} from "@/lib/production/mission/repository";
import type {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProtectedProductionStepRunner,type ProductionStepMutationTargetResolver} from "@/lib/production/autonomy/runner";
import type {ProductionEditProtectionService} from "@/lib/production/autonomy/service";

export interface ProtectedProductionExecutionDependencies{
  missions:ProductionMissionRepository;
  plans:ProductionPlanRepository;
  executions:ProductionExecutionRepository;
  projects:ProductionExecutionProjectReader;
  runner:ProductionStepRunner;
  targets:ProductionStepMutationTargetResolver;
  protection:ProductionEditProtectionService;
}

export const createProtectedProductionExecutionService=(
  dependencies:ProtectedProductionExecutionDependencies,
  options:ProductionMissionExecutorOptions={},
)=>{
  const protectedRunner=new ProtectedProductionStepRunner(
    dependencies.runner,
    dependencies.projects,
    dependencies.protection,
    dependencies.targets,
  );
  return new ProductionExecutionService(new ProductionMissionExecutor(
    dependencies.missions,
    dependencies.plans,
    dependencies.executions,
    dependencies.projects,
    protectedRunner,
    options,
  ));
};
