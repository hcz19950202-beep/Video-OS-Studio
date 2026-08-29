import type {MissionAutonomyPolicy} from "@/lib/production/mission/schema";
import type {ProductionPlanStep} from "@/lib/production/plan/schema";

export type ProductionExecutionRisk=ProductionPlanStep["risk"];
export type ProductionExecutionRiskDecision="allow"|"checkpoint";

const riskRank:Record<ProductionExecutionRisk,number>={low:0,medium:1,high:2};
const applicationMinimumRiskByKind:Record<ProductionPlanStep["kind"],ProductionExecutionRisk>={
  "analyze-script":"low",
  "plan-visuals":"low",
  "prepare-assets":"low",
  "edit-project":"medium",
  "run-workflow":"medium",
  "render-preview":"low",
  "human-review":"high",
  "render-final":"medium",
  "qa":"low",
  "repair":"medium",
};
const effectByKind:Record<ProductionPlanStep["kind"],"analysis"|"durable">={
  "analyze-script":"analysis",
  "plan-visuals":"analysis",
  "prepare-assets":"durable",
  "edit-project":"durable",
  "run-workflow":"durable",
  "render-preview":"durable",
  "human-review":"durable",
  "render-final":"durable",
  "qa":"analysis",
  "repair":"durable",
};

export const effectiveProductionStepRisk=(step:ProductionPlanStep):ProductionExecutionRisk=>{
  const minimum=applicationMinimumRiskByKind[step.kind];
  return riskRank[step.risk]>=riskRank[minimum]?step.risk:minimum;
};

export const productionStepRequiresCheckpoint=(step:ProductionPlanStep,policy:MissionAutonomyPolicy):boolean=>{
  const risk=effectiveProductionStepRisk(step);
  if(step.reviewRequired||step.owner==="human-review"||risk==="high")return true;
  if(step.kind==="render-final"&&policy.finalReviewRequired)return true;
  if(policy.mode==="assist")return effectByKind[step.kind]!=="analysis";
  if(policy.mode==="guided")return risk!=="low";
  return false;
};

export const evaluateProductionStepRisk=(step:ProductionPlanStep,policy:MissionAutonomyPolicy):{decision:ProductionExecutionRiskDecision;effectiveRisk:ProductionExecutionRisk;reason:string}=>{
  const effectiveRisk=effectiveProductionStepRisk(step);
  const checkpoint=productionStepRequiresCheckpoint(step,policy);
  return{
    decision:checkpoint?"checkpoint":"allow",
    effectiveRisk,
    reason:checkpoint?`Step ${step.id} requires an application-owned review checkpoint under ${policy.mode} autonomy.`:`Step ${step.id} is allowed under ${policy.mode} autonomy at effective ${effectiveRisk} risk.`,
  };
};
