import type {AgentToolDefinition} from "@/lib/ai/schema";
import {AgentToolSafeError} from "@/lib/ai/tools/registry";
import type {RegisteredAgentTool} from "@/lib/ai/tools/schema";
import type {SharedAgentToolContract} from "@/lib/ai/tools/shared-contract";
import {SharedToolRegistry} from "@/lib/ai/tools/shared-registry";

const READ_ERROR_CODES=[
  "unknown_tool",
  "invalid_execution_context",
  "invalid_tool_arguments",
  "invalid_tool_output",
  "tool_cancelled",
  "tool_execution_failed",
  "tool_timeout",
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

const toAgentDefinition=(contract:SharedAgentToolContract):AgentToolDefinition=>({
  id:contract.toolId,
  description:contract.description,
  risk:"read",
  inputJsonSchema:structuredClone(contract.inputJsonSchema),
  revisionPolicy:contract.revisionPolicy,
  idempotency:"read-only",
  requiresConfirmation:false,
  errorCodes:[...READ_ERROR_CODES],
});

export const createC4ReadOnlyAgentTool=(registry:SharedToolRegistry,toolId:string):RegisteredAgentTool=>{
  const registered=registry.getRegisteredTool(toolId);
  if(!registered)throw new Error(`Unknown shared tool: ${toolId}`);
  assertC4ReadContract(registered.contract);

  return {
    definition:toAgentDefinition(registered.contract),
    inputSchema:registered.inputSchema,
    outputSchema:registered.outputSchema,
    handler:async(input,context)=>{
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
    },
  };
};

export const createC4ReadOnlyAgentTools=(registry:SharedToolRegistry):RegisteredAgentTool[]=>
  registry.listContracts()
    .filter(contract=>contract.riskClass==="R0")
    .map(contract=>createC4ReadOnlyAgentTool(registry,contract.toolId));
