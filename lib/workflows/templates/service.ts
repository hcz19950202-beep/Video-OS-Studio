import { createWorkflowDefinitionFromTemplate } from "./builder";
import { createBuiltinWorkflowTemplateRegistry } from "./index";
import type { WorkflowTemplate } from "./schema";

export class WorkflowTemplateService {
  private readonly registry = createBuiltinWorkflowTemplateRegistry();

  listTemplates(): WorkflowTemplate[] {
    return this.registry.list();
  }

  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.registry.get(templateId);
  }

  createWorkflowDefinition(templateId: string) {
    return createWorkflowDefinitionFromTemplate(templateId);
  }
}
