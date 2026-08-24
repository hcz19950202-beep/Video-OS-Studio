import {z} from "zod";
import {WorkflowRunIdSchema,WorkflowStageIdSchema} from "@/lib/workflows/schema";
import {JobIdSchema} from "@/lib/jobs/schema";

export const WorkflowActivityEventSchema=z.enum([
  "workflow-created",
  "workflow-started",
  "workflow-paused",
  "workflow-resumed",
  "workflow-cancelled",
  "workflow-completed",
  "workflow-failed",
  "workflow-interrupted",
  "stage-ready",
  "stage-started",
  "job-attached",
  "stage-completed",
  "stage-failed",
  "stage-interrupted",
  "stage-retried",
  "review-requested",
  "review-approved",
]);
export type WorkflowActivityEvent=z.infer<typeof WorkflowActivityEventSchema>;

export const WorkflowActivitySchema=z.object({
  id:z.string().uuid(),
  workflowId:WorkflowRunIdSchema,
  at:z.string().datetime(),
  event:WorkflowActivityEventSchema,
  stageId:WorkflowStageIdSchema.optional(),
  jobId:JobIdSchema.optional(),
  details:z.record(z.string(),z.unknown()).optional(),
});
export type WorkflowActivity=z.infer<typeof WorkflowActivitySchema>;
