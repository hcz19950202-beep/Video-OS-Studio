import {describe,expect,it} from "vitest";
import {AgentMessageSchema,AgentProposalSchema,AgentProviderEventSchema,AgentToolDefinitionSchema,AgentToolResultSchema} from "@/lib/ai/schema";

const now="2026-08-26T00:00:00.000Z";
const commonTool={inputJsonSchema:{type:"object"},errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"]};

describe("V2.3 agent schemas",()=>{
  it("accepts normalized user messages",()=>{
    expect(AgentMessageSchema.parse({id:"m1",role:"user",content:"Improve the hook",createdAt:now}).role).toBe("user");
  });

  it("requires tool metadata only for tool messages",()=>{
    expect(()=>AgentMessageSchema.parse({id:"m2",role:"tool",content:"ok",createdAt:now})).toThrow();
    expect(()=>AgentMessageSchema.parse({id:"m3",role:"assistant",content:"ok",createdAt:now,toolCallId:"call_1",toolName:"get_project_context"})).toThrow();
    expect(AgentMessageSchema.parse({id:"m4",role:"tool",content:"ok",createdAt:now,toolCallId:"call_1",toolName:"get_project_context"}).toolName).toBe("get_project_context");
  });

  it("enforces confirmation, revision and idempotency semantics from tool risk",()=>{
    expect(()=>AgentToolDefinitionSchema.parse({...commonTool,id:"get_project_context",description:"Read project context",risk:"read",revisionPolicy:"snapshot",idempotency:"read-only",requiresConfirmation:true})).toThrow();
    expect(()=>AgentToolDefinitionSchema.parse({...commonTool,id:"propose_visual_plan",description:"Produce a visual-plan proposal",risk:"proposal",revisionPolicy:"none",idempotency:"proposal-only",requiresConfirmation:false})).toThrow();
    expect(()=>AgentToolDefinitionSchema.parse({...commonTool,id:"request_render",description:"Request a render",risk:"mutating-request",revisionPolicy:"expected-revision",idempotency:"stable-operation-id",requiresConfirmation:false})).toThrow();
    expect(()=>AgentToolDefinitionSchema.parse({...commonTool,id:"request_render",description:"Request a render",risk:"mutating-request",revisionPolicy:"expected-revision",idempotency:"proposal-only",requiresConfirmation:true})).toThrow();
    const proposal=AgentToolDefinitionSchema.parse({...commonTool,id:"propose_visual_plan",description:"Produce a visual-plan proposal",risk:"proposal",revisionPolicy:"snapshot",idempotency:"proposal-only",requiresConfirmation:false});
    expect(proposal.risk).toBe("proposal");
    expect(proposal.revisionPolicy).toBe("snapshot");
    expect(proposal.idempotency).toBe("proposal-only");
  });

  it("requires a declared tool error contract",()=>{
    expect(()=>AgentToolDefinitionSchema.parse({id:"get_project_context",description:"Read project context",risk:"read",inputJsonSchema:{type:"object"},revisionPolicy:"snapshot",idempotency:"read-only",requiresConfirmation:false,errorCodes:[]})).toThrow();
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
