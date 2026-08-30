import {randomUUID} from "node:crypto";
import {
  assertProductionExecutionAttemptBudget,
  assertProductionExecutionUsageBudget,
  hasProductionExecutionAttemptBudget,
  incrementProductionExecutionAttempt,
  productionExecutionRemainingUsageBudget,
  recordProductionExecutionUsage,
} from "@/lib/production/execution/budget";
import {createProductionExecutionCheckpoint} from "@/lib/production/execution/checkpoints";
import {
  ProductionExecutionBudgetExceededError,
  ProductionExecutionCheckpointError,
  ProductionExecutionMissionCancelledError,
  ProductionExecutionPlanMismatchError,
  ProductionExecutionPlanUnavailableError,
} from "@/lib/production/execution/errors";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {evaluateProductionStepRisk} from "@/lib/production/execution/risk-policy";
import {
  ProductionExecutionBudgetSchema,
  ProductionExecutionIdSchema,
  ProductionExecutionSchema,
  ReviewProductionExecutionInputSchema,
  StepExecutionResultSchema,
  type ProductionExecution,
  type ProductionExecutionFailure,
  type ReviewProductionExecutionInput,
  type StepExecutionResult,
} from "@/lib/production/execution/schema";
import {currentProcessIdentity,isProcessIdentityAlive} from "@/lib/process/process-identity";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import type {ProductionPlan,ProductionPlanStep} from "@/lib/production/plan/schema";
import type {Project} from "@/schemas/project";

export interface ProductionExecutionProjectReader{
  load(projectId:string):Promise<Project>;
}

export interface ProductionStepRunnerInput{
  mission:ProductionMission;
  plan:ProductionPlan;
  step:ProductionPlanStep;
  execution:ProductionExecution;
  operationId:string;
  expectedProjectRevision:number;
  remainingUsageBudget:{agentTurns:number;providerCalls:number;repairLoops:number};
}

export interface ProductionStepRunner{
  execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>;
}

export class BlockingProductionStepRunner implements ProductionStepRunner{
  async execute():Promise<StepExecutionResult>{
    return{status:"blocked",code:"STEP_HANDLER_UNAVAILABLE",message:"No bounded production step handler is registered for this execution step."};
  }
}

export interface ProductionMissionExecutorOptions{
  now?:()=>string;
  createExecutionId?:()=>string;
  createOperationId?:()=>string;
  createCheckpointId?:()=>string;
}

const terminalMission=(status:ProductionMission["status"])=>status==="completed"||status==="cancelled";
const terminalExecution=(status:ProductionExecution["status"])=>status==="completed"||status==="cancelled"||status==="failed";
const failure=(code:string,message:string,retryable:boolean):ProductionExecutionFailure=>({code,message,retryable});

const dependenciesSatisfied=(plan:ProductionPlan,execution:ProductionExecution,step:ProductionPlanStep)=>{
  const states=new Map(execution.steps.map(item=>[item.stepId,item]));
  return step.dependsOn.every(id=>{
    const state=states.get(id);
    return state?.status==="completed"||state?.status==="skipped";
  });
};

const firstUnfinishedStep=(plan:ProductionPlan,execution:ProductionExecution)=>plan.steps.find(step=>{
  const state=execution.steps.find(item=>item.stepId===step.id);
  return state!==undefined&&state.status!=="completed"&&state.status!=="skipped";
});

const nextRunnableStep=(plan:ProductionPlan,execution:ProductionExecution)=>plan.steps.find(step=>{
  const state=execution.steps.find(item=>item.stepId===step.id);
  if(!state||state.status==="completed"||state.status==="skipped"||state.status==="blocked"||state.status==="failed"||state.status==="waiting-review"||state.status==="running")return false;
  return dependenciesSatisfied(plan,execution,step);
});

const clearRunnerOwnership=<T extends ProductionExecution["steps"][number]>(step:T):T=>({
  ...step,
  runnerOwnerPid:undefined,
  runnerOwnerStartedAt:undefined,
  runnerOwnerToken:undefined,
  runnerClaimedAt:undefined,
});

const terminalizeInFlightSteps=(execution:ProductionExecution,reason:ProductionExecutionFailure):ProductionExecution["steps"]=>execution.steps.map(step=>{
  if(step.status!=="running"&&step.status!=="retrying"&&step.status!=="waiting-review")return step;
  const preserveCancelledRunner=reason.code==="MISSION_CANCELLED"&&step.status==="running"&&step.runnerOwnerToken!==undefined;
  return preserveCancelledRunner?{...step,status:"blocked",lastFailure:reason}:{...clearRunnerOwnership(step),status:"blocked",lastFailure:reason};
});

