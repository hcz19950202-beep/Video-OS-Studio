import {describe,expect,it} from "vitest";
import {ContextReferenceResolutionSchema,ContextReferenceSchema} from "@/lib/ai/context-reference";
import {SharedAgentToolContractSchema} from "@/lib/ai/tools/shared-contract";

const now="2026-08-31T00:00:00.000Z";
const baseReference={id:"context-1",projectId:"project-1",baseProjectRevision:12,label:"Current selection",createdAt:now};
const baseTool={
  version:"1.0.0",
  description:"Bounded application tool",
  inputJsonSchema:{type:"object"},
  outputJsonSchema:{type:"object"},
  requiredScopes:["project:read"],
  timeoutMs:5_000,
  cancellation:"not-applicable",
  audit:{eventKind:"agent.tool",recordArguments:true,sensitiveArgumentKeys:[],recordResultSummary:true},
} as const;

describe("V2.5 C0 ContextReference contract",()=>{
  it("accepts logical Project targets without machine paths",()=>{
    const clip=ContextReferenceSchema.parse({...baseReference,kind:"clip",target:{clipId:"clip-17"}});
    expect(clip.kind).toBe("clip");
    expect(clip.baseProjectRevision).toBe(12);
  });

  it("keeps transcript range identity in logical word IDs",()=>{
    const range=ContextReferenceSchema.parse({...baseReference,kind:"transcript-range",target:{startWordId:"word-10",endWordId:"word-18"}});
    expect(range.kind).toBe("transcript-range");
  });

  it("requires normalized Viewer regions to remain inside the frame",()=>{
    expect(ContextReferenceSchema.parse({...baseReference,kind:"viewer-region",target:{frame:247,x:0.1,y:0.06,width:0.38,height:0.25}}).kind).toBe("viewer-region");
    expect(()=>ContextReferenceSchema.parse({...baseReference,kind:"viewer-region",target:{frame:247,x:0.8,y:0.06,width:0.38,height:0.25}})).toThrow();
  });

  it("requires an explanation when reference resolution fails closed",()=>{
    expect(()=>ContextReferenceResolutionSchema.parse({referenceId:"context-1",status:"stale",currentProjectRevision:13})).toThrow();
    expect(ContextReferenceResolutionSchema.parse({referenceId:"context-1",status:"missing",currentProjectRevision:13,reason:"The selected Clip no longer exists."}).status).toBe("missing");
  });
});

describe("V2.5 C0 shared tool contract",()=>{
  it("locks R0 reads to automatic read-only semantics",()=>{
    const tool=SharedAgentToolContractSchema.parse({...baseTool,toolId:"read_project_summary",riskClass:"R0",approval:{defaultMode:"auto",allowSessionOverride:false},revisionPolicy:"snapshot",idempotency:"read-only"});
    expect(tool.riskClass).toBe("R0");
    expect(()=>SharedAgentToolContractSchema.parse({...baseTool,toolId:"read_project_summary",riskClass:"R0",approval:{defaultMode:"ask",allowSessionOverride:false},revisionPolicy:"snapshot",idempotency:"read-only"})).toThrow();
  });

  it("requires R2 mutations to ask by default and carry revision/idempotency guards",()=>{
    expect(SharedAgentToolContractSchema.parse({...baseTool,toolId:"apply_safe_edit",riskClass:"R2",requiredScopes:["project:write"],approval:{defaultMode:"ask",allowSessionOverride:true},revisionPolicy:"expected-revision",idempotency:"stable-operation-id",cancellation:"request-scoped"}).riskClass).toBe("R2");
    expect(()=>SharedAgentToolContractSchema.parse({...baseTool,toolId:"apply_safe_edit",riskClass:"R2",requiredScopes:["project:write"],approval:{defaultMode:"auto",allowSessionOverride:true},revisionPolicy:"expected-revision",idempotency:"stable-operation-id"})).toThrow();
    expect(()=>SharedAgentToolContractSchema.parse({...baseTool,toolId:"apply_safe_edit",riskClass:"R2",requiredScopes:["project:write"],approval:{defaultMode:"ask",allowSessionOverride:true},revisionPolicy:"snapshot",idempotency:"stable-operation-id"})).toThrow();
  });

  it("prevents R4 policy from being weakened by a session override",()=>{
    expect(SharedAgentToolContractSchema.parse({...baseTool,toolId:"delete_protected_edit",riskClass:"R4",requiredScopes:["project:write"],approval:{defaultMode:"always-ask",allowSessionOverride:false},revisionPolicy:"expected-revision",idempotency:"stable-operation-id"}).riskClass).toBe("R4");
    expect(()=>SharedAgentToolContractSchema.parse({...baseTool,toolId:"delete_protected_edit",riskClass:"R4",requiredScopes:["project:write"],approval:{defaultMode:"always-ask",allowSessionOverride:true},revisionPolicy:"expected-revision",idempotency:"stable-operation-id"})).toThrow();
  });
});
