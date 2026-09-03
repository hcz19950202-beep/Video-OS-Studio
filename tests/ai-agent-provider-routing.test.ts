import {describe,expect,it} from "vitest";
import {
  AgentProviderRuntimeError,
  createAgentProviderForRuntime,
  getAgentProviderRuntimeStatus,
  getDefaultAgentProviderId,
  listAgentProviderRuntimeStatuses,
  resolveAgentProviderId,
  resolveAgentProviderModel,
  validateAgentProviderRuntimeModel,
  type AgentProviderEnvironment,
} from "@/lib/server/agent-provider-runtime";

const env=(values:Record<string,string|undefined>={}):AgentProviderEnvironment=>({NODE_ENV:"test",...values});

describe("Agent provider runtime routing",()=>{
  it("preserves Volcengine as the backward-compatible default",()=>{
    const runtime=env();
    expect(getDefaultAgentProviderId(runtime)).toBe("volcengine-agent-plan");
    const status=getAgentProviderRuntimeStatus(undefined,runtime);
    expect(status).toMatchObject({
      providerId:"volcengine-agent-plan",
      model:"ark-code-latest",
      models:["ark-code-latest"],
      configured:false,
      isDefault:true,
    });
  });

  it("normalizes supported aliases while rejecting explicit unknown providers",()=>{
    expect(resolveAgentProviderId("volcengine")).toBe("volcengine-agent-plan");
    expect(resolveAgentProviderId("OPENAI")).toBe("openai-responses");
    expect(resolveAgentProviderId("deepseek-chat")).toBe("deepseek-chat");
    expect(resolveAgentProviderId("mock")).toBe("a4-mock-provider");
    expect(()=>resolveAgentProviderId("unknown-provider")).toThrow(AgentProviderRuntimeError);
    expect(getDefaultAgentProviderId(env({VIDEO_OS_AGENT_PROVIDER:"legacy-unknown-value"}))).toBe("volcengine-agent-plan");
  });

  it("keeps explicit session provider resolution independent from the current server default",()=>{
    const runtime=env({
      VIDEO_OS_AGENT_PROVIDER:"openai",
      OPENAI_API_KEY:"openai-key",
      DEEPSEEK_API_KEY:"deepseek-key",
    });
    expect(getAgentProviderRuntimeStatus(undefined,runtime).providerId).toBe("openai-responses");
    expect(getAgentProviderRuntimeStatus("deepseek-chat",runtime)).toMatchObject({
      providerId:"deepseek-chat",
      model:"deepseek-v4-flash",
      configured:true,
    });
  });

  it("discovers configured providers with normalized default models without exposing secrets",()=>{
    const runtime=env({
      VIDEO_OS_AGENT_PROVIDER:"openai",
      OPENAI_API_KEY:"openai-secret-value",
      DEEPSEEK_API_KEY:"deepseek-secret-value",
    });
    const statuses=listAgentProviderRuntimeStatuses(runtime);
    expect(statuses.find(item=>item.providerId==="openai-responses")).toMatchObject({configured:true,isDefault:true,model:"gpt-5.6",models:["gpt-5.6"]});
    expect(statuses.find(item=>item.providerId==="deepseek-chat")).toMatchObject({configured:true,isDefault:false,model:"deepseek-v4-flash",models:["deepseek-v4-flash","deepseek-v4-pro"]});
    const serialized=JSON.stringify(statuses);
    expect(serialized).not.toContain("openai-secret-value");
    expect(serialized).not.toContain("deepseek-secret-value");
    expect(createAgentProviderForRuntime("openai",runtime).id).toBe("openai-responses");
    expect(createAgentProviderForRuntime("deepseek",runtime).id).toBe("deepseek-chat");
  });

  it("marks invalid provider model configuration unavailable",()=>{
    const runtime=env({
      OPENAI_API_KEY:"key",
      OPENAI_MODEL:"gpt-4o",
      DEEPSEEK_API_KEY:"key",
      DEEPSEEK_MODEL:"deepseek-not-supported",
    });
    expect(getAgentProviderRuntimeStatus("openai",runtime).configured).toBe(false);
    expect(getAgentProviderRuntimeStatus("deepseek",runtime).configured).toBe(false);
    expect(()=>createAgentProviderForRuntime("openai",runtime)).toThrow(AgentProviderRuntimeError);
  });

  it("limits new-session model selection to advertised models but preserves compatible durable models",()=>{
    const runtime=env({OPENAI_API_KEY:"key",OPENAI_MODEL:"gpt-5.6-sol"});
    expect(resolveAgentProviderModel("openai","gpt-5.6-sol",runtime)).toBe("gpt-5.6-sol");
    expect(()=>resolveAgentProviderModel("openai","gpt-5.6-luna",runtime)).toThrow(AgentProviderRuntimeError);
    expect(validateAgentProviderRuntimeModel("openai","gpt-5.6-luna")).toBe("gpt-5.6-luna");
    expect(createAgentProviderForRuntime("openai",runtime,"gpt-5.6-luna").id).toBe("openai-responses");
    expect(()=>validateAgentProviderRuntimeModel("openai","gpt-4o")).toThrow(AgentProviderRuntimeError);
  });

  it("constructs each configured provider without performing a network request",()=>{
    const volc=createAgentProviderForRuntime("volcengine",env({VOLCENGINE_AGENT_API_KEY:"key"}));
    const openai=createAgentProviderForRuntime("openai",env({OPENAI_API_KEY:"key",OPENAI_MODEL:"gpt-5.6"}));
    const deepseek=createAgentProviderForRuntime("deepseek",env({DEEPSEEK_API_KEY:"key",DEEPSEEK_MODEL:"deepseek-v4-pro"}));
    expect(volc.id).toBe("volcengine-agent-plan");
    expect(openai.id).toBe("openai-responses");
    expect(deepseek.id).toBe("deepseek-chat");
  });

  it("keeps the deterministic mock provider out of production selection",()=>{
    const production=env({NODE_ENV:"production",VIDEO_OS_AGENT_PROVIDER:"mock"});
    expect(getDefaultAgentProviderId(production)).toBe("volcengine-agent-plan");
    expect(getAgentProviderRuntimeStatus("mock",production)).toMatchObject({configured:false,selectable:false});
    expect(()=>createAgentProviderForRuntime("mock",production)).toThrow(AgentProviderRuntimeError);
  });
});