type ProductionAdvanceClaim={
  execution:ProductionExecution;
  mission?:ProductionMission;
  plan?:ProductionPlan;
  step?:ProductionPlanStep;
  operationId?:string;
  runnerOwnerToken?:string;
  recovery?:boolean;
};

export class ProductionMissionExecutor{
  private readonly now:()=>string;
  private readonly createExecutionId:()=>string;
  private readonly createOperationId:()=>string;
  private readonly createCheckpointId:()=>string;

  constructor(
    private readonly missions:ProductionMissionRepository,
    private readonly plans:ProductionPlanRepository,
    private readonly executions:ProductionExecutionRepository,
    private readonly projects:ProductionExecutionProjectReader,
    private readonly runner:ProductionStepRunner=new BlockingProductionStepRunner(),
    options:ProductionMissionExecutorOptions={},
  ){
    this.now=options.now??(()=>new Date().toISOString());
    this.createExecutionId=options.createExecutionId??randomUUID;
    this.createOperationId=options.createOperationId??randomUUID;
    this.createCheckpointId=options.createCheckpointId??randomUUID;
  }

  async inspect(projectId:string,missionId:string):Promise<ProductionExecution|null>{
    const mission=await this.missions.require(projectId,missionId);
    if(mission.executionId)return this.executions.load(projectId,mission.executionId);
    return this.executions.latestForMission(projectId,missionId);
  }

  private createExecution(mission:ProductionMission,plan:ProductionPlan):ProductionExecution{
    const timestamp=this.now();
    return ProductionExecutionSchema.parse({
      id:ProductionExecutionIdSchema.parse(this.createExecutionId()),
      projectId:mission.projectId,
      missionId:mission.id,
      planId:plan.id,
      planBaseProjectRevision:plan.baseProjectRevision,
      expectedProjectRevision:plan.baseProjectRevision,
      status:"running",
      steps:plan.steps.map(step=>({stepId:step.id,status:"pending",operationId:this.createOperationId(),attempts:0,evidence:[]})),
      budget:ProductionExecutionBudgetSchema.parse({}),
      counters:{},
      createdAt:timestamp,
      updatedAt:timestamp,
    });
  }

  private async markMission(projectId:string,missionId:string,execution:ProductionExecution,status:ProductionMission["status"],activeStepId?:string){
    return this.missions.mutate(projectId,missionId,current=>{
      if(current.status==="cancelled"||current.planId!==execution.planId)return current;
      return{...current,executionId:execution.id,activeStepId,status,updatedAt:this.now()};
    });
  }

  private async blockExecution(projectId:string,missionId:string,execution:ProductionExecution,plan:ProductionPlan,reason:ProductionExecutionFailure):Promise<ProductionExecution>{
    const target=firstUnfinishedStep(plan,execution);
    const next=await this.executions.mutate(projectId,execution.id,()=>ProductionExecutionSchema.parse({
      ...execution,
      status:"blocked",
      activeStepId:undefined,
      steps:execution.steps.map(step=>step.stepId===target?.id?{...clearRunnerOwnership(step),status:"blocked",lastFailure:reason}:step),
      updatedAt:this.now(),
    }));
    await this.markMission(projectId,missionId,next,"blocked");
    return next;
  }

  private async supersedeExecution(projectId:string,missionId:string,execution:ProductionExecution,plan:ProductionPlan){
    if(terminalExecution(execution.status)||execution.status==="blocked")return execution;
    return this.blockExecution(projectId,missionId,execution,plan,failure("PLAN_SUPERSEDED","Execution stopped because the Mission now references a newer Production Plan.",false));
  }

