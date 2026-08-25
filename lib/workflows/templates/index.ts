import { WorkflowTemplateRegistry } from "./registry";
import { builtinWorkflowTemplates } from "./builtins";

export function createBuiltinWorkflowTemplateRegistry(): WorkflowTemplateRegistry {
  const registry = new WorkflowTemplateRegistry();

  for (const template of builtinWorkflowTemplates) {
    registry.register(template);
  }

  return registry;
}

export * from "./schema";
export * from "./registry";
export * from "./validator";
