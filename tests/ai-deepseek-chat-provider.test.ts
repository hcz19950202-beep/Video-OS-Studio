import {describe,expect,it} from "vitest";
import {AIProviderRequestSchema,AgentToolDefinitionSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import {loadDeepSeekChatProviderConfig} from "@/lib/ai/providers/deepseek-config";
import {DeepSeekChatProvider,type DeepSeekChatFetch} from "@/lib/ai/providers/deepseek-chat";

const now="2026-08-27T00:00:00.000Z";
const apiKey="ds-test-secret-never-persist";

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

const proposalTool=AgentToolDefinitionSchema.parse({
  id:"propose_visual_plan",
  description:"Create a reviewable visual plan proposal.",
  risk:"proposal",
  inputJsonSchema:{type:"object",properties:{intent:{type:"string"}},required:["intent"],additionalProperties:false},
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  requiresConfirmation:false,
  errorCodes:["invalid_tool_arguments"],
});

const baseRequest=()=>AIProviderRequestSchema.parse({
  system:"You are a bounded editing Agent.",
  messages:[{id:"msg-user-1",role:"user",content:"Inspect the project",createdAt:now}],
  tools:[readTool,proposalTool],
  maxOutputTokens:512,
});

const config=(overrides:Partial<ReturnType<typeof loadDeepSeekChatProviderConfig>>={})=>loadDeepSeekChatProviderConfig({
  DEEPSEEK_API_KEY:apiKey,
  DEEPSEEK_MODEL:"deepseek-v4-pro",
},{endpoint:"https://example.test/chat/completions",timeoutMs:2_000,...overrides});

const sseResponse=(events:unknown[],status=200)=>new Response(
  `${events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`,
  {status,headers:{"Content-Type":"text/event-stream"}},
);

const collect=async(provider:DeepSeekChatProvider,request=baseRequest(),signal?:AbortSignal)=>{
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(request,signal))events.push(event);
  return events;
};

