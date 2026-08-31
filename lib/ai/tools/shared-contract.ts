import {z} from "zod";
import {AgentToolIdSchema,AgentToolIdempotencySchema,AgentToolRevisionPolicySchema} from "@/lib/ai/schema";

const JsonObjectSchema=z.record(z.string(),z.unknown());

export const SharedToolRiskClassSchema=z.enum(["R0","R1","R2","R3","R4"]);
export type SharedToolRiskClass=z.infer<typeof SharedToolRiskClassSchema>;

export const SharedToolScopeSchema=z.enum([
  "project:read",
  "project:propose",
  "project:write",
  "asset:read",
  "mission:read",
  "mission:control",
  "workflow:read",
  "workflow:control",
  "job:control",
  "qa:read",
  "qa:control",
  "campaign:read",
]);
export type SharedToolScope=z.infer<typeof SharedToolScopeSchema>;

export const SharedToolApprovalModeSchema=z.enum(["auto","ask","always-ask","deny"]);
export type SharedToolApprovalMode=z.infer<typeof SharedToolApprovalModeSchema>;

export const SharedToolCancellationSchema=z.enum(["not-applicable","request-scoped","durable-operation"]);
export type SharedToolCancellation=z.infer<typeof SharedToolCancellationSchema>;

export const SharedAgentToolContractSchema=z.object({
  toolId:AgentToolIdSchema,
  version:z.string().regex(/^\d+\.\d+\.\d+$/,"Tool contract version must use major.minor.patch"),
  description:z.string().min(1).max(2_000),
  inputJsonSchema:JsonObjectSchema,
  outputJsonSchema:JsonObjectSchema,
  riskClass:SharedToolRiskClassSchema,
  requiredScopes:z.array(SharedToolScopeSchema).min(1).max(16),
  approval:z.object({
    defaultMode:SharedToolApprovalModeSchema,
    allowSessionOverride:z.boolean(),
  }).strict(),
  revisionPolicy:AgentToolRevisionPolicySchema,
  idempotency:AgentToolIdempotencySchema,
  timeoutMs:z.number().int().min(100).max(30_000),
  cancellation:SharedToolCancellationSchema,
  audit:z.object({
    eventKind:z.string().min(1).max(128).regex(/^[a-z][a-z0-9_.-]*$/),
    recordArguments:z.boolean(),
    sensitiveArgumentKeys:z.array(z.string().min(1).max(128)).max(32),
    recordResultSummary:z.boolean(),
  }).strict(),
}).strict().superRefine((tool,ctx)=>{
  if((tool.riskClass==="R0"||tool.riskClass==="R1")&&tool.approval.defaultMode!=="auto"){
    ctx.addIssue({code:"custom",path:["approval","defaultMode"],message:"R0/R1 tools default to automatic application-owned execution"});
  }
  if((tool.riskClass==="R2"||tool.riskClass==="R3")&&tool.approval.defaultMode!=="ask"){
    ctx.addIssue({code:"custom",path:["approval","defaultMode"],message:"R2/R3 tools default to Ask"});
  }
  if(tool.riskClass==="R4"&&tool.approval.defaultMode!=="always-ask"&&tool.approval.defaultMode!=="deny"){
    ctx.addIssue({code:"custom",path:["approval","defaultMode"],message:"R4 tools must default to Always Ask or Deny"});
  }
  if(tool.riskClass==="R0"&&tool.idempotency!=="read-only"){
    ctx.addIssue({code:"custom",path:["idempotency"],message:"R0 tools must be read-only"});
  }
  if(tool.riskClass==="R1"){
    if(tool.revisionPolicy!=="snapshot")ctx.addIssue({code:"custom",path:["revisionPolicy"],message:"R1 Proposal tools must bind to the captured Project snapshot revision"});
    if(tool.idempotency!=="proposal-only")ctx.addIssue({code:"custom",path:["idempotency"],message:"R1 Proposal tools must be proposal-only"});
    if(tool.requiredScopes.includes("project:write"))ctx.addIssue({code:"custom",path:["requiredScopes"],message:"R1 Proposal tools cannot receive project:write scope"});
  }
  if(tool.riskClass==="R2"){
    if(tool.revisionPolicy!=="expected-revision")ctx.addIssue({code:"custom",path:["revisionPolicy"],message:"R2 Project mutations require expected revision semantics"});
    if(tool.idempotency!=="stable-operation-id")ctx.addIssue({code:"custom",path:["idempotency"],message:"R2 Project mutations require a stable operation id"});
  }
  if((tool.riskClass==="R3"||tool.riskClass==="R4")&&tool.idempotency!=="stable-operation-id"){
    ctx.addIssue({code:"custom",path:["idempotency"],message:"R3/R4 operations require a stable operation id"});
  }
  if(tool.approval.defaultMode==="always-ask"&&tool.approval.allowSessionOverride){
    ctx.addIssue({code:"custom",path:["approval","allowSessionOverride"],message:"Always Ask cannot be weakened by a session override"});
  }
  if(tool.approval.defaultMode==="deny"&&tool.approval.allowSessionOverride){
    ctx.addIssue({code:"custom",path:["approval","allowSessionOverride"],message:"Denied tools cannot be enabled by a session override"});
  }
});
export type SharedAgentToolContract=z.infer<typeof SharedAgentToolContractSchema>;
