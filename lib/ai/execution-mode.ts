import {z} from "zod";

export const AgentExecutionModeSchema=z.enum(["review-first","apply-safe-edits","plan-only"]);
export type AgentExecutionMode=z.infer<typeof AgentExecutionModeSchema>;

export const DEFAULT_AGENT_EXECUTION_MODE:AgentExecutionMode="review-first";

export const describeAgentExecutionMode=(mode:AgentExecutionMode)=>{
  if(mode==="plan-only")return[
    "Execution policy intent: PLAN ONLY.",
    "Do not request or perform durable Project, Workflow, Mission, Job, QA, or Campaign mutations.",
    "Use read/analyze/plan capabilities only. You may describe a possible proposal, but do not execute a durable operation.",
  ].join(" ");
  if(mode==="apply-safe-edits")return[
    "Execution policy intent: APPLY SAFE EDITS.",
    "You may proactively use application-approved read/analyze capabilities and prepare reversible edits for the normal proposal path.",
    "This mode never overrides tool risk class, approval mode, revision checks, protected edits, or explicit Proposal Apply boundaries. R2/R3/R4 authority is not granted by this intent.",
  ].join(" ");
  return[
    "Execution policy intent: REVIEW FIRST.",
    "Prepare reviewable changes and wait for the normal Review / Apply boundary before any durable Project or Workflow mutation.",
    "Application risk class, revision checks, protected edits, and approval policy remain authoritative.",
  ].join(" ");
};
