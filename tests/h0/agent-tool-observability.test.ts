import {describe,expect,it,vi} from "vitest";
import {z} from "zod";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {AgentToolDefinitionSchema} from "@/lib/ai/schema";

const definition=AgentToolDefinitionSchema.parse({
  id:"h0_probe",
  description:"H0 observability probe.",
  risk:"read",
  inputJsonSchema:{type:"object",properties:{},required:[],additionalProperties:false},
  revisionPolicy:"snapshot",
  idempotency:"read-only",
  requiresConfirmation:false,
  errorCodes:["tool_execution_failed"],
});

describe("V2.3.1 H0 Agent tool observability",()=>{
  it("logs only sanitized identifiers for unexpected handler failures",async()=>{
    const secret="C:\\Users\\private\\secret-provider-key.txt";
    const failure=Object.assign(new Error(secret),{code:"ENOENT"});
    const registry=new AgentToolRegistry([{
      definition,
      inputSchema:z.object({}).strict(),
      outputSchema:z.object({}).strict(),
      handler:async()=>{throw failure;},
    }]);
    const spy=vi.spyOn(console,"error").mockImplementation(()=>undefined);
    try{
      const result=await registry.execute({id:"call-h0-probe",toolId:"h0_probe",arguments:{}},{sessionId:"session-h0-probe",context:{} as never});
      expect(result).toMatchObject({status:"error",error:{code:"tool_execution_failed"}});
      expect(spy).toHaveBeenCalledTimes(1);
      const serialized=JSON.stringify(spy.mock.calls);
      expect(serialized).toContain("h0_probe");
      expect(serialized).toContain("session-h0-probe");
      expect(serialized).toContain("ENOENT");
      expect(serialized).not.toContain("private");
      expect(serialized).not.toContain("secret-provider-key");
    }finally{
      spy.mockRestore();
    }
  });
});
