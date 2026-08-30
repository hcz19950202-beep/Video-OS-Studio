import {z} from "zod";
import {AIProviderRequestSchema,AgentToolCallSchema,AgentToolResultSchema,type AgentProviderError,type AgentProviderEvent,type AgentUsage,type AIProviderRequest} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {DeepSeekA3ModelSchema,DeepSeekChatProviderConfigSchema,loadDeepSeekChatProviderConfigFromProcessEnv,type DeepSeekProviderEnvironment,type DeepSeekChatProviderConfig,loadDeepSeekChatProviderConfig} from "@/lib/ai/providers/deepseek-config";
import {cancelProviderResponseBody,cancelProviderStreamReader} from "@/lib/ai/providers/response-body";

export type DeepSeekChatFetch=typeof fetch;

export type DeepSeekChatProviderOptions={
  config:DeepSeekChatProviderConfig;
  fetchImpl?:DeepSeekChatFetch;
};

const ToolHistoryEnvelopeSchema=z.object({
  call:AgentToolCallSchema,
  result:AgentToolResultSchema,
}).strict();

const ToolCallDeltaSchema=z.object({
  index:z.number().int().nonnegative(),
  id:z.string().min(1).nullish(),
  type:z.literal("function").nullish(),
  function:z.object({
    name:z.string().min(1).nullish(),
    arguments:z.string().nullish(),
  }).passthrough().nullish(),
}).passthrough();
const ChoiceSchema=z.object({
  index:z.number().int().nonnegative(),
  delta:z.object({
    content:z.string().nullable().optional(),
    tool_calls:z.array(ToolCallDeltaSchema).nullish(),
  }).passthrough(),
  finish_reason:z.enum(["stop","length","content_filter","tool_calls","insufficient_system_resource"]).nullish(),
}).passthrough();
const UsageSchema=z.object({
  prompt_tokens:z.number().int().nonnegative().optional(),
  completion_tokens:z.number().int().nonnegative().optional(),
  total_tokens:z.number().int().nonnegative().optional(),
}).passthrough();
const StreamChunkSchema=z.object({
  choices:z.array(ChoiceSchema),
  usage:UsageSchema.nullish(),
}).passthrough();

const MAX_SSE_EVENT_CHARACTERS=1_000_000;
const DONE=Symbol("deepseek_sse_done");

type PendingToolCall={id?:string;name?:string;arguments:string};

const safeError=(code:AgentProviderError["code"],message:string,retryable:boolean,status?:number):AgentProviderError=>({
  code,
  message,
  retryable,
  ...(status===undefined?{}:{status}),
});

const httpError=(status:number):AgentProviderError=>{
  if(status===401||status===403)return safeError("auth","DeepSeek authentication failed.",false,status);
  if(status===429)return safeError("rate_limit","DeepSeek rate limit was reached.",true,status);
  if(status===408||status===504)return safeError("timeout","DeepSeek request timed out.",true,status);
  if(status>=500)return safeError("provider","DeepSeek service request failed.",true,status);
  if(status>=400&&status<500)return safeError("invalid_output","DeepSeek rejected the provider request.",false,status);
  return safeError("provider","DeepSeek request failed.",true,status);
};

const exceptionError=(error:unknown,timedOut:boolean,signal?:AbortSignal):AgentProviderError=>{
  if(timedOut)return safeError("timeout","DeepSeek request timed out.",true);
  if(signal?.aborted)return safeError("cancelled","DeepSeek request was cancelled.",true);
  if(error instanceof DOMException&&error.name==="AbortError")return safeError("cancelled","DeepSeek request was cancelled.",true);
  if(error instanceof TypeError)return safeError("network","DeepSeek network request failed.",true);
  return safeError("provider","DeepSeek request failed.",true);
};

const streamError=(error:unknown,timedOut:boolean,signal?:AbortSignal):AgentProviderError=>{
  if(timedOut||signal?.aborted||(error instanceof DOMException&&error.name==="AbortError"))return exceptionError(error,timedOut,signal);
  if(error instanceof TypeError)return safeError("network","DeepSeek streaming connection failed.",true);
  return safeError("invalid_output","DeepSeek returned a malformed streaming response.",false);
};

const usageFrom=(usage:z.infer<typeof UsageSchema>|null|undefined):AgentUsage|undefined=>{
  if(!usage)return undefined;
  return{
    ...(usage.prompt_tokens===undefined?{}:{inputTokens:usage.prompt_tokens}),
    ...(usage.completion_tokens===undefined?{}:{outputTokens:usage.completion_tokens}),
    ...(usage.total_tokens===undefined?{}:{totalTokens:usage.total_tokens}),
  };
};

const isJsonObject=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);

