import { validateWorkflowTemplate } from "./validator";
import type { WorkflowTemplate } from "./schema";

export class WorkflowTemplateRegistry {
  private readonly templates = new Map<string, WorkflowTemplate>();

  register(template: WorkflowTemplate): void {
    const result = validateWorkflowTemplate(template);
    if (!result.valid) {
      throw new Error(result.errors.join(", "));
    }

    this.templates.set(`${template.id}@${template.version}`, template);
  }

  get(id: string, version?: string): WorkflowTemplate | undefined {
    if (version) return this.templates.get(`${id}@${version}`);

    return [...this.templates.values()].find((template) => template.id === id);
  }

  list(): WorkflowTemplate[] {
    return [...this.templates.values()];
  }

  validate(template: WorkflowTemplate) {
    return validateWorkflowTemplate(template);
  }
}
