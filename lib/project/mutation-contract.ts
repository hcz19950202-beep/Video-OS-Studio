import {z} from "zod";
import {ProjectCommandSchema} from "@/lib/project/commands";
import {ProjectCommandTransactionSchema} from "@/lib/project/history";
import {ProjectSchema,type Project} from "@/schemas/project";

export const ProjectOperationIdSchema=z.string().trim().min(1).max(160);
export const ExpectedProjectRevisionSchema=z.number().int().nonnegative();

export const ProjectCommandMutationSchema=z.object({
  expectedRevision:ExpectedProjectRevisionSchema,
  commandId:ProjectOperationIdSchema,
  command:ProjectCommandSchema,
});

export const ProjectTransactionPayloadSchema=ProjectCommandTransactionSchema.omit({id:true});
export const ProjectTransactionMutationSchema=z.object({
  expectedRevision:ExpectedProjectRevisionSchema,
  transactionId:ProjectOperationIdSchema,
  transaction:ProjectTransactionPayloadSchema,
});

export const ProjectReplacementMutationSchema=z.object({
  expectedRevision:ExpectedProjectRevisionSchema,
  operationId:ProjectOperationIdSchema,
  reason:z.enum(["restore","import","migration","maintenance"]),
  project:ProjectSchema,
});

export type ProjectCommandMutation=z.infer<typeof ProjectCommandMutationSchema>;
export type ProjectTransactionMutation=z.infer<typeof ProjectTransactionMutationSchema>;
export type ProjectReplacementMutation=z.infer<typeof ProjectReplacementMutationSchema>;

export type ProjectMutationResponse={
  project:Project;
  operationId:string;
  appliedRevision:number;
  alreadyApplied:boolean;
};

export type ProjectMutationErrorBody={
  code:string;
  message:string;
  retryable:boolean;
  details?:Record<string,unknown>;
  requestId:string;
  action?:string;
};
