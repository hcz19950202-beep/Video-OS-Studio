import {describe,expect,it} from "vitest";
import {AgentMessageSchema,AgentProposalSchema,AgentProviderEventSchema,AgentToolDefinitionSchema,AgentToolResultSchema} from "@/lib/ai/schema";

const now="2026-08-26T00:00:00.000Z";

describe("V2.3 agent schemas",()=>{
  it("accepts normalized user messages",()=>{
    expect(AgentMessageSchema.parse({id:"m1",role:"user",content:"Improve the hook",createdAt:now}).role).toBe("user");
  });

  it("requires tool metadata only for tool messages",()=>{
    expect(()=>AgentMessageSchema.parse({id:"m2",role:"tool",content:"ok",createdAt:now})).toThrow();
    expect(()=>AgentMessageSchema.parse({id:"m3",role:"assistant",content:"ok",createdAt:now,toolCallId:"call_1",toolName:"get_project_context"})).toThrow();
    expect(AgentMessageSchema.parse({id:"m4",role:"tool",content:"ok",createdAt:now,toolCallId:"call_1",toolName:"get_project_context"}).toolName).toBe("get_project_context");
  });

  it("enforces confirmation semantics from tool risk",()=>{
    expect(()=>AgentToolDefinitionSchema.parse({id:"get_project_context",description:"Read project context",risk:"read",inputJsonSchema:{type:"object"},requiresConfirmation:true})).toThrow();
    expect(()=>AgentToolDefinitionSchema.parse({id:"request_render",description:"Request a render",risk:"mutating-request",inputJsonSchema:{type:"object"},requiresConfirmation:false})).toThrow();
    expect(AgentToolDefinitionSchema.parse({id:"propose_visual_plan",description:"Produce a visual-plan proposal",risk:"proposal",inputJsonSchema:{type:"object"},requiresConfirmation:false}).risk).toBe("proposal");
  });

  it("requires successful tool results to include structured output",()=>{
    expect(()=>AgentToolResultSchema.parse({callId:"call_1",toolId:"get_project_context",status:"success"})).toThrow();
    expect(AgentToolResultSchema.parse({callId:"call_1",toolId:"get_project_context",status:"success",output:{projectId:"project-1"}}).status).toBe("success");
  });

  it("requires proposals to carry the base Project revision",()=>{
    const proposal=AgentProposalSchema.parse({
      id:"00000000-0000-4000-8000-000000000001",
      sessionId:"00000000-0000-4000-8000-000000000002",
      projectId:"project-1",
      baseProjectRevision:7,
      title:"Improve hook",
      summary:"Add one controlled hook emphasis.",
      rationale:["The current hook is visually quiet."],
      operations:[{id:"op-1",kind:"visual-plan",summary:"Add hook emphasis",payload:{sceneId:"scene-1"}}],
      warnings:[],
      createdAt:now,
      status:"draft",
    });
    expect(proposal.baseProjectRevision).toBe(7);
    expect(proposal.operations).toHaveLength(1);
  });

  it("rejects malformed provider tool-call events",()=>{
    expect(()=>AgentProviderEventSchema.parse({type:"tool-call",call:{id:"call_1",toolId:"INVALID TOOL",arguments:{}}})).toThrow();
    expect(AgentProviderEventSchema.parse({type:"completed",usage:{inputTokens:10,outputTokens:4,totalTokens:14}}).type).toBe("completed");
  });
});
