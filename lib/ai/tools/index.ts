import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createVisualPlanProposalTool,type VisualPlanGenerator} from "@/lib/ai/tools/proposal-tools";
import {createWorkflowAgentTools,type AgentWorkflowReader} from "@/lib/ai/tools/workflow-tools";

export type A1AgentToolDependencies={visualPlans:VisualPlanGenerator;workflows?:AgentWorkflowReader};

export function createA1AgentToolRegistry(dependencies:A1AgentToolDependencies):AgentToolRegistry{
  return new AgentToolRegistry([
    createProjectContextReadTool(),
    createVisualPlanProposalTool(dependencies.visualPlans),
    ...(dependencies.workflows?createWorkflowAgentTools(dependencies.workflows):[]),
  ]);
}

export * from "@/lib/ai/tools/proposal-tools";
export * from "@/lib/ai/tools/read-tools";
export * from "@/lib/ai/tools/registry";
export * from "@/lib/ai/tools/schema";
export * from "@/lib/ai/tools/workflow-tools";