const parseToolArguments=(callId:string,name:string,rawArguments:string,allowedToolIds:Set<string>)=>{
  if(!allowedToolIds.has(name))throw new Error("unknown_tool");
  let parsed:unknown;
  try{parsed=JSON.parse(rawArguments);}catch{throw new Error("invalid_arguments_json");}
  if(!isJsonObject(parsed))throw new Error("invalid_arguments_shape");
  return AgentToolCallSchema.parse({id:callId,toolId:name,arguments:parsed});
};

const toDeepSeekMessages=(request:AIProviderRequest):Record<string,unknown>[]=>{
  const messages:Record<string,unknown>[]=[{role:"system",content:request.system}];
  for(const message of request.messages){
    if(message.role==="user"||message.role==="assistant"){
      messages.push({role:message.role,content:message.content});
      continue;
    }
    let envelope:unknown;
    try{envelope=JSON.parse(message.content);}catch{throw new Error("invalid_tool_history");}
    const parsed=ToolHistoryEnvelopeSchema.safeParse(envelope);
    if(!parsed.success)throw new Error("invalid_tool_history");
    if(parsed.data.call.id!==message.toolCallId||parsed.data.call.toolId!==message.toolName||parsed.data.result.callId!==parsed.data.call.id||parsed.data.result.toolId!==parsed.data.call.toolId){
      throw new Error("invalid_tool_history");
    }
    messages.push({
      role:"assistant",
      content:null,
      tool_calls:[{
        id:parsed.data.call.id,
        type:"function",
        function:{name:parsed.data.call.toolId,arguments:JSON.stringify(parsed.data.call.arguments)},
      }],
    });
    messages.push({role:"tool",tool_call_id:parsed.data.call.id,content:JSON.stringify(parsed.data.result)});
  }
  return messages;
};

const toDeepSeekTools=(request:AIProviderRequest)=>request.tools.map(tool=>({
  type:"function" as const,
  function:{
    name:tool.id,
    description:tool.description,
    parameters:tool.inputJsonSchema,
  },
}));

const responseBody=(request:AIProviderRequest,config:DeepSeekChatProviderConfig)=>{
  const tools=toDeepSeekTools(request);
  return{
    model:DeepSeekA3ModelSchema.parse(request.model??config.model),
    messages:toDeepSeekMessages(request),
    ...(tools.length===0?{}:{tools,tool_choice:"auto" as const}),
    thinking:{type:"disabled" as const},
    stream:true,
    stream_options:{include_usage:true},
    ...(request.maxOutputTokens===undefined?{}:{max_tokens:request.maxOutputTokens}),
  };
};

async function* readSseData(body:ReadableStream<Uint8Array>):AsyncGenerator<unknown|typeof DONE>{
  const reader=body.getReader();
  const decoder=new TextDecoder();
  let buffer="";
  const emitBlock=(block:string):unknown|typeof DONE|undefined=>{
    const data=block.split("\n").filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n");
    if(!data)return undefined;
    if(data==="[DONE]")return DONE;
    if(data.length>MAX_SSE_EVENT_CHARACTERS)throw new Error("sse_event_too_large");
    try{return JSON.parse(data);}catch{throw new Error("invalid_sse_json");}
  };
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      if(buffer.length>MAX_SSE_EVENT_CHARACTERS*2)throw new Error("sse_buffer_too_large");
      buffer=buffer.replace(/\r\n/g,"\n");
      let boundary=buffer.indexOf("\n\n");
      while(boundary>=0){
        const block=buffer.slice(0,boundary);
        buffer=buffer.slice(boundary+2);
        const event=emitBlock(block);
        if(event!==undefined)yield event;
        boundary=buffer.indexOf("\n\n");
      }
    }
    buffer+=decoder.decode();
    const trailing=buffer.trim();
    if(trailing){
      const event=emitBlock(trailing);
      if(event!==undefined)yield event;
    }
  }finally{
    await cancelProviderStreamReader(reader);
    reader.releaseLock();
  }
}

export class DeepSeekChatProvider implements AIProvider{
  readonly id="deepseek-chat";
  readonly #config:DeepSeekChatProviderConfig;
  readonly #fetchImpl:DeepSeekChatFetch;

  constructor(options:DeepSeekChatProviderOptions){
    this.#config=DeepSeekChatProviderConfigSchema.parse(options.config);
    this.#fetchImpl=options.fetchImpl??fetch;
  }

  async *run(requestInput:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    const request=AIProviderRequestSchema.parse(requestInput);
    const allowedToolIds=new Set(request.tools.map(tool=>tool.id));
    const controller=new AbortController();
    let timedOut=false;
    const onAbort=()=>controller.abort();
    if(signal?.aborted)controller.abort();
    else signal?.addEventListener("abort",onAbort,{once:true});
    const timeout=setTimeout(()=>{
      timedOut=true;
      controller.abort();
    },this.#config.timeoutMs);
    const cleanup=()=>{
      clearTimeout(timeout);
      signal?.removeEventListener("abort",onAbort);
    };

    let body:ReturnType<typeof responseBody>;
    try{body=responseBody(request,this.#config);}catch{
      cleanup();
      yield{type:"error",error:safeError("invalid_output","Agent conversation history could not be converted for DeepSeek.",false)};
      return;
    }

    let response:Response;
    try{
      response=await this.#fetchImpl(this.#config.endpoint,{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${this.#config.apiKey}`,
          "Content-Type":"application/json",
          "Accept":"text/event-stream",
        },
        body:JSON.stringify(body),
        signal:controller.signal,
      });
    }catch(error){
      cleanup();
      yield{type:"error",error:exceptionError(error,timedOut,signal)};
      return;
    }

