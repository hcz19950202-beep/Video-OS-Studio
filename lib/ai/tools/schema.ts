import {z} from "zod";
import {AgentContextSnapshotSchema,type AgentContextSnapshot} from "@/lib/ai/context";
import {AgentProposalSchema,type AgentToolDefinition} from "@/lib/ai/schema";

export type AgentToolExecutionContext={
  sessionId:string;
  context:AgentContextSnapshot;
  now?:()=>string;
  makeId?:()=>string;
};

export type RegisteredAgentTool={
  definition:AgentToolDefinition;
  inputSchema:z.ZodType<unknown>;
  outputSchema:z.ZodType<unknown>;
  handler:(input:unknown,context:AgentToolExecutionContext)=>Promise<unknown>|unknown;
};

export const GetProjectContextInputSchema=z.object({}).strict();

export const ProposeVisualPlanInputSchema=z.object({
  intent:z.string().min(1).max(2_000),
}).strict();

export const ProjectContextToolOutputSchema=z.object({context:AgentContextSnapshotSchema}).strict();
export const VisualPlanProposalToolOutputSchema=z.object({proposal:AgentProposalSchema}).strict();
