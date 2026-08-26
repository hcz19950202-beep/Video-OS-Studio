import {AgentToolDefinitionSchema} from "@/lib/ai/schema";
import {GetProjectContextInputSchema,ProjectContextToolOutputSchema,type RegisteredAgentTool} from "@/lib/ai/tools/schema";

export const GET_PROJECT_CONTEXT_TOOL_ID="get_project_context" as const;

export function createProjectContextReadTool():RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:GET_PROJECT_CONTEXT_TOOL_ID,
      description:"Read the bounded, path-safe Project and current selection context prepared for the Agent.",
      risk:"read",
      inputJsonSchema:{type:"object",properties:{},additionalProperties:false},
      revisionPolicy:"snapshot",
      idempotency:"read-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
    }),
    inputSchema:GetProjectContextInputSchema,
    outputSchema:ProjectContextToolOutputSchema,
    handler:(_input,context)=>({context:context.context}),
  };
}
