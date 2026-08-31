import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createVisualPlanProposalTool,type VisualPlanGenerator} from "@/lib/ai/tools/proposal-tools";
import {createWorkflowAgentTools,type AgentWorkflowReader} from "@/lib/ai/tools/workflow-tools";
import {createAssetIntelligenceReadTool,type AgentAssetIntelligenceReader} from "@/lib/ai/tools/asset-intelligence-tools";
import {createVideoSkillAgentTools} from "@/lib/ai/tools/skill-tools";
import {createQAReportReadTool,type AgentQAReportReader} from "@/lib/ai/tools/qa-tools";
import {createC4ReadOnlyAgentTools} from "@/lib/ai/tools/shared-agent-adapter";
import type {SharedToolRegistry} from "@/lib/ai/tools/shared-registry";
import type {VideoSkillRegistry} from "@/lib/production/skills/registry";

export type A1AgentToolDependencies={
  visualPlans:VisualPlanGenerator;
  workflows?:AgentWorkflowReader;
  assetIntelligence?:AgentAssetIntelligenceReader;
  videoSkills?:VideoSkillRegistry;
  qaReports?:AgentQAReportReader;
  sharedReadRegistry?:SharedToolRegistry;
};

export function createA1AgentToolRegistry(dependencies:A1AgentToolDependencies):AgentToolRegistry{
  return new AgentToolRegistry([
    createProjectContextReadTool(),
    ...(dependencies.assetIntelligence?[createAssetIntelligenceReadTool(dependencies.assetIntelligence)]:[]),
    ...(dependencies.videoSkills?createVideoSkillAgentTools(dependencies.videoSkills):[]),
    ...(dependencies.qaReports?[createQAReportReadTool(dependencies.qaReports)]:[]),
    ...(dependencies.sharedReadRegistry?createC4ReadOnlyAgentTools(dependencies.sharedReadRegistry):[]),
    createVisualPlanProposalTool(dependencies.visualPlans),
    ...(dependencies.workflows?createWorkflowAgentTools(dependencies.workflows):[]),
  ]);
}

export * from "@/lib/ai/tools/asset-intelligence-tools";
export * from "@/lib/ai/tools/proposal-tools";
export * from "@/lib/ai/tools/qa-tools";
export * from "@/lib/ai/tools/read-tools";
export * from "@/lib/ai/tools/registry";
export * from "@/lib/ai/tools/schema";
export * from "@/lib/ai/tools/shared-agent-adapter";
export * from "@/lib/ai/tools/shared-contract";
export * from "@/lib/ai/tools/shared-read-tools";
export * from "@/lib/ai/tools/shared-registry";
export * from "@/lib/ai/tools/skill-tools";
export * from "@/lib/ai/tools/workflow-tools";
