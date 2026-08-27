import {describe,expect,it} from "vitest";
import {createWorkflowAgentTools} from "@/lib/ai/tools/workflow-tools";

describe("V2.3 A5 real-model Workflow tool guidance",()=>{
  it("tells providers how to list current Project Workflows without a known Workflow ID",()=>{
    const workflows={list:async()=>[],get:async()=>null};
    const [statusTool,actionTool]=createWorkflowAgentTools(workflows);

    expect(statusTool.definition.description).toContain("empty object {}");
    expect(statusTool.definition.description).toContain("do not infer that no Workflow exists from Project context alone");
    expect(statusTool.definition.inputJsonSchema).toMatchObject({
      description:expect.stringContaining("Use {} to list Workflow runs"),
      properties:{workflowId:{description:expect.stringContaining("Omit this field")}},
    });
    expect(actionTool.definition.description).toContain("do not send workflowId");
    expect(actionTool.definition.description).toContain("call get_workflow_status first if it is unknown");
  });
});
