import { describe, expect, it } from "vitest";
import { createWorkflowDefinitionFromTemplate } from "../lib/workflows/templates/builder";
import { adaptTemplateWorkflowDefinition } from "../lib/workflows/templates/adapter";

describe("workflow template integration boundary", () => {
  it("converts template definitions into runtime-facing workflow input", () => {
    const definition = createWorkflowDefinitionFromTemplate("talking-head");
    const runtimeInput = adaptTemplateWorkflowDefinition(definition);

    expect(runtimeInput.templateId).toBe("talking-head");
    expect(runtimeInput.metadata.source).toBe("template");
    expect(runtimeInput.stages.length).toBeGreaterThan(0);
  });

  it("preserves template version metadata", () => {
    const definition = createWorkflowDefinitionFromTemplate("product-ad");
    const runtimeInput = adaptTemplateWorkflowDefinition(definition);

    expect(runtimeInput.templateVersion).toBeTruthy();
    expect(runtimeInput.metadata.templateId).toBe("product-ad");
  });
});
