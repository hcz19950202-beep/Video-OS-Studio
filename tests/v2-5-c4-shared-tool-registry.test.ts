import {describe,expect,it,vi} from "vitest";
import {z} from "zod";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createC4ReadOnlyAgentTool} from "@/lib/ai/tools/shared-agent-adapter";
import {
  SharedAgentToolContractSchema,
  type SharedAgentToolContract,
} from "@/lib/ai/tools/shared-contract";
import {
  SharedToolRegistry,
  SharedToolSafeError,
  type RegisteredSharedTool,
} from "@/lib/ai/tools/shared-registry";

const InputSchema=z.object({value:z.string().min(1)}).strict();
const OutputSchema=z.object({echoed:z.string(),transport:z.enum(["agent","mcp"])}).strict();

const readContract=(overrides:Partial<SharedAgentToolContract>={}):SharedAgentToolContract=>
  SharedAgentToolContractSchema.parse({
    toolId:"read_echo",
    version:"1.0.0",
    description:"Read a bounded value through the shared tool execution path.",
    inputJsonSchema:{
      type:"object",
      properties:{value:{type:"string"}},
      required:["value"],
      additionalProperties:false,
    },
    outputJsonSchema:{
      type:"object",
      properties:{echoed:{type:"string"},transport:{type:"string",enum:["agent","mcp"]}},
      required:["echoed","transport"],
      additionalProperties:false,
    },
    riskClass:"R0",
    requiredScopes:["project:read"],
    approval:{defaultMode:"auto",allowSessionOverride:false},
    revisionPolicy:"none",
    idempotency:"read-only",
    timeoutMs:1_000,
    cancellation:"request-scoped",
    audit:{
      eventKind:"tool.read_echo",
      recordArguments:false,
      sensitiveArgumentKeys:[],
      recordResultSummary:true,
    },
    ...overrides,
  });

const sharedTool=(handler:RegisteredSharedTool["handler"],contract=readContract()):RegisteredSharedTool=>({
  contract,
  inputSchema:InputSchema,
  outputSchema:OutputSchema,
  handler,
});

const agentContext={projectId:"project-c4"} as unknown as AgentContextSnapshot;

describe("V2.5 C4 SharedToolRegistry",()=>{
  it("uses the exact same registered handler for MCP and Built-in Agent read execution",async()=>{
    const handler=vi.fn((input:unknown,context:{transport:"agent"|"mcp"})=>({
      echoed:InputSchema.parse(input).value,
      transport:context.transport,
    }));
    const shared=new SharedToolRegistry([sharedTool(handler)]);

    const mcpResult=await shared.execute("read_echo",{value:"mcp-value"},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"mcp-request-1",
      sessionId:"mcp-session-1",
    });
    expect(mcpResult).toEqual({status:"success",output:{echoed:"mcp-value",transport:"mcp"}});

    const agent=new AgentToolRegistry([createC4ReadOnlyAgentTool(shared,"read_echo")]);
    const agentResult=await agent.execute(
      {id:"call-agent-1",toolId:"read_echo",arguments:{value:"agent-value"}},
      {sessionId:"agent-session-1",context:agentContext,makeId:()=>"agent-request-1"},
    );
    expect(agentResult).toMatchObject({
      status:"success",
      output:{echoed:"agent-value",transport:"agent"},
    });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[1]).toMatchObject({
      transport:"mcp",
      projectId:"project-c4",
      requestId:"mcp-request-1",
    });
    expect(handler.mock.calls[1]?.[1]).toMatchObject({
      transport:"agent",
      projectId:"project-c4",
      requestId:"agent-request-1",
    });
  });

  it("applies one input and output validation boundary independent of transport",async()=>{
    const badOutput=vi.fn(()=>({echoed:42,transport:"mcp"}));
    const shared=new SharedToolRegistry([sharedTool(badOutput)]);

    await expect(shared.execute("read_echo",{value:"ok"},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"request-output",
    })).resolves.toMatchObject({status:"error",error:{code:"invalid_tool_output"}});
    expect(badOutput).toHaveBeenCalledOnce();

    badOutput.mockClear();
    await expect(shared.execute("read_echo",{value:42},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"request-input",
    })).resolves.toMatchObject({status:"error",error:{code:"invalid_tool_arguments"}});
    expect(badOutput).not.toHaveBeenCalled();
  });

  it("cancels request-scoped reads before the handler runs",async()=>{
    const handler=vi.fn(()=>({echoed:"never",transport:"mcp"}));
    const shared=new SharedToolRegistry([sharedTool(handler)]);
    const controller=new AbortController();
    controller.abort();

    await expect(shared.execute("read_echo",{value:"cancel"},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"request-cancel",
      signal:controller.signal,
    })).resolves.toEqual({status:"cancelled"});
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns declared safe errors while hiding unexpected runtime details",async()=>{
    const safe=new SharedToolRegistry([sharedTool(()=>{
      throw new SharedToolSafeError("read_unavailable","The requested read model is unavailable.",true);
    })]);
    await expect(safe.execute("read_echo",{value:"safe"},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"request-safe",
    })).resolves.toEqual({
      status:"error",
      error:{code:"read_unavailable",message:"The requested read model is unavailable.",retryable:true},
    });

    const log=vi.spyOn(console,"error").mockImplementation(()=>undefined);
    const unexpected=new SharedToolRegistry([sharedTool(()=>{
      throw new Error("C:\\private\\project\\secret.txt provider-key=secret");
    })]);
    const result=await unexpected.execute("read_echo",{value:"unsafe"},{
      transport:"mcp",
      projectId:"project-c4",
      requestId:"request-unsafe",
    });
    expect(result).toEqual({
      status:"error",
      error:{
        code:"tool_execution_failed",
        message:"Shared tool read_echo failed without exposing internal runtime details.",
        retryable:false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("provider-key");
    log.mockRestore();
  });

  it("fails closed if C4 tries to expose a non-R0 contract through the Agent adapter",()=>{
    const contract=readContract({
      toolId:"plan_echo",
      riskClass:"R1",
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
      audit:{
        eventKind:"tool.plan_echo",
        recordArguments:false,
        sensitiveArgumentKeys:[],
        recordResultSummary:true,
      },
    });
    const shared=new SharedToolRegistry([sharedTool(()=>({echoed:"plan",transport:"agent"}),contract)]);
    expect(()=>createC4ReadOnlyAgentTool(shared,"plan_echo")).toThrow(/only R0/i);
  });
});
