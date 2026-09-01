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
import {ContextReferenceListSchema} from "@/lib/ai/context-reference";
import {ProjectIdSchema} from "@/schemas/project";

const StableRuntimeIdSchema=z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/,"ID contains unsupported characters");

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
  references:ContextReferenceListSchema.optional(),
}).strict();
export type AgentContextReference=z.infer<typeof AgentContextReferenceSchema>;

export const AgentTurnSchema=z.object({
  id:AgentTurnIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  userMessageId:StableRuntimeIdSchema,
  assistantMessageId:StableRuntimeIdSchema.optional(),
  contextReferences:ContextReferenceListSchema.optional(),
  startedAt:z.string().datetime(),
  completedAt:z.string().datetime().optional(),
  status:AgentTurnStatusSchema,
  providerRoundTrips:z.number().int().nonnegative(),
  toolExecutions:z.array(AgentToolExecutionSchema).max(256),
  proposalIds:z.array(AgentProposalIdSchema).max(256),
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
  operationId:StableRuntimeIdSchema,
  proposalId:AgentProposalIdSchema,
  approvedAt:z.string().datetime(),
}).strict();
export type AgentApprovedOperation=z.infer<typeof AgentApprovedOperationSchema>;

export const AgentOperationClaimSchema=z.object({
  operationId:StableRuntimeIdSchema,
  proposalId:AgentProposalIdSchema,
  claimToken:StableRuntimeIdSchema,
  ownerPid:z.number().int().positive(),
  ownerStartedAt:z.number().int().positive().optional(),
  claimedAt:z.string().datetime(),
}).strict();
export type AgentOperationClaim=z.infer<typeof AgentOperationClaimSchema>;

export const AgentOperationAuditSourceSchema=z.enum(["builtin-agent","local-mcp"]);
export type AgentOperationAuditSource=z.infer<typeof AgentOperationAuditSourceSchema>;

export const AgentOperationAuditActionSchema=z.enum([
  "proposal-created",
  "proposal-reviewed",
  "proposal-applied",
  "proposal-rejected",
  "proposal-stale",
]);
export type AgentOperationAuditAction=z.infer<typeof AgentOperationAuditActionSchema>;

export const AgentOperationAuditOutcomeSchema=z.enum(["success","rejected","stale","error"]);
export type AgentOperationAuditOutcome=z.infer<typeof AgentOperationAuditOutcomeSchema>;

export const AgentOperationAuditEntrySchema=z.object({
  id:StableRuntimeIdSchema,
  source:AgentOperationAuditSourceSchema,
  action:AgentOperationAuditActionSchema,
  outcome:AgentOperationAuditOutcomeSchema,
  proposalId:AgentProposalIdSchema,
  toolId:z.string().min(1).max(128).optional(),
  requestId:z.string().min(1).max(256).optional(),
  providerId:z.string().min(1).max(120).optional(),
  operationId:StableRuntimeIdSchema.optional(),
  createdAt:z.string().datetime(),
}).strict();
export type AgentOperationAuditEntry=z.infer<typeof AgentOperationAuditEntrySchema>;

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
  operationClaims:z.array(AgentOperationClaimSchema).max(2_000).default([]),
  operationAudit:z.array(AgentOperationAuditEntrySchema).max(4_000).default([]),
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
  const claimIds=new Set<string>();
  for(const claim of session.operationClaims){
    if(claimIds.has(claim.operationId))ctx.addIssue({code:"custom",message:"Agent operation claim IDs must be unique."});
    claimIds.add(claim.operationId);
    if(!proposalIds.has(claim.proposalId))ctx.addIssue({code:"custom",message:"Agent operation claim must reference a proposal in the same session."});
  }
  const auditIds=new Set<string>();
  for(const audit of session.operationAudit){
    if(auditIds.has(audit.id))ctx.addIssue({code:"custom",message:"Agent operation audit entry IDs must be unique."});
    auditIds.add(audit.id);
    if(!proposalIds.has(audit.proposalId))ctx.addIssue({code:"custom",message:"Agent operation audit entry must reference a proposal in the same session."});
  }
});
export type AgentSession=z.infer<typeof AgentSessionSchema>;

export const parseAgentSession=(value:unknown):AgentSession=>AgentSessionSchema.parse(value);
