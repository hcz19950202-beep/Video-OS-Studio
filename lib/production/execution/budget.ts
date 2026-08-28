import type {ProductionPlanStep} from "@/lib/production/plan/schema";
import {ProductionExecutionBudgetExceededError} from "@/lib/production/execution/errors";
import {
  ProductionExecutionUsageSchema,
  type ProductionExecution,
  type ProductionExecutionUsage,
} from "@/lib/production/execution/schema";

export const assertProductionExecutionAttemptBudget=(execution:ProductionExecution,step:ProductionPlanStep)=>{
  const state=execution.steps.find(item=>item.stepId===step.id);
  if(!state)throw new Error("Execution step state is missing.");
  if(state.attempts>=execution.budget.maxStepAttempts)throw new ProductionExecutionBudgetExceededError("maxStepAttempts");
  if(execution.counters.totalAttempts>=execution.budget.maxTotalAttempts)throw new ProductionExecutionBudgetExceededError("maxTotalAttempts");
  if((step.kind==="render-preview"||step.kind==="render-final")&&execution.counters.renderAttempts>=execution.budget.maxRenderAttempts)throw new ProductionExecutionBudgetExceededError("maxRenderAttempts");
  if(step.kind==="run-workflow"&&state.attempts>execution.budget.maxWorkflowRetries)throw new ProductionExecutionBudgetExceededError("maxWorkflowRetries");
};

export const hasProductionExecutionAttemptBudget=(execution:ProductionExecution,step:ProductionPlanStep)=>{
  try{assertProductionExecutionAttemptBudget(execution,step);return true;}
  catch(error){
    if(error instanceof ProductionExecutionBudgetExceededError)return false;
    throw error;
  }
};

export const incrementProductionExecutionAttempt=(execution:ProductionExecution,step:ProductionPlanStep):ProductionExecution=>({
  ...execution,
  counters:{
    ...execution.counters,
    totalAttempts:execution.counters.totalAttempts+1,
    renderAttempts:execution.counters.renderAttempts+(step.kind==="render-preview"||step.kind==="render-final"?1:0),
    workflowRetries:execution.counters.workflowRetries+(step.kind==="run-workflow"&&execution.steps.find(item=>item.stepId===step.id)!.attempts>0?1:0),
  },
  steps:execution.steps.map(item=>item.stepId===step.id?{...item,attempts:item.attempts+1}:item),
});

export const productionExecutionRemainingUsageBudget=(execution:ProductionExecution)=>({
  agentTurns:Math.max(0,execution.budget.maxAgentTurns-execution.counters.agentTurns),
  providerCalls:Math.max(0,execution.budget.maxProviderCalls-execution.counters.providerCalls),
  repairLoops:Math.max(0,execution.budget.maxRepairLoops-execution.counters.repairLoops),
});

export const recordProductionExecutionUsage=(execution:ProductionExecution,usageInput:Partial<ProductionExecutionUsage>|undefined):ProductionExecution=>{
  const usage=ProductionExecutionUsageSchema.parse(usageInput??{});
  return{
    ...execution,
    counters:{
      ...execution.counters,
      agentTurns:execution.counters.agentTurns+usage.agentTurns,
      providerCalls:execution.counters.providerCalls+usage.providerCalls,
      repairLoops:execution.counters.repairLoops+usage.repairLoops,
    },
  };
};

export const assertProductionExecutionUsageBudget=(execution:ProductionExecution)=>{
  if(execution.counters.agentTurns>execution.budget.maxAgentTurns)throw new ProductionExecutionBudgetExceededError("maxAgentTurns");
  if(execution.counters.providerCalls>execution.budget.maxProviderCalls)throw new ProductionExecutionBudgetExceededError("maxProviderCalls");
  if(execution.counters.repairLoops>execution.budget.maxRepairLoops)throw new ProductionExecutionBudgetExceededError("maxRepairLoops");
};
