import {requestJson} from "@/lib/client/api";
import type {VisualPlan,VisualPlanDiff} from "@/lib/visual-planner/schema";
import type {Project} from "@/schemas/project";

export type PlannerSafeAreaContext={
  profileId:string;
  top:number;
  right:number;
  bottom:number;
  left:number;
};

export type GenerateVisualPlanInput={
  intent?:string;
  safeArea?:PlannerSafeAreaContext;
};

export type ApplyVisualPlanInput={
  expectedRevision:number;
  operationId:string;
  plan:VisualPlan;
  selectedIds:string[];
};

export type ApplyVisualPlanResult={
  project:Project;
  diff:VisualPlanDiff;
  transactionId:string|null;
  appliedIds:string[];
  alreadyApplied?:boolean;
};

export const generateVisualPlan=async(projectId:string,context:GenerateVisualPlanInput):Promise<VisualPlan>=>{
  const payload=await requestJson<{plan:VisualPlan}>(`/api/projects/${encodeURIComponent(projectId)}/visual-plan`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({context}),
  });
  return payload.plan;
};

export const applyVisualPlan=async(projectId:string,input:ApplyVisualPlanInput):Promise<ApplyVisualPlanResult>=>requestJson<ApplyVisualPlanResult>(`/api/projects/${encodeURIComponent(projectId)}/visual-plan/apply`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(input),
});
