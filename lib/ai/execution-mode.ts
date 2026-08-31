import {z} from "zod";
import type {SharedToolRiskClass} from "@/lib/ai/tools/shared-contract";

export const AgentExecutionModeSchema=z.enum(["review-first","apply-safe-edits","plan-only"]);
export type AgentExecutionMode=z.infer<typeof AgentExecutionModeSchema>;

export const DEFAULT_AGENT_EXECUTION_MODE:AgentExecutionMode="review-first";

export const canExecutionModeAutoRun=(input:{mode:AgentExecutionMode;riskClass:SharedToolRiskClass;allowSessionOverride:boolean})=>{
  if(input.riskClass==="R0"||input.riskClass==="R1")return true;
  if(input.riskClass!=="R2")return false;
  return input.mode==="apply-safe-edits"&&input.allowSessionOverride;
};

export const describeAgentExecutionMode=(mode:AgentExecutionMode)=>{
  if(mode==="plan-only")return[
    "Execution policy intent: PLAN ONLY.",
    "Do not request or perform durable Project, Workflow, Mission, Job, QA, or Campaign mutations.",
    "Use read/analyze/search/plan/proposal capabilities only. Do not execute a durable mutation or costly Job.",
  ].join(" ");
  if(mode==="apply-safe-edits")return[
    "Execution policy intent: APPLY SAFE EDITS.",
    "R0/R1 capabilities may run automatically. An R2 reversible Project mutation is eligible for session auto-apply only when application-owned policy explicitly allows a session override for that tool.",
    "R3/R4 remain approval-bound. This mode never overrides revision checks, protected edits, idempotency, or application approval policy.",
  ].join(" ");
  return[
    "Execution policy intent: REVIEW FIRST.",
    "Read, analyze, search, plan, and proposal creation may run automatically, but durable Project mutation, costly Jobs, and protected operations require the normal application review/approval boundary.",
    "Application risk class, revision checks, protected edits, idempotency, and approval policy remain authoritative.",
  ].join(" ");
};
