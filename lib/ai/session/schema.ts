import {z} from "zod";
import {
  AgentMessageSchema,
  AgentProposalIdSchema,
  AgentProposalSchema,
  AgentSessionIdSchema,
  AgentToolCallSchema,
  AgentToolResultSchema,
  AgentTurnIdSchema,
  AgentUsageSchema,
} from "@/lib/ai/schema";
import {AgentSelectionSnapshotSchema} from "@/lib/ai/context";
import {ProjectIdSchema} from "@/schemas/project";

export const AgentTurnStatusSchema=z.enum([
  "running",
  "completed",
  "failed",
  "cancelled",
  "budget-exhausted",
  "interrupted",
]);
export type AgentTurnStatus=z.infer<typeof AgentTurnStatusSchema>;

export const AgentSessionStatusSchema=z.enum(["active","closed"]);
export type AgentSessionStatus=z.infer<typeof AgentSessionStatusSchema>;

export const AgentRuntimeErrorSchema=z.object({
  category:z.enum(["provider","tool","budget","cancelled","recovery","validation"]),
  code:z.string().min(1).max(120),
  message:z.string().min(1).max(2_000),
  retryable:z.boolean(),
}).strict();
export type AgentRuntimeError=z.infer<typeof AgentRuntimeErrorSchema>;

export const AgentToolExecutionSchema=z.object({
  call:AgentToolCallSchema,
  result:AgentToolResultSchema,
}).strict();
export type AgentToolExecution=z.infer<typeof AgentToolExecutionSchema>;

export const AgentContextReferenceSchema=z.object({
  baseProjectRevision:z.number().int().nonnegative(),
  selection:AgentSelectionSnapshotSchema.optional(),
}).strict();
export type AgentContextReference=z.infer<typeof AgentContextReferenceSchema>;

export const AgentTurnSchema=z.object({
  id:AgentTurnIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  userMessageId:z.string().uuid(),
  assistantMessageId:z.string().uuid().optional(),
  startedAt:z.string().datetime(),
  completedAt:z.string().datetime().optional(),
  status:AgentTurnStatusSchema,
  providerRoundTrips:z.number().int().nonnegative(),
  toolExecutions:z.array(AgentToolExecutionSchema).max(256),
  proposalIds:z.array(AgentProposalIdSchema).max(128),
  usage:AgentUsageSchema.optional(),
  error:AgentRuntimeErrorSchema.optional(),
}).strict().superRefine((turn,ctx)=>{
  if(turn.status==="running"&&turn.completedAt!==undefined){
    ctx.addIssue({code:"custom",message:"A running Agent turn cannot have completedAt."});
  }
  if(turn.status!=="running"&&turn.completedAt===undefined){
    ctx.addIssue({code:"custom",message:"A terminal Agent turn requires completedAt."});
  }
});
export type AgentTurn=z.infer<typeof AgentTurnSchema>;

export const AgentApprovedOperationSchema=z.object({
  operationId:z.string().min(1).max(200),
  proposalId:AgentProposalIdSchema,
  approvedAt:z.string().datetime(),
}).strict();
export type AgentApprovedOperation=z.infer<typeof AgentApprovedOperationSchema>;

export const AgentSessionSchema=z.object({
  id:AgentSessionIdSchema,
  projectId:ProjectIdSchema,
  providerId:z.string().min(1).max(120),
  model:z.string().min(1).max(200).optional(),
  status:AgentSessionStatusSchema,
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  messages:z.array(AgentMessageSchema).max(4_000),
  turns:z.array(AgentTurnSchema).max(1_000),
  proposals:z.array(AgentProposalSchema).max(1_000),
  approvedOperations:z.array(AgentApprovedOperationSchema).max(2_000),
  lastContext:AgentContextReferenceSchema.optional(),
  usage:AgentUsageSchema.optional(),
}).strict().superRefine((session,ctx)=>{
  const proposalIds=new Set<string>();
  for(const proposal of session.proposals){
    if(proposal.sessionId!==session.id||proposal.projectId!==session.projectId){
      ctx.addIssue({code:"custom",message:"Agent proposal must belong to its containing session and Project."});
    }
    if(proposalIds.has(proposal.id)){
      ctx.addIssue({code:"custom",message:"Agent session proposal IDs must be unique."});
    }
    proposalIds.add(proposal.id);
  }
  const messageIds=new Set<string>();
  for(const message of session.messages){
    if(messageIds.has(message.id))ctx.addIssue({code:"custom",message:"Agent session message IDs must be unique."});
    messageIds.add(message.id);
  }
  const turnIds=new Set<string>();
  for(const turn of session.turns){
    if(turnIds.has(turn.id))ctx.addIssue({code:"custom",message:"Agent session turn IDs must be unique."});
    turnIds.add(turn.id);
  }
  const operationIds=new Set<string>();
  for(const operation of session.approvedOperations){
    if(operationIds.has(operation.operationId))ctx.addIssue({code:"custom",message:"Approved Agent operation IDs must be unique."});
    operationIds.add(operation.operationId);
    if(!proposalIds.has(operation.proposalId))ctx.addIssue({code:"custom",message:"Approved Agent operation must reference a proposal in the same session."});
  }
});
export type AgentSession=z.infer<typeof AgentSessionSchema>;

export const parseAgentSession=(value:unknown):AgentSession=>AgentSessionSchema.parse(value);
