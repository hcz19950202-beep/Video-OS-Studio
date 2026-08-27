import {describe,expect,it} from "vitest";
import {DeterministicA4MockProvider} from "@/lib/ai/a4-mock-provider";
import {AgentToolDefinitionSchema,type AIProviderRequest,type AgentProviderEvent} from "@/lib/ai/schema";

const proposalTool=AgentToolDefinitionSchema.parse({
  id:"propose_visual_plan",
  description:"Create a reviewable visual proposal.",
  risk:"proposal",
  inputJsonSchema:{type:"object"},
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  requiresConfirmation:false,
  errorCodes:["tool_execution_failed"],
});

const workflowTool=AgentToolDefinitionSchema.parse({
  id:"request_workflow_action",
  description:"Create a reviewable Workflow action proposal.",
  risk:"proposal",
  inputJsonSchema:{type:"object"},
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  requiresConfirmation:false,
  errorCodes:["tool_execution_failed"],
});

const firstToolId=async(content:string)=>{
  const provider=new DeterministicA4MockProvider();
  const request:AIProviderRequest={
    system:"Bounded Agent test.",
    messages:[{id:"user-1",role:"user",content,createdAt:"2026-08-27T00:00:00.000Z"}],
    tools:[workflowTool,proposalTool],
  };
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(request))events.push(event);
  return events.find(event=>event.type==="tool-call")?.call.toolId;
};

describe("DeterministicA4MockProvider routing",()=>{
  it("routes an explicit first-draft request to the Workflow proposal tool",async()=>{
    await expect(firstToolId("Create a first draft workflow proposal for this product ad.")).resolves.toBe("request_workflow_action");
  });

  it("routes stale-state re-plan language to the visual proposal tool",async()=>{
    await expect(firstToolId("The Project or Workflow state changed. Read the latest context and re-plan my previous goal as a fresh reviewable proposal. Do not execute changes directly.")).resolves.toBe("propose_visual_plan");
  });
});
