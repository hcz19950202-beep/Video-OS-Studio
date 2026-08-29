import {z} from "zod";
import {AgentSessionIdSchema} from "@/lib/ai/schema";
import {JobIdSchema} from "@/lib/jobs/schema";
import {ProductionExecutionSchema,ProductionExecutionCheckpointSchema,ProductionExecutionStepStatusSchema} from "@/lib/production/execution/schema";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanRiskSchema,ProductionPlanSchema,ProductionPlanStepKindSchema,ProductionPlanOwnerSchema,ProductionPlanStepIdSchema} from "@/lib/production/plan/schema";
import {QAReportSchema,QAReportStatusSchema} from "@/lib/production/qa/schema";
import {WorkflowRunIdSchema} from "@/lib/workflows/schema";
import {ProjectIdSchema} from "@/schemas/project";

const LogicalWorkspaceRefIdSchema=z.string().trim().min(1).max(160).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Workspace evidence IDs must be logical identifiers, not filesystem paths");

export const ProductionWorkspaceActivityStateSchema=z.enum([
  "draft",
  "planning",
  "ready",
  "running",
  "waiting-review",
  "blocked",
  "retrying",
  "repairing",
  "cancelled",
  "completed",
  "failed",
]);
export type ProductionWorkspaceActivityState=z.infer<typeof ProductionWorkspaceActivityStateSchema>;

export const ProductionWorkspaceQAStateSchema=z.enum(["not-run","pass","repair-recommended","fail"]);
export type ProductionWorkspaceQAState=z.infer<typeof ProductionWorkspaceQAStateSchema>;

export const ProductionWorkspaceFinalReadinessSchema=z.enum([
  "not-planned",
  "planned",
  "pending",
  "review-required",
  "blocked",
  "rendered-awaiting-qa",
  "qa-repair-recommended",
  "qa-failed",
  "qa-passed",
  "stale",
]);
export type ProductionWorkspaceFinalReadiness=z.infer<typeof ProductionWorkspaceFinalReadinessSchema>;

export const ProductionWorkspaceEvidenceKindSchema=z.enum([
  "mission",
  "project",
  "script",
  "scene",
  "visual-plan",
  "agent-session",
  "proposal",
  "apply-operation",
  "workflow",
  "job",
  "qa-report",
  "asset",
  "skill",
  "render",
  "review",
]);
export const ProductionWorkspaceEvidenceRefSchema=z.object({
  kind:ProductionWorkspaceEvidenceKindSchema,
  id:LogicalWorkspaceRefIdSchema,
  source:z.enum(["plan","execution"]),
}).strict();
export type ProductionWorkspaceEvidenceRef=z.infer<typeof ProductionWorkspaceEvidenceRefSchema>;

export const ProductionWorkspaceProgressSchema=z.object({
  totalSteps:z.number().int().nonnegative(),
  completedSteps:z.number().int().nonnegative(),
  percent:z.number().finite().min(0).max(100),
  activeStepId:ProductionPlanStepIdSchema.optional(),
}).strict().superRefine((progress,ctx)=>{
  if(progress.completedSteps>progress.totalSteps)ctx.addIssue({code:"custom",path:["completedSteps"],message:"Completed workspace steps cannot exceed total steps."});
});

export const ProductionWorkspaceActivitySchema=z.object({
  state:ProductionWorkspaceActivityStateSchema,
  stepId:ProductionPlanStepIdSchema.optional(),
  title:z.string().trim().min(1).max(1000).optional(),
  kind:ProductionPlanStepKindSchema.optional(),
  owner:ProductionPlanOwnerSchema.optional(),
  risk:ProductionPlanRiskSchema.optional(),
  stepStatus:ProductionExecutionStepStatusSchema.optional(),
}).strict();

export const ProductionWorkspaceReviewCheckpointSchema=z.object({
  stepId:ProductionPlanStepIdSchema,
  title:z.string().trim().min(1).max(1000),
  risk:ProductionPlanRiskSchema,
  checkpoint:ProductionExecutionCheckpointSchema,
}).strict();

export const ProductionWorkspaceLinkSchema=z.object({
  agentSessionIds:z.array(AgentSessionIdSchema).max(256),
  workflowRunIds:z.array(WorkflowRunIdSchema).max(256),
  jobIds:z.array(JobIdSchema).max(256),
}).strict();

export const ProductionWorkspaceQASummarySchema=z.object({
  state:ProductionWorkspaceQAStateSchema,
  status:QAReportStatusSchema.optional(),
  pass:z.number().int().nonnegative(),
  fail:z.number().int().nonnegative(),
  notEvaluated:z.number().int().nonnegative(),
}).strict();

export const ProductionWorkspaceSnapshotSchema=z.object({
  project:z.object({
    id:ProjectIdSchema,
    name:z.string().trim().min(1).max(200),
    currentRevision:z.number().int().nonnegative(),
  }).strict(),
  mission:ProductionMissionSchema,
  plan:ProductionPlanSchema.nullable(),
  execution:ProductionExecutionSchema.nullable(),
  latestQA:QAReportSchema.nullable(),
  activity:ProductionWorkspaceActivitySchema,
  progress:ProductionWorkspaceProgressSchema,
  qa:ProductionWorkspaceQASummarySchema,
  reviewCheckpoints:z.array(ProductionWorkspaceReviewCheckpointSchema).max(64),
  evidence:z.array(ProductionWorkspaceEvidenceRefSchema).max(512),
  skillsUsed:z.array(LogicalWorkspaceRefIdSchema).max(128),
  links:ProductionWorkspaceLinkSchema,
  stale:z.object({plan:z.boolean(),execution:z.boolean(),qa:z.boolean()}).strict(),
  finalRenderReadiness:ProductionWorkspaceFinalReadinessSchema,
}).strict();
export type ProductionWorkspaceSnapshot=z.infer<typeof ProductionWorkspaceSnapshotSchema>;
