import {describe,expect,it} from "vitest";
import {DeepSeekChatProvider} from "@/lib/ai/providers/deepseek-chat";
import {OpenAIResponsesProvider} from "@/lib/ai/providers/openai-responses";
import {VolcengineAgentPlanProvider} from "@/lib/ai/providers/volcengine-agent-plan";
import {AIProviderRequestSchema,AgentToolDefinitionSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";

const now="2026-08-28T00:00:00.000Z";
const request=AIProviderRequestSchema.parse({
  system:"Bounded test agent",
  messages:[{id:"user-1",role:"user",content:"test",createdAt:now}],
  tools:[],
  maxOutputTokens:64,
});
const readTool=AgentToolDefinitionSchema.parse({
  id:"get_project_context",
  description:"Read bounded Project context.",
  risk:"read",
  inputJsonSchema:{type:"object",properties:{},required:[],additionalProperties:false},
  revisionPolicy:"snapshot",
  idempotency:"read-only",
  requiresConfirmation:false,
  errorCodes:["invalid_tool_arguments"],
});

const collect=async(provider:AIProvider,input=request)=>{const events:AgentProviderEvent[]=[];for await(const event of provider.run(input))events.push(event);return events;};
const errorResponseProbe=()=>{
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
  return{response:new Response(body,{status:500}),wasCancelled:()=>cancelled};
};

describe("V2.3.1 H0 provider response hygiene",()=>{
  it.each([
    ["OpenAI",(fetchImpl:typeof fetch)=>new OpenAIResponsesProvider({config:{apiKey:"openai-test",model:"gpt-5.6",endpoint:"https://example.test/openai",timeoutMs:2_000},fetchImpl})],
    ["DeepSeek",(fetchImpl:typeof fetch)=>new DeepSeekChatProvider({config:{apiKey:"deepseek-test",model:"deepseek-v4-pro",endpoint:"https://example.test/deepseek",timeoutMs:2_000},fetchImpl})],
    ["Volcengine",(fetchImpl:typeof fetch)=>new VolcengineAgentPlanProvider({config:{apiKey:"volc-test",model:"ark-code-latest",endpoint:"https://example.test/volc",timeoutMs:2_000},fetchImpl})],
  ] as const)("cancels the %s response body before returning an HTTP error",async(_name,makeProvider)=>{
    const probe=errorResponseProbe();
    const provider=makeProvider((async()=>probe.response) as typeof fetch);
    const events=await collect(provider);
    expect(events[0]).toMatchObject({type:"error",error:{code:"provider",status:500}});
    expect(probe.wasCancelled()).toBe(true);
  });

  it("rejects an oversized Volcengine non-stream completion before JSON parsing",async()=>{
    const provider=new VolcengineAgentPlanProvider({
      config:{apiKey:"volc-test",model:"ark-code-latest",endpoint:"https://example.test/volc",timeoutMs:2_000},
      fetchImpl:(async()=>new Response("{}",{status:200,headers:{"Content-Type":"application/json","Content-Length":"2000001"}})) as typeof fetch,
    });
    const events=await collect(provider,AIProviderRequestSchema.parse({...request,tools:[readTool]}));
    expect(events).toEqual([{type:"error",error:{code:"invalid_output",message:"Volcengine Agent Plan returned an oversized completion.",retryable:false}}]);
  });
});
