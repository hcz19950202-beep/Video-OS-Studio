import type {AgentToolDefinition} from "@/lib/ai/schema";
import {AgentToolSafeError} from "@/lib/ai/tools/registry";
import type {RegisteredAgentTool} from "@/lib/ai/tools/schema";
import type {SharedAgentToolContract} from "@/lib/ai/tools/shared-contract";
import {SharedToolRegistry} from "@/lib/ai/tools/shared-registry";

const SHARED_ERROR_CODES=[
  "unknown_tool",
  "invalid_execution_context",
  "invalid_tool_arguments",
  "invalid_tool_output",
  "tool_cancelled",
  "tool_execution_failed",
  "tool_timeout",
  "project_context_unavailable",
  "proposal_session_unavailable",
  "proposal_session_project_mismatch",
  "proposal_id_conflict",
] as const;

const assertC4ReadContract=(contract:SharedAgentToolContract)=>{
  if(contract.riskClass!=="R0"){
    throw new Error(`C4 Agent adapter may expose only R0 shared tools: ${contract.toolId}`);
  }
  if(contract.approval.defaultMode!=="auto"||contract.approval.allowSessionOverride){
    throw new Error(`C4 R0 shared tool must use fixed automatic read approval: ${contract.toolId}`);
  }
  if(contract.idempotency!=="read-only"){
    throw new Error(`C4 R0 shared tool must be read-only: ${contract.toolId}`);
  }
};

const assertC5ProposalContract=(contract:SharedAgentToolContract)=>{
  if(contract.riskClass!=="R1"){
    throw new Error(`C5 Agent Proposal adapter may expose only R1 shared tools: ${contract.toolId}`);
  }
  if(!contract.requiredScopes.includes("project:propose")||contract.requiredScopes.includes("project:write")){
    throw new Error(`C5 R1 shared tool must be proposal-only: ${contract.toolId}`);
  }
  if(contract.approval.defaultMode!=="auto"||contract.approval.allowSessionOverride){
    throw new Error(`C5 R1 Proposal creation must use fixed automatic execution: ${contract.toolId}`);
  }
  if(contract.revisionPolicy!=="snapshot"||contract.idempotency!=="proposal-only"){
    throw new Error(`C5 R1 shared tool must bind to a Project snapshot and remain proposal-only: ${contract.toolId}`);
  }
};

const toReadAgentDefinition=(contract:SharedAgentToolContract):AgentToolDefinition=>({
  id:contract.toolId,
  description:contract.description,
  risk:"read",
  inputJsonSchema:structuredClone(contract.inputJsonSchema),
  revisionPolicy:contract.revisionPolicy,
  idempotency:"read-only",
  requiresConfirmation:false,
  errorCodes:[...SHARED_ERROR_CODES],
});

const toProposalAgentDefinition=(contract:SharedAgentToolContract):AgentToolDefinition=>({
  id:contract.toolId,
  description:contract.description,
  risk:"proposal",
  inputJsonSchema:structuredClone(contract.inputJsonSchema),
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  requiresConfirmation:false,
  errorCodes:[...SHARED_ERROR_CODES],
});

const executeSharedAgentTool=async(
  registry:SharedToolRegistry,
  toolId:string,
  input:unknown,
  context:Parameters<RegisteredAgentTool["handler"]>[1],
)=>{
  const result=await registry.execute(toolId,input,{
    transport:"agent",
    projectId:context.context.projectId,
    requestId:context.makeId?.()??`agent:${context.sessionId}:${toolId}`,
    sessionId:context.sessionId,
    projectContext:context.context,
    contextReferences:context.contextReferences,
  });
  if(result.status==="success")return result.output;
  if(result.status==="cancelled")throw new AgentToolSafeError("tool_cancelled",`Shared tool ${toolId} was cancelled.`,true);
  throw new AgentToolSafeError(result.error.code,result.error.message,result.error.retryable);
};

export const createC4ReadOnlyAgentTool=(registry:SharedToolRegistry,toolId:string):RegisteredAgentTool=>{
  const registered=registry.getRegisteredTool(toolId);
  if(!registered)throw new Error(`Unknown shared tool: ${toolId}`);
  assertC4ReadContract(registered.contract);

  return {
    definition:toReadAgentDefinition(registered.contract),
    inputSchema:registered.inputSchema,
    outputSchema:registered.outputSchema,
    handler:(input,context)=>executeSharedAgentTool(registry,toolId,input,context),
  };
};

export const createC5ProposalAgentTool=(registry:SharedToolRegistry,toolId:string):RegisteredAgentTool=>{
  const registered=registry.getRegisteredTool(toolId);
  if(!registered)throw new Error(`Unknown shared tool: ${toolId}`);
  assertC5ProposalContract(registered.contract);

  return {
    definition:toProposalAgentDefinition(registered.contract),
    inputSchema:registered.inputSchema,
    outputSchema:registered.outputSchema,
    handler:(input,context)=>executeSharedAgentTool(registry,toolId,input,context),
  };
};

export const createC4ReadOnlyAgentTools=(registry:SharedToolRegistry):RegisteredAgentTool[]=>
  registry.listContracts()
    .filter(contract=>contract.riskClass==="R0")
    .map(contract=>createC4ReadOnlyAgentTool(registry,contract.toolId));

export const createC5SharedAgentTools=(registry:SharedToolRegistry):RegisteredAgentTool[]=>
  registry.listContracts().flatMap(contract=>{
    if(contract.riskClass==="R0")return[createC4ReadOnlyAgentTool(registry,contract.toolId)];
    if(contract.riskClass==="R1")return[createC5ProposalAgentTool(registry,contract.toolId)];
    return[];
  });