describe("DeepSeek Chat production provider",()=>{
  it("requires a server runtime API key and an A3-supported DeepSeek model",()=>{
    expect(()=>loadDeepSeekChatProviderConfig({DEEPSEEK_API_KEY:"",DEEPSEEK_MODEL:"deepseek-v4-pro"})).toThrow(/DEEPSEEK_API_KEY/);
    expect(()=>loadDeepSeekChatProviderConfig({DEEPSEEK_API_KEY:apiKey,DEEPSEEK_MODEL:""})).toThrow();
    expect(()=>loadDeepSeekChatProviderConfig({DEEPSEEK_API_KEY:apiKey,DEEPSEEK_MODEL:"deepseek-chat"})).toThrow();
    expect(loadDeepSeekChatProviderConfig({DEEPSEEK_API_KEY:apiKey,DEEPSEEK_MODEL:"deepseek-v4-pro"})).toMatchObject({apiKey,model:"deepseek-v4-pro"});
  });

  it("streams text and usage while keeping credentials non-serializable",async()=>{
    const fetchImpl=(async()=>sseResponse([
      {choices:[{index:0,delta:{content:"Hello"},finish_reason:null}],usage:null},
      {choices:[{index:0,delta:{content:" world"},finish_reason:"stop"}],usage:null},
      {choices:[],usage:{prompt_tokens:8,completion_tokens:2,total_tokens:10}},
    ])) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([
      {type:"text-delta",text:"Hello"},
      {type:"text-delta",text:" world"},
      {type:"completed",usage:{inputTokens:8,outputTokens:2,totalTokens:10}},
    ]);
    expect(JSON.stringify(provider)).toBe('{"id":"deepseek-chat"}');
    expect(JSON.stringify(provider)).not.toContain(apiKey);
  });

  it("builds a non-thinking bounded request and reconstructs normalized tool history",async()=>{
    let capturedUrl="";
    let capturedInit:RequestInit|undefined;
    const fetchImpl=(async(input:URL|RequestInfo,init?:RequestInit)=>{
      capturedUrl=String(input);
      capturedInit=init;
      return sseResponse([{choices:[{index:0,delta:{},finish_reason:"stop"}],usage:null}]);
    }) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({config:config(),fetchImpl});
    const call={id:"call_context_1",toolId:"get_project_context",arguments:{}};
    const result={callId:"call_context_1",toolId:"get_project_context",status:"success" as const,output:{context:{projectId:"p"}}};
    const request=AIProviderRequestSchema.parse({
      ...baseRequest(),
      messages:[
        {id:"msg-user-1",role:"user",content:"Read context",createdAt:now},
        {id:"msg-tool-1",role:"tool",content:JSON.stringify({call,result}),createdAt:now,toolCallId:call.id,toolName:call.toolId},
        {id:"msg-assistant-1",role:"assistant",content:"I have the context.",createdAt:now},
      ],
    });

    await collect(provider,request);

    expect(capturedUrl).toBe("https://example.test/chat/completions");
    const headers=capturedInit?.headers as Record<string,string>;
    expect(headers.Authorization).toBe(`Bearer ${apiKey}`);
    const body=JSON.parse(String(capturedInit?.body)) as Record<string,unknown>;
    expect(body).toMatchObject({
      model:"deepseek-v4-pro",
      thinking:{type:"disabled"},
      stream:true,
      stream_options:{include_usage:true},
      tool_choice:"auto",
      max_tokens:512,
    });
    const messages=body.messages as Array<Record<string,unknown>>;
    expect(messages[0]).toEqual({role:"system",content:"You are a bounded editing Agent."});
    expect(messages).toContainEqual({
      role:"assistant",
      content:null,
      tool_calls:[{id:call.id,type:"function",function:{name:call.toolId,arguments:"{}"}}],
    });
    expect(messages).toContainEqual({role:"tool",tool_call_id:call.id,content:JSON.stringify(result)});
    const tools=body.tools as Array<Record<string,unknown>>;
    expect(tools).toEqual(expect.arrayContaining([
      expect.objectContaining({type:"function",function:expect.objectContaining({name:"get_project_context"})}),
      expect.objectContaining({type:"function",function:expect.objectContaining({name:"propose_visual_plan"})}),
    ]));
  });

  it("assembles streamed tool-call fragments and validates the completed arguments",async()=>{
    const fetchImpl=(async()=>sseResponse([
      {choices:[{index:0,delta:{tool_calls:[{index:0,id:"call_context_2",type:"function",function:{name:"get_project_context",arguments:"{"}}]},finish_reason:null}],usage:null},
      {choices:[{index:0,delta:{tool_calls:[{index:0,function:{arguments:"}"}}]},finish_reason:"tool_calls"}],usage:null},
      {choices:[],usage:{prompt_tokens:3,completion_tokens:1,total_tokens:4}},
    ])) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([
      {type:"tool-call",call:{id:"call_context_2",toolId:"get_project_context",arguments:{}}},
      {type:"completed",usage:{inputTokens:3,outputTokens:1,totalTokens:4}},
    ]);
  });

  it("rejects unknown tools and malformed function arguments before registry execution",async()=>{
    const unknownProvider=new DeepSeekChatProvider({
      config:config(),
      fetchImpl:(async()=>sseResponse([
        {choices:[{index:0,delta:{tool_calls:[{index:0,id:"call_shell_1",type:"function",function:{name:"shell",arguments:"{}"}}]},finish_reason:"tool_calls"}],usage:null},
      ])) as DeepSeekChatFetch,
    });
    const malformedProvider=new DeepSeekChatProvider({
      config:config(),
      fetchImpl:(async()=>sseResponse([
        {choices:[{index:0,delta:{tool_calls:[{index:0,id:"call_bad_1",type:"function",function:{name:"get_project_context",arguments:"not-json"}}]},finish_reason:"tool_calls"}],usage:null},
      ])) as DeepSeekChatFetch,
    });

    expect(await collect(unknownProvider)).toEqual([{type:"error",error:{code:"invalid_output",message:"DeepSeek returned invalid tool-call arguments.",retryable:false}}]);
    expect(await collect(malformedProvider)).toEqual([{type:"error",error:{code:"invalid_output",message:"DeepSeek returned invalid tool-call arguments.",retryable:false}}]);
  });

  it.each([
    [401,"auth",false],
    [403,"auth",false],
    [429,"rate_limit",true],
    [500,"provider",true],
  ] as const)("normalizes HTTP %i without leaking response bodies",async(status,code,retryable)=>{
    const fetchImpl=(async()=>new Response(`${apiKey} internal provider diagnostics`,{status})) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({type:"error",error:{code,retryable,status}});
    expect(JSON.stringify(events)).not.toContain(apiKey);
    expect(JSON.stringify(events)).not.toContain("diagnostics");
  });

  it("normalizes network failures without exposing thrown provider details",async()=>{
    const fetchImpl=(async()=>{throw new TypeError(`connect ECONNRESET ${apiKey}`);}) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({config:config(),fetchImpl});

    expect(await collect(provider)).toEqual([{type:"error",error:{code:"network",message:"DeepSeek network request failed.",retryable:true}}]);
  });

  it("enforces timeout and maps caller cancellation separately",async()=>{
    const blockingFetch=((_input:URL|RequestInfo,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      if(init?.signal?.aborted){reject(new DOMException("Aborted","AbortError"));return;}
      init?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true});
    })) as DeepSeekChatFetch;
    const timedOut=new DeepSeekChatProvider({config:config({timeoutMs:10}),fetchImpl:blockingFetch});
    expect(await collect(timedOut)).toEqual([{type:"error",error:{code:"timeout",message:"DeepSeek request timed out.",retryable:true}}]);

    const cancelled=new DeepSeekChatProvider({config:config({timeoutMs:2_000}),fetchImpl:blockingFetch});
    const controller=new AbortController();
    setTimeout(()=>controller.abort(),5);
    expect(await collect(cancelled,baseRequest(),controller.signal)).toEqual([{type:"error",error:{code:"cancelled",message:"DeepSeek request was cancelled.",retryable:true}}]);
  });

  it("fails closed for malformed SSE and streams without [DONE]",async()=>{
    const malformed=new DeepSeekChatProvider({
      config:config(),
      fetchImpl:(async()=>new Response("data: {not-json}\n\n",{status:200})) as DeepSeekChatFetch,
    });
    const incomplete=new DeepSeekChatProvider({
      config:config(),
      fetchImpl:(async()=>new Response(`data: ${JSON.stringify({choices:[{index:0,delta:{content:"partial"},finish_reason:"stop"}],usage:null})}\n\n`,{status:200})) as DeepSeekChatFetch,
    });

    expect(await collect(malformed)).toEqual([{type:"error",error:{code:"invalid_output",message:"DeepSeek returned a malformed streaming response.",retryable:false}}]);
    expect(await collect(incomplete)).toEqual([
      {type:"text-delta",text:"partial"},
      {type:"error",error:{code:"invalid_output",message:"DeepSeek streaming response ended without the [DONE] terminal event.",retryable:true}},
    ]);
  });
});
