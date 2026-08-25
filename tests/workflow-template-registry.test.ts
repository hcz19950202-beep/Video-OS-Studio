import { describe, expect, it } from "vitest";
import { createBuiltinWorkflowTemplateRegistry } from "../lib/workflows/templates";


describe("workflow template registry", () => {
  it("registers builtin workflow templates", () => {
    const registry = createBuiltinWorkflowTemplateRegistry();

    const templates = registry.list();

    expect(templates.length).toBeGreaterThan(0);
    expect(templates.map((template) => template.id)).toContain("talking-head@1");
  });

  it("retrieves templates by id", () => {
    const registry = createBuiltinWorkflowTemplateRegistry();

    const template = registry.get("product-ad@1");

    expect(template).toBeDefined();
    expect(template?.id).toBe("product-ad@1");
  });

  it("rejects invalid template definitions", () => {
    const registry = createBuiltinWorkflowTemplateRegistry();

    expect(() =>
      registry.register({
        id: "invalid-template@1",
        version: 1,
        name: "Invalid",
        stages: [
          {
            id: "render",
            name: "Render",
            dependsOn: ["missing-stage"],
          },
        ],
      }),
    ).toThrow();
  });
});
