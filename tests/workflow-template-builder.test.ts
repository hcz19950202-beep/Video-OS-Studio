import { describe, expect, it } from "vitest";
import { createWorkflowDefinitionFromTemplate } from "../lib/workflows/templates/builder";

describe("workflow template builder", () => {
  it("creates workflow definition from builtin template", () => {
    const definition = createWorkflowDefinitionFromTemplate("talking-head");

    expect(definition.templateId).toBe("talking-head");
    expect(definition.metadata.source).toBe("template");
    expect(definition.stages.length).toBeGreaterThan(0);
  });

  it("rejects unknown templates", () => {
    expect(() =>
      createWorkflowDefinitionFromTemplate("missing-template"),
    ).toThrow();
  });
});