  private async ensureCurrentExecution(projectId:string,missionId:string):Promise<{mission:ProductionMission;plan:ProductionPlan;execution:ProductionExecution}>{
    let mission=await this.missions.require(projectId,missionId);
    if(mission.status==="cancelled")throw new ProductionExecutionMissionCancelledError();
    if(terminalMission(mission.status))throw new ProductionExecutionPlanUnavailableError();
    if(!mission.planId)throw new ProductionExecutionPlanUnavailableError();
    const plan=await this.plans.require(projectId,mission.planId);
    if(plan.missionId!==mission.id)throw new ProductionExecutionPlanMismatchError();

    let execution:ProductionExecution|null=null;
    if(mission.executionId)execution=await this.executions.load(projectId,mission.executionId);
    if(!execution)execution=await this.executions.latestForMission(projectId,mission.id);

    if(execution&&execution.planId!==plan.id){
      const oldPlan=await this.plans.require(projectId,execution.planId);
      await this.supersedeExecution(projectId,missionId,execution,oldPlan);
      execution=null;
    }

    if(!execution){
      execution=await this.executions.create(this.createExecution(mission,plan));
      mission=await this.markMission(projectId,missionId,execution,"running");
    }else if(execution.missionId!==mission.id||execution.projectId!==projectId){
      throw new ProductionExecutionPlanMismatchError();
    }
    return{mission,plan,execution};
  }

  private async blockForStaleProject(projectId:string,missionId:string,execution:ProductionExecution,plan:ProductionPlan,actualRevision:number){
    return this.blockExecution(projectId,missionId,execution,plan,failure("PRODUCTION_EXECUTION_STALE_PROJECT",`Execution expected Project revision ${execution.expectedProjectRevision} but observed revision ${actualRevision}.`,false));
  }

  private async handleRunnerResult(
    projectId:string,
    missionId:string,
    plan:ProductionPlan,
    step:ProductionPlanStep,
    execution:ProductionExecution,
    resultInput:StepExecutionResult,
  ):Promise<ProductionExecution>{
    const result=StepExecutionResultSchema.parse(resultInput);
    let next=recordProductionExecutionUsage(execution,result.usage);
    let usageFailure:ProductionExecutionFailure|undefined;
    try{assertProductionExecutionUsageBudget(next);}
    catch(error){
      if(!(error instanceof ProductionExecutionBudgetExceededError))throw error;
      usageFailure=failure(error.code,error.message,false);
    }

    const latestMission=await this.missions.require(projectId,missionId);
    const latestProject=await this.projects.load(projectId);
    const cancelled=latestMission.status==="cancelled";
    const planChanged=latestMission.planId!==plan.id;

    if(result.status==="completed"){
      const revisionProvided=result.projectRevisionAfter!==undefined;
      const revisionVerified=revisionProvided&&latestProject.project.revision===result.projectRevisionAfter;
      const completionVerifiable=!step.requiresProjectRevision||revisionVerified;
      const revisionFailure=revisionProvided&&!revisionVerified
        ?failure("PROJECT_REVISION_RESULT_MISMATCH","Step completion could not be verified against the current Project revision.",false)
        :!completionVerifiable
          ?failure("PROJECT_REVISION_EVIDENCE_REQUIRED","Step completion requires a verified Project revision.",false)
          :undefined;

      if(revisionFailure){
        if(cancelled){
          return this.executions.mutate(projectId,next.id,()=>ProductionExecutionSchema.parse({
            ...next,
            status:"cancelled",
            activeStepId:undefined,
            steps:next.steps.map(item=>item.stepId===step.id?{...clearRunnerOwnership(item),status:"blocked",lastFailure:revisionFailure}:item),
            updatedAt:this.now(),
          }));
        }
        return this.blockExecution(projectId,missionId,next,plan,revisionFailure);
      }

      next=ProductionExecutionSchema.parse({
        ...next,
        expectedProjectRevision:result.projectRevisionAfter??next.expectedProjectRevision,
        activeStepId:undefined,
        steps:next.steps.map(item=>item.stepId===step.id?{
          ...clearRunnerOwnership(item),
          status:"completed",
          evidence:[...item.evidence,...result.evidence],
          lastFailure:undefined,
          completedAt:this.now(),
        }:item),
        updatedAt:this.now(),
      });

      if(cancelled){
        return this.executions.mutate(projectId,next.id,()=>ProductionExecutionSchema.parse({
          ...next,
          status:"cancelled",
          activeStepId:undefined,
          steps:terminalizeInFlightSteps(next,failure("MISSION_CANCELLED","Execution stopped because the Mission was cancelled.",false)),
          updatedAt:this.now(),
        }));
      }
      if(planChanged){
        return this.blockExecution(projectId,missionId,next,plan,failure("PLAN_SUPERSEDED","Execution stopped because the Mission now references a newer Production Plan.",false));
      }
      if(usageFailure)return this.blockExecution(projectId,missionId,next,plan,usageFailure);

      const allDone=next.steps.every(item=>item.status==="completed"||item.status==="skipped");
      const persisted=await this.executions.mutate(projectId,next.id,()=>ProductionExecutionSchema.parse({...next,status:allDone?"completed":"running",updatedAt:this.now()}));
      await this.markMission(projectId,missionId,persisted,allDone?"completed":"running");
      return persisted;
    }

    if(cancelled){
      return this.executions.mutate(projectId,next.id,current=>ProductionExecutionSchema.parse({
        ...current,
        counters:next.counters,
        status:"cancelled",
        activeStepId:undefined,
        steps:terminalizeInFlightSteps(current,failure("MISSION_CANCELLED","Execution stopped because the Mission was cancelled.",false)).map(item=>item.stepId===step.id?clearRunnerOwnership(item):item),
        updatedAt:this.now(),
      }));
    }
    if(planChanged){
      return this.blockExecution(projectId,missionId,next,plan,failure("PLAN_SUPERSEDED","Execution stopped because the Mission now references a newer Production Plan.",false));
    }
    if(usageFailure)return this.blockExecution(projectId,missionId,next,plan,usageFailure);
    if(result.status==="blocked")return this.blockExecution(projectId,missionId,next,plan,failure(result.code,result.message,false));

    const retryFailure=failure(result.code,result.message,true);
    const retryCandidate=ProductionExecutionSchema.parse({
      ...next,
      status:"running",
      activeStepId:step.id,
      steps:next.steps.map(item=>item.stepId===step.id?{...clearRunnerOwnership(item),status:"retrying",lastFailure:retryFailure}:item),
      updatedAt:this.now(),
    });
    if(!hasProductionExecutionAttemptBudget(retryCandidate,step)){
      return this.blockExecution(projectId,missionId,retryCandidate,plan,failure("PRODUCTION_EXECUTION_BUDGET_EXCEEDED","Production Mission execution budget was exhausted.",false));
    }
    const persisted=await this.executions.mutate(projectId,retryCandidate.id,()=>retryCandidate);
    await this.markMission(projectId,missionId,persisted,"running",step.id);
    return persisted;
  }

