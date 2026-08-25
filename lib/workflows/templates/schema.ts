import type { WorkflowDefinition } from "../schema";

export interface WorkflowTemplateStage {
  id: string;
  dependsOn?: string[];
  executorKey?: string;
}

export interface WorkflowTemplateCheckpoint {
  id: string;
  stageIds: string[];
}

export interface WorkflowTemplateOutputProfile {
  id: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

export interface WorkflowTemplate {
  id: string;
  version: string;
  name: string;
  description: string;
  scenario: string;
  stages: WorkflowTemplateStage[];
  checkpoints?: WorkflowTemplateCheckpoint[];
  outputProfiles?: WorkflowTemplateOutputProfile[];
}

export interface WorkflowTemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export function templateToDefinition(template: WorkflowTemplate): WorkflowDefinition {
  return {
    id: `${template.id}@${template.version}`,
    stages: template.stages.map((stage) => ({
      id: stage.id,
      dependsOn: stage.dependsOn ?? [],
    })),
  } as WorkflowDefinition;
}
