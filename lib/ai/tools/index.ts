import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createVisualPlanProposalTool,type VisualPlanGenerator} from "@/lib/ai/tools/proposal-tools";

export type A1AgentToolDependencies={visualPlans:VisualPlanGenerator};

export function createA1AgentToolRegistry(dependencies:A1AgentToolDependencies):AgentToolRegistry{
  return new AgentToolRegistry([
    createProjectContextReadTool(),
    createVisualPlanProposalTool(dependencies.visualPlans),
  ]);
}

export * from "@/lib/ai/tools/proposal-tools";
export * from "@/lib/ai/tools/read-tools";
export * from "@/lib/ai/tools/registry";
export * from "@/lib/ai/tools/schema";
