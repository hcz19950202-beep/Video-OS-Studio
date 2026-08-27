import {describe,expect,it} from "vitest";
import {AIProviderRequestSchema,AgentToolDefinitionSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import {loadOpenAIResponsesProviderConfig} from "@/lib/ai/providers/openai-config";
import {OpenAIResponsesProvider,type OpenAIResponsesFetch} from "@/lib/ai/providers/openai-responses";

const now="2026-08-27T00:00:00.000Z";
const apiKey="sk-test-secret-never-persist";

const strictReadTool=AgentToolDefinitionSchema.parse({
  id:"get_project_context",
  description:"Read bounded Project context.",
  risk:"read",
  inputJsonSchema:{type:"object",properties:{},required:[],additionalProperties:false},
  revisionPolicy:"snapshot",
  idempotency:"read-only",
  requiresConfirmation:false,
  errorCodes:["invalid_tool_arguments"],
});

const optionalProposalTool=AgentToolDefinitionSchema.parse({
  id:"propose_visual_plan",
  description:"Create a reviewable visual plan proposal.",
  risk:"proposal",
  inputJsonSchema:{
    type:"object",
    properties:{
      intent:{type:"string"},
      selectedSuggestionIds:{type:"array",items:{type:"string"}},
    },
    required:["intent"],
    additionalProperties:false,
  },
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  requiresConfirmation:false,
  errorCodes:["invalid_tool_arguments"],
});

const baseRequest=()=>AIProviderRequestSchema.parse({
  system:"You are a bounded editing Agent.",
  messages:[{id:"msg-user-1",role:"user",content:"Inspect the project",createdAt:now}],
  tools:[strictReadTool,optionalProposalTool],
  maxOutputTokens:512,
});

const config=(overrides:Partial<ReturnType<typeof loadOpenAIResponsesProviderConfig>>={})=>loadOpenAIResponsesProviderConfig({
  OPENAI_API_KEY:apiKey,
  OPENAI_MODEL:"gpt-5.6",
},{endpoint:"https://example.test/v1/responses",timeoutMs:2_000,...overrides});

const sseResponse=(events:unknown[],status=200)=>new Response(
  events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join(""),
  {status,headers:{"Content-Type":"text/event-stream"}},
);

const collect=async(provider:OpenAIResponsesProvider,request=baseRequest(),signal?:AbortSignal)=>{
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(request,signal))events.push(event);
  return events;
};

