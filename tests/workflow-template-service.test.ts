import { describe, expect, it } from "vitest";

import { WorkflowTemplateService } from "../lib/workflows/templates/service";

describe("WorkflowTemplateService", () => {
  it("lists builtin workflow templates", () => {
    const service = new WorkflowTemplateService();

    expect(service.listTemplates().map((template) => template.id)).toEqual([
      "talking-head",
      "product-ad",
      "explainer",
    ]);
  });

  it("gets a template by id", () => {
    const service = new WorkflowTemplateService();

    expect(service.getTemplate("product-ad")?.id).toBe("product-ad");
  });

  it("creates a workflow definition from a template", () => {
    const service = new WorkflowTemplateService();
    const definition = service.createWorkflowDefinition("talking-head");

    expect(definition.templateId).toBe("talking-head");
    expect(definition.metadata.source).toBe("template");
    expect(definition.stages.length).toBeGreaterThan(0);
  });

  it("keeps unknown templates isolated", () => {
    const service = new WorkflowTemplateService();

    expect(() => service.createWorkflowDefinition("missing-template")).toThrow();
  });
});
