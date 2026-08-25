import type { WorkflowTemplate, WorkflowTemplateValidationResult } from "./schema";

export function validateWorkflowTemplate(
  template: WorkflowTemplate,
): WorkflowTemplateValidationResult {
  const errors: string[] = [];

  if (!template.id) errors.push("template id is required");
  if (!template.version) errors.push("template version is required");
  if (!template.name) errors.push("template name is required");
  if (!template.stages.length) errors.push("template stages are required");

  const stageIds = new Set<string>();
  for (const stage of template.stages) {
    if (stageIds.has(stage.id)) {
      errors.push(`duplicate stage: ${stage.id}`);
    }
    stageIds.add(stage.id);
  }

  for (const stage of template.stages) {
    for (const dependency of stage.dependsOn ?? []) {
      if (!stageIds.has(dependency)) {
        errors.push(`unknown dependency: ${dependency}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
