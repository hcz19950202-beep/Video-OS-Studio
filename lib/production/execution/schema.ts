import {z} from "zod";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProductionPlanIdSchema,ProductionPlanStepIdSchema} from "@/lib/production/plan/schema";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionExecutionIdSchema=z.string().uuid();
export type ProductionExecutionId=z.infer<typeof ProductionExecutionIdSchema>;

export const ProductionExecutionStatusSchema=z.enum([
  "running",
  "waiting-review",
  "blocked",
  "completed",
  "cancelled",
  "failed",
]);
export type ProductionExecutionStatus=z.infer<typeof ProductionExecutionStatusSchema>;

export const ProductionExecutionStepStatusSchema=z.enum([
  "pending",
  "running",
  "waiting-review",
  "retrying",
  "completed",
  "blocked",
  "failed",
  "skipped",
]);
export type ProductionExecutionStepStatus=z.infer<typeof ProductionExecutionStepStatusSchema>;

const UnsafeExecutionTextPattern=/(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\|\/(?:Users|home|tmp|mnt|var|etc)\/|file:\/\/|\.\.\/|\.\.\\|powershell\s+(?:-|\/)|cmd\.exe\s+(?:-|\/)|bash\s+-c|child_process|spawn\s*\(|exec\s*\()/i;
export const ProductionExecutionSafeTextSchema=z.string().trim().min(1).max(1000).superRefine((value,ctx)=>{
  if(UnsafeExecutionTextPattern.test(value))ctx.addIssue({code:"custom",message:"Execution text must not expose machine paths or executable instructions."});
});

const LogicalExecutionRefIdSchema=z.string().trim().min(1).max(160).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Execution evidence IDs must be logical identifiers, not filesystem paths");
export const ProductionExecutionEvidenceKindSchema=z.enum([
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
export const ProductionExecutionEvidenceRefSchema=z.object({
  kind:ProductionExecutionEvidenceKindSchema,
  id:LogicalExecutionRefIdSchema,
}).strict();
export type ProductionExecutionEvidenceRef=z.infer<typeof ProductionExecutionEvidenceRefSchema>;

export const ProductionExecutionBudgetSchema=z.object({
  maxStepAttempts:z.number().int().min(1).max(10).default(2),
  maxTotalAttempts:z.number().int().min(1).max(256).default(64),
  maxAgentTurns:z.number().int().min(1).max(256).default(32),
  maxProviderCalls:z.number().int().min(1).max(256).default(32),
  maxRepairLoops:z.number().int().min(0).max(16).default(2),
  maxRenderAttempts:z.number().int().min(1).max(32).default(4),
  maxWorkflowRetries:z.number().int().min(0).max(16).default(2),
}).strict();
export type ProductionExecutionBudget=z.infer<typeof ProductionExecutionBudgetSchema>;

export const ProductionExecutionCountersSchema=z.object({
  totalAttempts:z.number().int().nonnegative().default(0),
  agentTurns:z.number().int().nonnegative().default(0),
  providerCalls:z.number().int().nonnegative().default(0),
  repairLoops:z.number().int().nonnegative().default(0),
  renderAttempts:z.number().int().nonnegative().default(0),
  workflowRetries:z.number().int().nonnegative().default(0),
}).strict();
export type ProductionExecutionCounters=z.infer<typeof ProductionExecutionCountersSchema>;

export const ProductionExecutionUsageSchema=z.object({
  agentTurns:z.number().int().nonnegative().max(256).default(0),
  providerCalls:z.number().int().nonnegative().max(256).default(0),
  repairLoops:z.number().int().nonnegative().max(16).default(0),
}).strict();
export type ProductionExecutionUsage=z.infer<typeof ProductionExecutionUsageSchema>;

export const ProductionExecutionFailureSchema=z.object({
  code:z.string().min(1).max(96).regex(/^[A-Z0-9_]+$/),
  message:ProductionExecutionSafeTextSchema,
  retryable:z.boolean(),
}).strict();
export type ProductionExecutionFailure=z.infer<typeof ProductionExecutionFailureSchema>;

export const ProductionExecutionCheckpointIdSchema=z.string().uuid();
export const ProductionExecutionCheckpointSchema=z.object({
  id:ProductionExecutionCheckpointIdSchema,
  stepId:ProductionPlanStepIdSchema,
  reason:ProductionExecutionSafeTextSchema,
  status:z.enum(["pending","approved","rejected"]),
  createdAt:z.string().datetime(),
  decidedAt:z.string().datetime().optional(),
}).strict().superRefine((checkpoint,ctx)=>{
  if(checkpoint.status==="pending"&&checkpoint.decidedAt!==undefined)ctx.addIssue({code:"custom",path:["decidedAt"],message:"Pending checkpoints cannot have a decision timestamp."});
  if(checkpoint.status!=="pending"&&checkpoint.decidedAt===undefined)ctx.addIssue({code:"custom",path:["decidedAt"],message:"Decided checkpoints require a decision timestamp."});
});
export type ProductionExecutionCheckpoint=z.infer<typeof ProductionExecutionCheckpointSchema>;

export const ProductionExecutionStepStateSchema=z.object({
  stepId:ProductionPlanStepIdSchema,
  status:ProductionExecutionStepStatusSchema,
  operationId:z.string().uuid(),
  runnerOwnerPid:z.number().int().positive().optional(),
  runnerOwnerStartedAt:z.number().int().positive().optional(),
  runnerOwnerToken:z.string().uuid().optional(),
  runnerClaimedAt:z.string().datetime().optional(),
  attempts:z.number().int().nonnegative(),
  evidence:z.array(ProductionExecutionEvidenceRefSchema).max(32).default([]),
  checkpoint:ProductionExecutionCheckpointSchema.optional(),
  lastFailure:ProductionExecutionFailureSchema.optional(),
  startedAt:z.string().datetime().optional(),
  completedAt:z.string().datetime().optional(),
}).strict().superRefine((step,ctx)=>{
  if(step.checkpoint&&step.checkpoint.stepId!==step.stepId)ctx.addIssue({code:"custom",path:["checkpoint","stepId"],message:"Checkpoint stepId must match its execution step."});
  if(step.status==="completed"&&step.evidence.length===0)ctx.addIssue({code:"custom",path:["evidence"],message:"Completed execution steps require durable evidence references."});
  if(step.status==="completed"&&step.completedAt===undefined)ctx.addIssue({code:"custom",path:["completedAt"],message:"Completed execution steps require completedAt."});
  if(step.status==="waiting-review"&&step.checkpoint?.status!=="pending")ctx.addIssue({code:"custom",path:["checkpoint"],message:"Waiting-review execution steps require a pending checkpoint."});
  const runnerOwnerFields=[step.runnerOwnerPid,step.runnerOwnerToken,step.runnerClaimedAt];
  const runnerOwnerFieldCount=runnerOwnerFields.filter(value=>value!==undefined).length;
  if(runnerOwnerFieldCount!==0&&runnerOwnerFieldCount!==runnerOwnerFields.length)ctx.addIssue({code:"custom",path:["runnerOwnerToken"],message:"Runner ownership metadata must be complete when present."});
  if(step.runnerOwnerStartedAt!==undefined&&runnerOwnerFieldCount===0)ctx.addIssue({code:"custom",path:["runnerOwnerStartedAt"],message:"Runner process start identity requires active ownership metadata."});
  const cancelledRunner=step.status==="blocked"&&step.lastFailure?.code==="MISSION_CANCELLED";
  if(step.status!=="running"&&!cancelledRunner&&runnerOwnerFieldCount!==0)ctx.addIssue({code:"custom",path:["runnerOwnerToken"],message:"Runner ownership metadata may only remain on an active runner or cancelled in-flight reconciliation."});
});
export type ProductionExecutionStepState=z.infer<typeof ProductionExecutionStepStateSchema>;

export const ProductionExecutionSchema=z.object({
  id:ProductionExecutionIdSchema,
  projectId:ProjectIdSchema,
  missionId:ProductionMissionIdSchema,
  planId:ProductionPlanIdSchema,
  planBaseProjectRevision:z.number().int().nonnegative(),
  expectedProjectRevision:z.number().int().nonnegative(),
  status:ProductionExecutionStatusSchema,
  activeStepId:ProductionPlanStepIdSchema.optional(),
  steps:z.array(ProductionExecutionStepStateSchema).min(1).max(64),
  budget:ProductionExecutionBudgetSchema,
  counters:ProductionExecutionCountersSchema,
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
}).strict().superRefine((execution,ctx)=>{
  if(execution.updatedAt<execution.createdAt)ctx.addIssue({code:"custom",path:["updatedAt"],message:"Execution updatedAt cannot precede createdAt."});
  const ids=new Set<string>();
  for(const[index,step]of execution.steps.entries()){
    if(ids.has(step.stepId))ctx.addIssue({code:"custom",path:["steps",index,"stepId"],message:`Duplicate execution step ${step.stepId}`});
    ids.add(step.stepId);
  }
  if(execution.activeStepId!==undefined&&!ids.has(execution.activeStepId))ctx.addIssue({code:"custom",path:["activeStepId"],message:"Active execution step must exist in the execution state."});
  const terminal=execution.status==="completed"||execution.status==="cancelled"||execution.status==="failed";
  if(terminal&&execution.activeStepId!==undefined)ctx.addIssue({code:"custom",path:["activeStepId"],message:"Terminal executions cannot retain an active step."});
  if(terminal&&execution.steps.some(step=>step.status==="running"||step.status==="retrying"||step.status==="waiting-review"))ctx.addIssue({code:"custom",path:["steps"],message:"Terminal executions cannot retain in-flight step state."});
  if(execution.expectedProjectRevision<execution.planBaseProjectRevision)ctx.addIssue({code:"custom",path:["expectedProjectRevision"],message:"Execution Project revision cannot move behind the immutable Plan base revision."});
  if(execution.status==="completed"&&execution.steps.some(step=>step.status!=="completed"&&step.status!=="skipped"))ctx.addIssue({code:"custom",path:["steps"],message:"Completed executions require every step to be completed or skipped."});
  if(execution.status==="waiting-review"){
    const active=execution.activeStepId===undefined?undefined:execution.steps.find(step=>step.stepId===execution.activeStepId);
    if(!active||active.status!=="waiting-review"||active.checkpoint?.status!=="pending")ctx.addIssue({code:"custom",path:["activeStepId"],message:"Waiting-review executions require one active step with a pending checkpoint."});
  }
});
export type ProductionExecution=z.infer<typeof ProductionExecutionSchema>;

export const ReviewProductionExecutionInputSchema=z.object({
  checkpointId:ProductionExecutionCheckpointIdSchema,
  decision:z.enum(["approved","rejected"]),
}).strict();
export type ReviewProductionExecutionInput=z.infer<typeof ReviewProductionExecutionInputSchema>;

export const StepExecutionCompletedResultSchema=z.object({
  status:z.literal("completed"),
  evidence:z.array(ProductionExecutionEvidenceRefSchema).min(1).max(32),
  projectRevisionAfter:z.number().int().nonnegative().optional(),
  usage:ProductionExecutionUsageSchema.optional(),
}).strict();
export const StepExecutionRetryableFailureResultSchema=z.object({
  status:z.literal("retryable-failure"),
  code:z.string().min(1).max(96).regex(/^[A-Z0-9_]+$/),
  message:ProductionExecutionSafeTextSchema,
  usage:ProductionExecutionUsageSchema.optional(),
}).strict();
export const StepExecutionBlockedResultSchema=z.object({
  status:z.literal("blocked"),
  code:z.string().min(1).max(96).regex(/^[A-Z0-9_]+$/),
  message:ProductionExecutionSafeTextSchema,
  usage:ProductionExecutionUsageSchema.optional(),
}).strict();
export const StepExecutionResultSchema=z.discriminatedUnion("status",[
  StepExecutionCompletedResultSchema,
  StepExecutionRetryableFailureResultSchema,
  StepExecutionBlockedResultSchema,
]);
export type StepExecutionResult=z.infer<typeof StepExecutionResultSchema>;
