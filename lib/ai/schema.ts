import {z} from "zod";
import {AgentDurableJobProposalPayloadSchema} from "@/lib/ai/durable-job-proposal";
import {ProjectTransactionPayloadSchema} from "@/lib/project/mutation-contract";
import {ProjectIdSchema} from "@/schemas/project";

const StableIdSchema=z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/,"ID contains unsupported characters");
const JsonObjectSchema=z.record(z.string(),z.unknown());

export const AgentSessionIdSchema=z.string().uuid();
export const AgentTurnIdSchema=z.string().uuid();
export const AgentProposalIdSchema=z.string().uuid();
export const AgentToolCallIdSchema=StableIdSchema;
export const AgentToolIdSchema=z.string().min(1).max(128).regex(/^[a-z][a-z0-9_]*$/,"Tool IDs must use lowercase snake_case");

export const AgentMessageRoleSchema=z.enum(["user","assistant","tool"]);
export type AgentMessageRole=z.infer<typeof AgentMessageRoleSchema>;

export const AgentMessageSchema=z.object({
  id:StableIdSchema,
  role:AgentMessageRoleSchema,
  content:z.string().max(100_000),
  createdAt:z.string().datetime(),
  toolCallId:AgentToolCallIdSchema.optional(),
  toolName:AgentToolIdSchema.optional(),
}).strict().superRefine((message,ctx)=>{
  if(message.role==="tool"){
    if(!message.toolCallId)ctx.addIssue({code:"custom",path:["toolCallId"],message:"Tool messages require toolCallId"});
    if(!message.toolName)ctx.addIssue({code:"custom",path:["toolName"],message:"Tool messages require toolName"});
  }else if(message.toolCallId||message.toolName){
    ctx.addIssue({code:"custom",path:["role"],message:"Only tool messages may include toolCallId/toolName"});
  }
});
export type AgentMessage=z.infer<typeof AgentMessageSchema>;

export const AgentToolRiskSchema=z.enum(["read","proposal","mutating-request"]);
export type AgentToolRisk=z.infer<typeof AgentToolRiskSchema>;
export const AgentToolRevisionPolicySchema=z.enum(["none","snapshot","expected-revision"]);
export type AgentToolRevisionPolicy=z.infer<typeof AgentToolRevisionPolicySchema>;
export const AgentToolIdempotencySchema=z.enum(["read-only","proposal-only","stable-operation-id"]);
export type AgentToolIdempotency=z.infer<typeof AgentToolIdempotencySchema>;
const AgentToolErrorCodeSchema=z.string().min(1).max(128).regex(/^[a-z][a-z0-9_]*$/,"Tool error codes must use lowercase snake_case");

export const AgentToolDefinitionSchema=z.object({
  id:AgentToolIdSchema,
  description:z.string().min(1).max(2_000),
  risk:AgentToolRiskSchema,
  inputJsonSchema:JsonObjectSchema,
  revisionPolicy:AgentToolRevisionPolicySchema,
  idempotency:AgentToolIdempotencySchema,
  requiresConfirmation:z.boolean(),
  errorCodes:z.array(AgentToolErrorCodeSchema).min(1).max(32),
}).strict().superRefine((tool,ctx)=>{
  if(tool.risk==="read"){
    if(tool.requiresConfirmation)ctx.addIssue({code:"custom",path:["requiresConfirmation"],message:"Read-only tools must not require mutation confirmation"});
    if(tool.idempotency!=="read-only")ctx.addIssue({code:"custom",path:["idempotency"],message:"Read-only tools must declare read-only idempotency"});
  }
  if(tool.risk==="proposal"){
    if(tool.requiresConfirmation)ctx.addIssue({code:"custom",path:["requiresConfirmation"],message:"Proposal generation must not require mutation confirmation"});
    if(tool.revisionPolicy!=="snapshot")ctx.addIssue({code:"custom",path:["revisionPolicy"],message:"Proposal tools must bind to the captured Project snapshot revision"});
    if(tool.idempotency!=="proposal-only")ctx.addIssue({code:"custom",path:["idempotency"],message:"Proposal tools must declare proposal-only idempotency"});
  }
  if(tool.risk==="mutating-request"){
    if(!tool.requiresConfirmation)ctx.addIssue({code:"custom",path:["requiresConfirmation"],message:"Mutating requests must require confirmation"});
    if(tool.revisionPolicy!=="expected-revision")ctx.addIssue({code:"custom",path:["revisionPolicy"],message:"Mutating requests must require an expected Project revision"});
    if(tool.idempotency!=="stable-operation-id")ctx.addIssue({code:"custom",path:["idempotency"],message:"Mutating requests must use a stable operation id"});
  }
});
export type AgentToolDefinition=z.infer<typeof AgentToolDefinitionSchema>;

export const AgentToolCallSchema=z.object({
  id:AgentToolCallIdSchema,
  toolId:AgentToolIdSchema,
  arguments:JsonObjectSchema,
}).strict();
export type AgentToolCall=z.infer<typeof AgentToolCallSchema>;

export const AgentToolResultStatusSchema=z.enum(["success","error","cancelled"]);
export type AgentToolResultStatus=z.infer<typeof AgentToolResultStatusSchema>;

