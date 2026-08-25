import type { WorkflowDefinitionFromTemplate } from "./builder";

/**
 * Runtime-facing shape created from a workflow template.
 * This adapter intentionally keeps template concerns isolated from
 * WorkflowRunner and WorkflowService internals.
 */
export type TemplateWorkflowInput = {
  templateId: string;
  templateVersion: string;
  stages: WorkflowDefinitionFromTemplate["stages"];
  metadata: WorkflowDefinitionFromTemplate["metadata"];
};

export function adaptTemplateWorkflowDefinition(
  definition: WorkflowDefinitionFromTemplate,
): TemplateWorkflowInput {
  return {
    templateId: definition.templateId,
    templateVersion: definition.templateVersion,
    stages: definition.stages,
    metadata: definition.metadata,
  };
}
