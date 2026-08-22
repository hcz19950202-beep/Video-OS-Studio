import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

export const JobIdSchema=z.string().uuid();
export const JobTypeSchema=z.enum(["render-final","render-overlay","hyperframes-render","media-normalize","video-use-transcribe"]);
export type JobType=z.infer<typeof JobTypeSchema>;

export const JobStatusSchema=z.enum(["queued","preparing","running","completed","failed","cancelled","interrupted"]);
export type JobStatus=z.infer<typeof JobStatusSchema>;

export const JobErrorSchema=z.object({code:z.string().min(1),message:z.string().min(1),retryable:z.boolean(),details:z.record(z.string(),z.unknown()).optional()});
export type JobError=z.infer<typeof JobErrorSchema>;

export const JobArtifactSchema=z.object({id:z.string().min(1),kind:z.enum(["file","project-file","transcript","render","overlay","log"]),label:z.string().min(1),relativePath:z.string().min(1).optional(),mimeType:z.string().min(1).optional(),sizeBytes:z.number().int().nonnegative().optional(),metadata:z.record(z.string(),z.unknown()).optional()});
export type JobArtifact=z.infer<typeof JobArtifactSchema>;

export const JobRecordSchema=z.object({
  id:JobIdSchema,
  type:JobTypeSchema,
  projectId:ProjectIdSchema.optional(),
  status:JobStatusSchema,
  stage:z.string().min(1),
  progress:z.number().min(0).max(1),
  attempt:z.number().int().positive(),
  input:z.record(z.string(),z.unknown()).default({}),
  output:z.record(z.string(),z.unknown()).optional(),
  error:JobErrorSchema.optional(),
  cancellationRequestedAt:z.string().datetime().optional(),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  startedAt:z.string().datetime().optional(),
  finishedAt:z.string().datetime().optional(),
});
export type JobRecord=z.infer<typeof JobRecordSchema>;

export const JobArtifactsSchema=z.array(JobArtifactSchema);

export const CreateJobSchema=z.object({type:JobTypeSchema,projectId:ProjectIdSchema.optional(),input:z.record(z.string(),z.unknown()).default({})});
export type CreateJobInput=z.infer<typeof CreateJobSchema>;

export const isTerminalJobStatus=(status:JobStatus)=>["completed","failed","cancelled","interrupted"].includes(status);