export const AgentToolResultSchema=z.object({
  callId:AgentToolCallIdSchema,
  toolId:AgentToolIdSchema,
  status:AgentToolResultStatusSchema,
  output:JsonObjectSchema.optional(),
  error:z.object({code:z.string().min(1).max(128),message:z.string().min(1).max(4_000),retryable:z.boolean()}).strict().optional(),
}).strict().superRefine((result,ctx)=>{
  if(result.status==="success"&&!result.output)ctx.addIssue({code:"custom",path:["output"],message:"Successful tool results require output"});
  if(result.status==="error"&&!result.error)ctx.addIssue({code:"custom",path:["error"],message:"Error tool results require error details"});
  if(result.status!=="error"&&result.error)ctx.addIssue({code:"custom",path:["error"],message:"Only error results may include error details"});
});
export type AgentToolResult=z.infer<typeof AgentToolResultSchema>;

export const AgentProjectTransactionProposalPayloadSchema=ProjectTransactionPayloadSchema.superRefine((payload,ctx)=>{
  payload.commands.forEach((command,index)=>{
    if(command.type==="restore-project-snapshot")ctx.addIssue({code:"custom",path:["commands",index,"type"],message:"Project snapshot replacement cannot be proposed through project-transaction."});
  });
});
export type AgentProjectTransactionProposalPayload=z.infer<typeof AgentProjectTransactionProposalPayloadSchema>;

export const AgentProposalOperationKindSchema=z.enum(["visual-plan","script-edit","scene-edit","brand-style","clip-changes","workflow-action","project-transaction","durable-job"]);
export type AgentProposalOperationKind=z.infer<typeof AgentProposalOperationKindSchema>;

export const AgentProposedOperationSchema=z.object({
  id:StableIdSchema,
  kind:AgentProposalOperationKindSchema,
  summary:z.string().min(1).max(2_000),
  payload:JsonObjectSchema,
}).strict().superRefine((operation,ctx)=>{
  if(operation.kind==="project-transaction"){
    const parsed=AgentProjectTransactionProposalPayloadSchema.safeParse(operation.payload);
    if(!parsed.success)ctx.addIssue({code:"custom",path:["payload"],message:"project-transaction payload must be a bounded Project command transaction without snapshot replacement."});
    return;
  }
  if(operation.kind==="durable-job"){
    const parsed=AgentDurableJobProposalPayloadSchema.safeParse(operation.payload);
    if(!parsed.success)ctx.addIssue({code:"custom",path:["payload"],message:"durable-job payload must use a bounded supported Job schema without application-owned authority fields."});
  }
});
export type AgentProposedOperation=z.infer<typeof AgentProposedOperationSchema>;

export const AgentProposalStatusSchema=z.enum(["draft","reviewed","applied","rejected","stale"]);
export type AgentProposalStatus=z.infer<typeof AgentProposalStatusSchema>;

export const AgentProposalSchema=z.object({
  id:AgentProposalIdSchema,
  sessionId:AgentSessionIdSchema,
  projectId:ProjectIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  title:z.string().min(1).max(240),
  summary:z.string().min(1).max(4_000),
  rationale:z.array(z.string().min(1).max(2_000)).max(32).default([]),
  operations:z.array(AgentProposedOperationSchema).min(1).max(128),
  warnings:z.array(z.string().min(1).max(2_000)).max(32).default([]),
  createdAt:z.string().datetime(),
  status:AgentProposalStatusSchema,
}).strict();
export type AgentProposal=z.infer<typeof AgentProposalSchema>;

export const AgentUsageSchema=z.object({
  inputTokens:z.number().int().nonnegative().optional(),
  outputTokens:z.number().int().nonnegative().optional(),
  totalTokens:z.number().int().nonnegative().optional(),
}).strict();
export type AgentUsage=z.infer<typeof AgentUsageSchema>;

export const AgentProviderErrorCodeSchema=z.enum(["auth","rate_limit","timeout","network","invalid_output","provider","cancelled"]);
export type AgentProviderErrorCode=z.infer<typeof AgentProviderErrorCodeSchema>;

export const AgentProviderErrorSchema=z.object({
  code:AgentProviderErrorCodeSchema,
  message:z.string().min(1).max(4_000),
  retryable:z.boolean(),
  status:z.number().int().min(100).max(599).optional(),
}).strict();
export type AgentProviderError=z.infer<typeof AgentProviderErrorSchema>;

export const AgentProviderEventSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("text-delta"),text:z.string().min(1)}).strict(),
  z.object({type:z.literal("tool-call"),call:AgentToolCallSchema}).strict(),
  z.object({type:z.literal("completed"),usage:AgentUsageSchema.optional()}).strict(),
  z.object({type:z.literal("error"),error:AgentProviderErrorSchema}).strict(),
]);
export type AgentProviderEvent=z.infer<typeof AgentProviderEventSchema>;

export const AIProviderRequestSchema=z.object({
  system:z.string().min(1).max(100_000),
  messages:z.array(AgentMessageSchema).max(1_000),
  tools:z.array(AgentToolDefinitionSchema).max(128).default([]),
  model:z.string().min(1).max(256).optional(),
  maxOutputTokens:z.number().int().positive().max(1_000_000).optional(),
}).strict();
export type AIProviderRequest=z.infer<typeof AIProviderRequestSchema>;