  private async claimAdvance(projectId:string,missionId:string):Promise<ProductionAdvanceClaim>{
    return this.executions.withMissionLock(projectId,missionId,async()=>{
      const{mission,plan,execution:initial}=await this.ensureCurrentExecution(projectId,missionId);
      let execution=initial;
      if(terminalExecution(execution.status)||execution.status==="blocked"||execution.status==="waiting-review")return{execution};

      const activeState=execution.steps.find(item=>item.status==="running");
      if(activeState){
        const activeStep=plan.steps.find(item=>item.id===activeState.stepId);
        if(!activeStep)return{execution:await this.blockExecution(projectId,missionId,execution,plan,failure("PLAN_STEP_MISMATCH","The active execution step no longer exists in the current Production Plan.",false))};
        const currentProject=await this.projects.load(projectId);
        const interruptedMutationRecovery=(activeStep.kind==="edit-project"||activeStep.kind==="repair")&&currentProject.project.revision===execution.expectedProjectRevision+1;
        if(!interruptedMutationRecovery&&currentProject.project.revision!==execution.expectedProjectRevision){
          return{execution:await this.blockForStaleProject(projectId,missionId,execution,plan,currentProject.project.revision)};
        }
        if(activeState.runnerOwnerPid!==undefined&&await isProcessIdentityAlive({pid:activeState.runnerOwnerPid,startedAt:activeState.runnerOwnerStartedAt}))return{execution};

        const runnerOwnerToken=randomUUID();

        const runnerOwnerIdentity=currentProcessIdentity();
        execution=await this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
          ...current,
          steps:current.steps.map(item=>item.stepId===activeStep.id&&item.status==="running"?{
            ...item,
            runnerOwnerPid:runnerOwnerIdentity.pid,
            runnerOwnerStartedAt:runnerOwnerIdentity.startedAt,
            runnerOwnerToken,
            runnerClaimedAt:this.now(),
          }:item),
          updatedAt:this.now(),
        }));
        const reclaimedState=execution.steps.find(item=>item.stepId===activeStep.id);
        if(!reclaimedState||reclaimedState.status!=="running"||reclaimedState.runnerOwnerToken!==runnerOwnerToken)return{execution};
        return{execution,mission,plan,step:activeStep,operationId:reclaimedState.operationId,runnerOwnerToken,recovery:true};
      }

