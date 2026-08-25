import { createBuiltinWorkflowTemplateRegistry } from "./index";
import type { WorkflowTemplate } from "./schema";

export type WorkflowDefinitionFromTemplate = {
  templateId: string;
  templateVersion: string;
  stages: WorkflowTemplate["stages"];
  metadata: {
    source: "template";
    templateId: string;
  };
};

export function createWorkflowDefinitionFromTemplate(
  templateId: string,
): WorkflowDefinitionFromTemplate {
  const registry = createBuiltinWorkflowTemplateRegistry();
  const template = registry.get(templateId);

  if (!template) {
    throw new Error(`Unknown workflow template: ${templateId}`);
  }

  return {
    templateId: template.id,
    templateVersion: template.version,
    stages: template.stages,
    metadata: {
      source: "template",
      templateId: template.id,
    },
  };
}