    if(!response.ok){
      await cancelProviderResponseBody(response);
      cleanup();
      yield{type:"error",error:httpError(response.status)};
      return;
    }
    if(!response.body){
      cleanup();
      yield{type:"error",error:safeError("invalid_output","DeepSeek returned an empty streaming response.",true)};
      return;
    }

    const pendingCalls=new Map<number,PendingToolCall>();
    let usage:AgentUsage|undefined;
    let finishReason:string|null|undefined;
    try{
      for await(const rawEvent of readSseData(response.body)){
        if(rawEvent===DONE){
          if(!finishReason){
            yield{type:"error",error:safeError("invalid_output","DeepSeek streaming response ended without a finish reason.",true)};
            return;
          }
          if(finishReason==="length"||finishReason==="content_filter"){
            yield{type:"error",error:safeError("invalid_output","DeepSeek response generation was incomplete.",true)};
            return;
          }
          if(finishReason==="insufficient_system_resource"){
            yield{type:"error",error:safeError("provider","DeepSeek response generation was interrupted by provider capacity.",true)};
            return;
          }
          if(finishReason==="tool_calls"){
            for(const [,pending] of [...pendingCalls.entries()].sort(([a],[b])=>a-b)){
              if(!pending.id||!pending.name){
                yield{type:"error",error:safeError("invalid_output","DeepSeek returned an incomplete tool call.",false)};
                return;
              }
              try{
                yield{type:"tool-call",call:parseToolArguments(pending.id,pending.name,pending.arguments,allowedToolIds)};
              }catch{
                yield{type:"error",error:safeError("invalid_output","DeepSeek returned invalid tool-call arguments.",false)};
                return;
              }
            }
            if(pendingCalls.size===0){
              yield{type:"error",error:safeError("invalid_output","DeepSeek finished with tool_calls but returned no tool call.",false)};
              return;
            }
          }else if(pendingCalls.size>0){
            yield{type:"error",error:safeError("invalid_output","DeepSeek returned tool-call fragments without a tool_calls finish reason.",false)};
            return;
          }
          yield{type:"completed",...(usage===undefined?{}:{usage})};
          return;
        }

        const parsed=StreamChunkSchema.safeParse(rawEvent);
        if(!parsed.success){
          yield{type:"error",error:safeError("invalid_output","DeepSeek returned a malformed streaming event.",false)};
          return;
        }
        usage=usageFrom(parsed.data.usage)??usage;
        for(const choice of parsed.data.choices){
          if(choice.index!==0)continue;
          if(choice.delta.content)yield{type:"text-delta",text:choice.delta.content};
          for(const delta of choice.delta.tool_calls??[]){
            const pending=pendingCalls.get(delta.index)??{arguments:""};
            if(delta.id)pending.id=delta.id;
            if(delta.function?.name)pending.name=delta.function.name;
            if(delta.function?.arguments)pending.arguments+=delta.function.arguments;
            pendingCalls.set(delta.index,pending);
          }
          if(choice.finish_reason!==undefined&&choice.finish_reason!==null)finishReason=choice.finish_reason;
        }
      }
      yield{type:"error",error:safeError("invalid_output","DeepSeek streaming response ended without the [DONE] terminal event.",true)};
    }catch(error){
      yield{type:"error",error:streamError(error,timedOut,signal)};
    }finally{
      cleanup();
    }
  }
}

export const createDeepSeekChatProvider=(config:DeepSeekChatProviderConfig,fetchImpl?:DeepSeekChatFetch)=>new DeepSeekChatProvider({config,fetchImpl});

export const createDeepSeekChatProviderFromEnv=(
  env:DeepSeekProviderEnvironment=process.env,
  options:Partial<Pick<DeepSeekChatProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:DeepSeekChatFetch}={},
)=>{
  if(typeof window!=="undefined")throw new Error("DeepSeek Chat provider is server-only.");
  const {fetchImpl,...configOverrides}=options;
  return new DeepSeekChatProvider({config:loadDeepSeekChatProviderConfig(env,configOverrides),fetchImpl});
};

export const createDeepSeekChatProviderFromProcessEnv=(options:Partial<Pick<DeepSeekChatProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:DeepSeekChatFetch}={})=>{
  const {fetchImpl,...configOverrides}=options;
  return new DeepSeekChatProvider({config:loadDeepSeekChatProviderConfigFromProcessEnv(configOverrides),fetchImpl});
};