      const step=nextRunnableStep(plan,execution);
      if(!step){
        const unfinished=firstUnfinishedStep(plan,execution);
        if(!unfinished){
          const completed=await this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({...current,status:"completed",activeStepId:undefined,updatedAt:this.now()}));
          await this.markMission(projectId,missionId,completed,"completed");
          return{execution:completed};
        }
        return{execution:await this.blockExecution(projectId,missionId,execution,plan,failure("PLAN_DEPENDENCY_UNSATISFIED","No executable step has satisfied Production Plan dependencies.",false))};
      }

      const state=execution.steps.find(item=>item.stepId===step.id);
      if(!state)throw new Error("Execution step state is missing.");
      const currentProject=await this.projects.load(projectId);
      if(currentProject.project.revision!==execution.expectedProjectRevision){
        return{execution:await this.blockForStaleProject(projectId,missionId,execution,plan,currentProject.project.revision)};
      }

      const risk=evaluateProductionStepRisk(step,mission.autonomyPolicy);
      if(risk.decision==="checkpoint"&&state.checkpoint?.status!=="approved"){
        const checkpoint=state.checkpoint?.status==="pending"?state.checkpoint:createProductionExecutionCheckpoint(step,risk.reason,{now:this.now,createId:this.createCheckpointId});
        execution=await this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
          ...current,
          status:"waiting-review",
          activeStepId:step.id,
          steps:current.steps.map(item=>item.stepId===step.id?{...clearRunnerOwnership(item),status:"waiting-review",checkpoint}:item),
          updatedAt:this.now(),
        }));
        await this.markMission(projectId,missionId,execution,"waiting-review",step.id);
        return{execution};
      }

      try{assertProductionExecutionAttemptBudget(execution,step);}
      catch(error){
        if(!(error instanceof ProductionExecutionBudgetExceededError))throw error;
        return{execution:await this.blockExecution(projectId,missionId,execution,plan,failure(error.code,error.message,false))};
      }

      const runnerOwnerToken=randomUUID();

      const runnerOwnerIdentity=currentProcessIdentity();
      execution=await this.executions.mutate(projectId,execution.id,current=>{
        const currentState=current.steps.find(item=>item.stepId===step.id);
        if(!currentState||currentState.status==="running")return current;
        const claimed=incrementProductionExecutionAttempt(current,step);
        return ProductionExecutionSchema.parse({
          ...claimed,
          status:"running",
          activeStepId:step.id,
          steps:claimed.steps.map(item=>item.stepId===step.id?{
            ...item,
            status:"running",
            runnerOwnerPid:runnerOwnerIdentity.pid,
            runnerOwnerStartedAt:runnerOwnerIdentity.startedAt,
            runnerOwnerToken,
            runnerClaimedAt:this.now(),
            startedAt:item.startedAt??this.now(),
          }:item),
          updatedAt:this.now(),
        });
      });
      const claimedState=execution.steps.find(item=>item.stepId===step.id);
      if(!claimedState||claimedState.status!=="running"||claimedState.runnerOwnerToken!==runnerOwnerToken)return{execution};
      await this.markMission(projectId,missionId,execution,"running",step.id);
      return{execution,mission,plan,step,operationId:claimedState.operationId,runnerOwnerToken};
    });
  }

  private async reconcileRunnerResult(projectId:string,missionId:string,claim:ProductionAdvanceClaim,result:StepExecutionResult):Promise<ProductionExecution>{
    if(!claim.mission||!claim.plan||!claim.step||!claim.operationId||!claim.runnerOwnerToken)return claim.execution;
    return this.executions.withMissionLock(projectId,missionId,async()=>{
      const mission=await this.missions.require(projectId,missionId);
      const execution=mission.executionId?await this.executions.load(projectId,mission.executionId):await this.executions.latestForMission(projectId,missionId);
      if(!execution)return claim.execution;
      const state=execution.steps.find(item=>item.stepId===claim.step!.id);
      const cancelledActive=execution.status==="cancelled"&&state?.status==="blocked"&&state.lastFailure?.code==="MISSION_CANCELLED";
      if(execution.id!==claim.execution.id||!state||state.operationId!==claim.operationId||state.runnerOwnerToken!==claim.runnerOwnerToken||(!cancelledActive&&state.status!=="running"))return execution;
      if(cancelledActive&&result.status!=="completed"){
        return this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
          ...current,
          steps:current.steps.map(item=>item.stepId===claim.step!.id?clearRunnerOwnership(item):item),
          updatedAt:this.now(),
        }));
      }
      return this.handleRunnerResult(projectId,missionId,claim.plan!,claim.step!,execution,result);
    });
  }

  async advance(projectId:string,missionId:string):Promise<ProductionExecution>{
    const claim=await this.claimAdvance(projectId,missionId);
    if(!claim.mission||!claim.plan||!claim.step||!claim.operationId||!claim.runnerOwnerToken)return claim.execution;
    let result:StepExecutionResult;
    try{
      result=await this.runner.execute({
        mission:claim.mission,
        plan:claim.plan,
        step:claim.step,
        execution:claim.execution,
        operationId:claim.operationId,
        expectedProjectRevision:claim.execution.expectedProjectRevision,
        remainingUsageBudget:productionExecutionRemainingUsageBudget(claim.execution),
      });
    }catch{
      result={status:"blocked",code:"STEP_RUNNER_ERROR",message:"The bounded production step runner failed before producing a valid durable result."};
    }
    return this.reconcileRunnerResult(projectId,missionId,claim,result);
  }

  async review(projectId:string,missionId:string,input:ReviewProductionExecutionInput):Promise<ProductionExecution>{
    const review=ReviewProductionExecutionInputSchema.parse(input);
    return this.executions.withMissionLock(projectId,missionId,async()=>{
      const mission=await this.missions.require(projectId,missionId);
      if(mission.status==="cancelled")throw new ProductionExecutionMissionCancelledError();
      if(!mission.planId||!mission.executionId)throw new ProductionExecutionCheckpointError();
      const execution=await this.executions.require(projectId,mission.executionId);
      if(execution.planId!==mission.planId)throw new ProductionExecutionPlanMismatchError();
      if(execution.status!=="waiting-review"||!execution.activeStepId)throw new ProductionExecutionCheckpointError();
      const active=execution.steps.find(item=>item.stepId===execution.activeStepId);
      if(!active||active.status!=="waiting-review"||active.checkpoint?.id!==review.checkpointId||active.checkpoint.status!=="pending")throw new ProductionExecutionCheckpointError();
      const decidedAt=this.now();

      if(review.decision==="rejected"){
        const rejected=await this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
          ...current,
          status:"blocked",
          activeStepId:undefined,
          steps:current.steps.map(item=>item.stepId===active.stepId?{
            ...clearRunnerOwnership(item),
            status:"blocked",
            checkpoint:{...active.checkpoint!,status:"rejected",decidedAt},
            evidence:[...item.evidence,{kind:"review",id:review.checkpointId}],
            lastFailure:failure("REVIEW_REJECTED","Human review rejected this Production Plan step.",false),
          }:item),
          updatedAt:decidedAt,
        }));
        await this.markMission(projectId,missionId,rejected,"blocked");
        return rejected;
      }

      const approved=await this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
        ...current,
        status:"running",
        activeStepId:undefined,
        steps:current.steps.map(item=>item.stepId===active.stepId?{
          ...clearRunnerOwnership(item),
          status:"pending",
          checkpoint:{...active.checkpoint!,status:"approved",decidedAt},
          evidence:[...item.evidence,{kind:"review",id:review.checkpointId}],
        }:item),
        updatedAt:decidedAt,
      }));
      await this.markMission(projectId,missionId,approved,"running");
      return approved;
    });
  }

  async cancel(projectId:string,missionId:string):Promise<ProductionExecution|null>{
    return this.executions.withMissionLock(projectId,missionId,async()=>{
      const mission=await this.missions.mutate(projectId,missionId,current=>{
        if(current.status==="completed")throw new ProductionExecutionPlanUnavailableError();
        if(current.status==="cancelled")return current;
        return{...current,status:"cancelled" as const,activeStepId:undefined,updatedAt:this.now()};
      });
      const execution=mission.executionId?await this.executions.load(projectId,mission.executionId):await this.executions.latestForMission(projectId,missionId);
      if(!execution)return null;
      if(execution.status==="cancelled")return execution;
      return this.executions.mutate(projectId,execution.id,current=>ProductionExecutionSchema.parse({
        ...current,
        status:"cancelled",
        activeStepId:undefined,
        steps:terminalizeInFlightSteps(current,failure("MISSION_CANCELLED","Execution stopped because the Mission was cancelled.",false)),
        updatedAt:this.now(),
      }));
    });
  }
}
