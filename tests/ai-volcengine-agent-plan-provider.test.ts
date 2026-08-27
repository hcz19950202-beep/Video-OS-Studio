import {describe,expect,it} from "vitest";
import {AIProviderRequestSchema,AgentToolDefinitionSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import {loadVolcengineAgentPlanProviderConfig} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {VolcengineAgentPlanProvider,type VolcengineAgentPlanFetch} from "@/lib/ai/providers/volcengine-agent-plan";

const now="2026-08-27T00:00:00.000Z";
const apiKey="volc-test-secret-never-persist";

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

const config=(overrides:Partial<ReturnType<typeof loadVolcengineAgentPlanProviderConfig>>={})=>loadVolcengineAgentPlanProviderConfig({
  VOLCENGINE_AGENT_API_KEY:apiKey,
  VOLCENGINE_AGENT_MODEL:"ark-code-latest",
},{endpoint:"https://example.test/api/plan/v3/chat/completions",timeoutMs:2_000,...overrides});

const request=(withTools=false)=>AIProviderRequestSchema.parse({
  system:"You are a bounded editing Agent.",
  messages:[{id:"msg-user-1",role:"user",content:"Inspect the project",createdAt:now}],
  tools:withTools?[readTool]:[],
  maxOutputTokens:512,
});

const sseResponse=(events:unknown[])=>new Response(
  `${events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`,
  {status:200,headers:{"Content-Type":"text/event-stream"}},
);

const collect=async(provider:VolcengineAgentPlanProvider,input=request(),signal?:AbortSignal)=>{
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(input,signal))events.push(event);
  return events;
};

describe("Volcengine Agent Plan production provider",()=>{
  it("requires a local key and the routed ark-code-latest model",()=>{
    expect(()=>loadVolcengineAgentPlanProviderConfig({VOLCENGINE_AGENT_API_KEY:"",VOLCENGINE_AGENT_MODEL:"ark-code-latest"})).toThrow(/VOLCENGINE_AGENT_API_KEY/);
    expect(()=>loadVolcengineAgentPlanProviderConfig({VOLCENGINE_AGENT_API_KEY:apiKey,VOLCENGINE_AGENT_MODEL:"other"})).toThrow();
    expect(loadVolcengineAgentPlanProviderConfig({VOLCENGINE_AGENT_API_KEY:apiKey,VOLCENGINE_AGENT_MODEL:"ark-code-latest"})).toMatchObject({apiKey,model:"ark-code-latest"});
  });

  it("streams ordinary text while keeping the credential non-serializable",async()=>{
    let captured:RequestInit|undefined;
    const fetchImpl=(async(_input:URL|RequestInfo,init?:RequestInit)=>{
      captured=init;
      return sseResponse([
        {choices:[{index:0,delta:{content:"VIDEO_OS_"},finish_reason:null}]},
        {choices:[{index:0,delta:{content:"OK"},finish_reason:"stop"}],usage:{prompt_tokens:5,completion_tokens:2,total_tokens:7}},
      ]);
    }) as VolcengineAgentPlanFetch;
    const provider=new VolcengineAgentPlanProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([
      {type:"text-delta",text:"VIDEO_OS_"},
      {type:"text-delta",text:"OK"},
      {type:"completed",usage:{inputTokens:5,outputTokens:2,totalTokens:7}},
    ]);
    const body=JSON.parse(String(captured?.body)) as Record<string,unknown>;
    expect(body).toMatchObject({model:"ark-code-latest",stream:true,max_tokens:512});
    expect(body.tools).toBeUndefined();
    expect(JSON.stringify(provider)).toBe('{"id":"volcengine-agent-plan"}');
    expect(JSON.stringify(provider)).not.toContain(apiKey);
  });

  it("normalizes a non-stream function call when tools are exposed",async()=>{
    let captured:RequestInit|undefined;
    const fetchImpl=(async(_input:URL|RequestInfo,init?:RequestInit)=>{
      captured=init;
      return new Response(JSON.stringify({
        choices:[{
          index:0,
          finish_reason:"tool_calls",
          message:{role:"assistant",content:null,tool_calls:[{id:"call_context_1",type:"function",function:{name:"get_project_context",arguments:"{}"}}]},
        }],
        usage:{prompt_tokens:8,completion_tokens:3,total_tokens:11},
      }),{status:200,headers:{"Content-Type":"application/json"}});
    }) as VolcengineAgentPlanFetch;
    const provider=new VolcengineAgentPlanProvider({config:config(),fetchImpl});

    const events=await collect(provider,request(true));

    expect(events).toEqual([
      {type:"tool-call",call:{id:"call_context_1",toolId:"get_project_context",arguments:{}}},
      {type:"completed",usage:{inputTokens:8,outputTokens:3,totalTokens:11}},
    ]);
    const body=JSON.parse(String(captured?.body)) as Record<string,unknown>;
    expect(body).toMatchObject({model:"ark-code-latest",stream:false,tool_choice:"auto"});
    expect(Array.isArray(body.tools)).toBe(true);
  });

  it("fails closed for unknown tools and malformed arguments",async()=>{
    const make=(name:string,args:string)=>new VolcengineAgentPlanProvider({
      config:config(),
      fetchImpl:(async()=>new Response(JSON.stringify({choices:[{index:0,finish_reason:"tool_calls",message:{content:null,tool_calls:[{id:"call_bad",type:"function",function:{name,arguments:args}}]}}]}),{status:200})) as VolcengineAgentPlanFetch,
    });

    expect(await collect(make("shell","{}"),request(true))).toEqual([{type:"error",error:{code:"invalid_output",message:"Volcengine Agent Plan returned invalid tool-call arguments.",retryable:false}}]);
    expect(await collect(make("get_project_context","not-json"),request(true))).toEqual([{type:"error",error:{code:"invalid_output",message:"Volcengine Agent Plan returned invalid tool-call arguments.",retryable:false}}]);
  });

  it.each([
    [401,"auth",false],
    [403,"auth",false],
    [429,"rate_limit",true],
    [500,"provider",true],
  ] as const)("normalizes HTTP %i without leaking provider bodies",async(status,code,retryable)=>{
    const provider=new VolcengineAgentPlanProvider({
      config:config(),
      fetchImpl:(async()=>new Response(`${apiKey} internal diagnostics`,{status})) as VolcengineAgentPlanFetch,
    });
    const events=await collect(provider);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({type:"error",error:{code,retryable,status}});
    expect(JSON.stringify(events)).not.toContain(apiKey);
    expect(JSON.stringify(events)).not.toContain("diagnostics");
  });
});
