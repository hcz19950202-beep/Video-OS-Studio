import {z} from "zod";
import {ProjectHistoryTransactionSchema} from "@/lib/project/history";

const LogicalHistoryIdSchema=z.string().trim().min(1).max(160).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"History attribution IDs must be logical identifiers, not filesystem paths.");
const HistoryUuidSchema=z.string().uuid();

export const ProjectHistoryOriginSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("human")}).strict(),
  z.object({kind:z.literal("builtin-agent"),sessionId:HistoryUuidSchema,proposalId:HistoryUuidSchema}).strict(),
  z.object({kind:z.literal("external-agent"),sessionId:HistoryUuidSchema,proposalId:HistoryUuidSchema}).strict(),
  z.object({kind:z.literal("mission"),missionId:HistoryUuidSchema}).strict(),
  z.object({kind:z.literal("workflow"),workflowRunId:HistoryUuidSchema}).strict(),
]);
export type ProjectHistoryOrigin=z.infer<typeof ProjectHistoryOriginSchema>;

export const ProjectHistoryAttributionSchema=z.object({
  operationId:LogicalHistoryIdSchema,
  origin:ProjectHistoryOriginSchema,
  recordedAt:z.string().datetime(),
}).strict();
export type ProjectHistoryAttribution=z.infer<typeof ProjectHistoryAttributionSchema>;

export const AttributedProjectHistoryTransactionSchema=ProjectHistoryTransactionSchema.extend({
  origin:ProjectHistoryOriginSchema.nullable(),
}).strict();
export type AttributedProjectHistoryTransaction=z.infer<typeof AttributedProjectHistoryTransactionSchema>;