describe("OpenAI Responses production provider",()=>{
  it("requires server runtime API key and model without embedding defaults",()=>{
    expect(()=>loadOpenAIResponsesProviderConfig({OPENAI_API_KEY:"",OPENAI_MODEL:"gpt-5.6"})).toThrow(/OPENAI_API_KEY/);
    expect(()=>loadOpenAIResponsesProviderConfig({OPENAI_API_KEY:apiKey,OPENAI_MODEL:""})).toThrow(/OPENAI_MODEL/);
    expect(loadOpenAIResponsesProviderConfig({OPENAI_API_KEY:apiKey,OPENAI_MODEL:"gpt-5.6"})).toMatchObject({apiKey,model:"gpt-5.6"});
  });

  it("streams text and usage while keeping provider credentials non-serializable",async()=>{
    const fetchImpl=(async()=>sseResponse([
      {type:"response.output_text.delta",delta:"Hello"},
      {type:"response.output_text.delta",delta:" world"},
      {type:"response.completed",response:{usage:{input_tokens:8,output_tokens:2,total_tokens:10}}},
    ])) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([
      {type:"text-delta",text:"Hello"},
      {type:"text-delta",text:" world"},
      {type:"completed",usage:{inputTokens:8,outputTokens:2,totalTokens:10}},
    ]);
    expect(JSON.stringify(provider)).toBe('{"id":"openai-responses"}');
    expect(JSON.stringify(provider)).not.toContain(apiKey);
  });

  it("builds a bounded Responses request and reconstructs historical function call/output items",async()=>{
    let capturedUrl="";
    let capturedInit:RequestInit|undefined;
    const fetchImpl=(async(input:URL|RequestInfo,init?:RequestInit)=>{
      capturedUrl=String(input);
      capturedInit=init;
      return sseResponse([{type:"response.completed",response:{usage:null}}]);
    }) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config(),fetchImpl});
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

    expect(capturedUrl).toBe("https://example.test/v1/responses");
    const headers=capturedInit?.headers as Record<string,string>;
    expect(headers.Authorization).toBe(`Bearer ${apiKey}`);
    const body=JSON.parse(String(capturedInit?.body)) as Record<string,unknown>;
    expect(body).toMatchObject({
      model:"gpt-5.6",
      instructions:"You are a bounded editing Agent.",
      stream:true,
      store:false,
      tool_choice:"auto",
      parallel_tool_calls:true,
      max_output_tokens:512,
    });
    const tools=body.tools as Array<Record<string,unknown>>;
    expect(tools.find(tool=>tool.name==="get_project_context")?.strict).toBe(true);
    expect(tools.find(tool=>tool.name==="propose_visual_plan")?.strict).toBe(false);
    const input=body.input as Array<Record<string,unknown>>;
    expect(input).toContainEqual({type:"function_call",call_id:call.id,name:call.toolId,arguments:"{}"});
    expect(input).toContainEqual({type:"function_call_output",call_id:call.id,output:JSON.stringify(result)});
    expect(input).toContainEqual({type:"message",role:"assistant",content:"I have the context."});
  });

  it("normalizes a completed function call from response.output_item.done and ignores the arguments-done event shape",async()=>{
    const fetchImpl=(async()=>sseResponse([
      {type:"response.output_item.added",output_index:0,item:{type:"function_call",id:"fc_1",call_id:"call_context_2",name:"get_project_context",arguments:""}},
      {type:"response.function_call_arguments.done",item_id:"fc_1",output_index:0,arguments:"{}"},
      {type:"response.output_item.done",output_index:0,item:{type:"function_call",id:"fc_1",call_id:"call_context_2",name:"get_project_context",arguments:"{}"}},
      {type:"response.completed",response:{usage:{input_tokens:3,output_tokens:1,total_tokens:4}}},
    ])) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([
      {type:"tool-call",call:{id:"call_context_2",toolId:"get_project_context",arguments:{}}},
      {type:"completed",usage:{inputTokens:3,outputTokens:1,totalTokens:4}},
    ]);
  });

  it("rejects unknown tools and malformed function arguments before they reach the Agent registry",async()=>{
    const unknownProvider=new OpenAIResponsesProvider({
      config:config(),
      fetchImpl:(async()=>sseResponse([
        {type:"response.output_item.done",output_index:0,item:{type:"function_call",id:"fc_2",call_id:"call_shell_1",name:"shell",arguments:"{}"}},
        {type:"response.completed",response:{usage:null}},
      ])) as OpenAIResponsesFetch,
    });
    const malformedProvider=new OpenAIResponsesProvider({
      config:config(),
      fetchImpl:(async()=>sseResponse([
        {type:"response.output_item.done",output_index:0,item:{type:"function_call",id:"fc_3",call_id:"call_bad_1",name:"get_project_context",arguments:"not-json"}},
      ])) as OpenAIResponsesFetch,
    });

    expect(await collect(unknownProvider)).toEqual([{type:"error",error:{code:"invalid_output",message:"OpenAI returned invalid tool-call arguments.",retryable:false}}]);
    expect(await collect(malformedProvider)).toEqual([{type:"error",error:{code:"invalid_output",message:"OpenAI returned invalid tool-call arguments.",retryable:false}}]);
  });

  it.each([
    [401,"auth",false],
    [403,"auth",false],
    [429,"rate_limit",true],
    [500,"provider",true],
  ] as const)("normalizes HTTP %i without leaking response bodies",async(status,code,retryable)=>{
    const fetchImpl=(async()=>new Response(`${apiKey} internal provider diagnostics`,{status})) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({type:"error",error:{code,retryable,status}});
    expect(JSON.stringify(events)).not.toContain(apiKey);
    expect(JSON.stringify(events)).not.toContain("diagnostics");
  });

  it("normalizes network failures without exposing the thrown error text",async()=>{
    const fetchImpl=(async()=>{throw new TypeError(`connect ECONNRESET ${apiKey}`);}) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config(),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([{type:"error",error:{code:"network",message:"OpenAI network request failed.",retryable:true}}]);
    expect(JSON.stringify(events)).not.toContain(apiKey);
  });

  it("enforces provider timeout through AbortSignal",async()=>{
    const fetchImpl=((_input:URL|RequestInfo,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      const signal=init?.signal;
      if(signal?.aborted){reject(new DOMException("Aborted","AbortError"));return;}
      signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true});
    })) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config({timeoutMs:10}),fetchImpl});

    const events=await collect(provider);

    expect(events).toEqual([{type:"error",error:{code:"timeout",message:"OpenAI request timed out.",retryable:true}}]);
  });

  it("maps caller cancellation separately from provider timeout",async()=>{
    const fetchImpl=((_input:URL|RequestInfo,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      init?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true});
    })) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({config:config({timeoutMs:2_000}),fetchImpl});
    const controller=new AbortController();
    setTimeout(()=>controller.abort(),5);

    const events=await collect(provider,baseRequest(),controller.signal);

    expect(events).toEqual([{type:"error",error:{code:"cancelled",message:"OpenAI request was cancelled.",retryable:true}}]);
  });

  it("fails closed for malformed SSE and streams that end without a terminal event",async()=>{
    const malformed=new OpenAIResponsesProvider({
      config:config(),
      fetchImpl:(async()=>new Response("data: {not-json}\n\n",{status:200})) as OpenAIResponsesFetch,
    });
    const incomplete=new OpenAIResponsesProvider({
      config:config(),
      fetchImpl:(async()=>sseResponse([{type:"response.output_text.delta",delta:"partial"}])) as OpenAIResponsesFetch,
    });

    expect(await collect(malformed)).toEqual([{type:"error",error:{code:"invalid_output",message:"OpenAI returned a malformed streaming response.",retryable:false}}]);
    expect(await collect(incomplete)).toEqual([
      {type:"text-delta",text:"partial"},
      {type:"error",error:{code:"invalid_output",message:"OpenAI streaming response ended without a terminal event.",retryable:true}},
    ]);
  });
});
