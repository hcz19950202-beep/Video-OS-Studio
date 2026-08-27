import {z} from "zod";
import {AIProviderRequestSchema,AgentToolCallSchema,AgentToolResultSchema,type AgentProviderError,type AgentProviderEvent,type AgentUsage,type AIProviderRequest} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {OpenAIResponsesProviderConfigSchema,loadOpenAIResponsesProviderConfigFromProcessEnv,type OpenAIProviderEnvironment,type OpenAIResponsesProviderConfig,loadOpenAIResponsesProviderConfig} from "@/lib/ai/providers/openai-config";

export type OpenAIResponsesFetch=typeof fetch;

export type OpenAIResponsesProviderOptions={
  config:OpenAIResponsesProviderConfig;
  fetchImpl?:OpenAIResponsesFetch;
};

const ToolHistoryEnvelopeSchema=z.object({
  call:AgentToolCallSchema,
  result:AgentToolResultSchema,
}).strict();

const EventTypeSchema=z.object({type:z.string().min(1)}).passthrough();
const TextDeltaSchema=z.object({type:z.literal("response.output_text.delta"),delta:z.string()}).passthrough();
const FunctionCallItemSchema=z.object({
  type:z.literal("function_call"),
  call_id:z.string().min(1),
  name:z.string().min(1),
  arguments:z.string(),
}).passthrough();
const OutputItemDoneSchema=z.object({
  type:z.literal("response.output_item.done"),
  item:FunctionCallItemSchema,
}).passthrough();
const UsageSchema=z.object({
  input_tokens:z.number().int().nonnegative().optional(),
  output_tokens:z.number().int().nonnegative().optional(),
  total_tokens:z.number().int().nonnegative().optional(),
}).passthrough();
const CompletedSchema=z.object({
  type:z.literal("response.completed"),
  response:z.object({usage:UsageSchema.nullish()}).passthrough(),
}).passthrough();
const FailedSchema=z.object({type:z.literal("response.failed")}).passthrough();
const IncompleteSchema=z.object({type:z.literal("response.incomplete")}).passthrough();
const CancelledSchema=z.object({type:z.literal("response.cancelled")}).passthrough();
const ErrorEventSchema=z.object({type:z.literal("error")}).passthrough();

const MAX_SSE_EVENT_CHARACTERS=1_000_000;

const safeError=(code:AgentProviderError["code"],message:string,retryable:boolean,status?:number):AgentProviderError=>({
  code,
  message,
  retryable,
  ...(status===undefined?{}:{status}),
});

const httpError=(status:number):AgentProviderError=>{
  if(status===401||status===403)return safeError("auth","OpenAI authentication failed.",false,status);
  if(status===429)return safeError("rate_limit","OpenAI rate limit was reached.",true,status);
  if(status===408||status===504)return safeError("timeout","OpenAI request timed out.",true,status);
  if(status>=500)return safeError("provider","OpenAI service request failed.",true,status);
  if(status>=400&&status<500)return safeError("invalid_output","OpenAI rejected the provider request.",false,status);
  return safeError("provider","OpenAI request failed.",true,status);
};

const exceptionError=(error:unknown,timedOut:boolean,signal?:AbortSignal):AgentProviderError=>{
  if(timedOut)return safeError("timeout","OpenAI request timed out.",true);
  if(signal?.aborted)return safeError("cancelled","OpenAI request was cancelled.",true);
  if(error instanceof DOMException&&error.name==="AbortError")return safeError("cancelled","OpenAI request was cancelled.",true);
  if(error instanceof TypeError)return safeError("network","OpenAI network request failed.",true);
  return safeError("provider","OpenAI request failed.",true);
};

const streamError=(error:unknown,timedOut:boolean,signal?:AbortSignal):AgentProviderError=>{
  if(timedOut||signal?.aborted||(error instanceof DOMException&&error.name==="AbortError"))return exceptionError(error,timedOut,signal);
  if(error instanceof TypeError)return safeError("network","OpenAI streaming connection failed.",true);
  return safeError("invalid_output","OpenAI returned a malformed streaming response.",false);
};

const usageFrom=(usage:z.infer<typeof UsageSchema>|null|undefined):AgentUsage|undefined=>{
  if(!usage)return undefined;
  return{
    ...(usage.input_tokens===undefined?{}:{inputTokens:usage.input_tokens}),
    ...(usage.output_tokens===undefined?{}:{outputTokens:usage.output_tokens}),
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

const isOpenAIStrictCompatibleObjectSchema=(schema:Record<string,unknown>)=>{
  if(schema.type!=="object"||schema.additionalProperties!==false)return false;
  const properties=isJsonObject(schema.properties)?Object.keys(schema.properties):[];
  const required=Array.isArray(schema.required)?schema.required.filter((item):item is string=>typeof item==="string"):[];
  return properties.every(property=>required.includes(property));
};

const toOpenAIInput=(request:AIProviderRequest):Record<string,unknown>[]=>{
  const input:Record<string,unknown>[]=[];
  for(const message of request.messages){
    if(message.role==="user"||message.role==="assistant"){
      input.push({type:"message",role:message.role,content:message.content});
      continue;
    }
    let envelope:unknown;
    try{envelope=JSON.parse(message.content);}catch{throw new Error("invalid_tool_history");}
    const parsed=ToolHistoryEnvelopeSchema.safeParse(envelope);
    if(!parsed.success)throw new Error("invalid_tool_history");
    if(parsed.data.call.id!==message.toolCallId||parsed.data.call.toolId!==message.toolName||parsed.data.result.callId!==parsed.data.call.id||parsed.data.result.toolId!==parsed.data.call.toolId){
      throw new Error("invalid_tool_history");
    }
    input.push({
      type:"function_call",
      call_id:parsed.data.call.id,
      name:parsed.data.call.toolId,
      arguments:JSON.stringify(parsed.data.call.arguments),
    });
    input.push({
      type:"function_call_output",
      call_id:parsed.data.call.id,
      output:JSON.stringify(parsed.data.result),
    });
  }
  return input;
};

const toOpenAITools=(request:AIProviderRequest)=>request.tools.map(tool=>({
  type:"function" as const,
  name:tool.id,
  description:tool.description,
  parameters:tool.inputJsonSchema,
  strict:isOpenAIStrictCompatibleObjectSchema(tool.inputJsonSchema),
}));

const responseBody=(request:AIProviderRequest,config:OpenAIResponsesProviderConfig)=>({
  model:request.model??config.model,
  instructions:request.system,
  input:toOpenAIInput(request),
  tools:toOpenAITools(request),
  tool_choice:"auto",
  parallel_tool_calls:true,
  stream:true,
  store:false,
  ...(request.maxOutputTokens===undefined?{}:{max_output_tokens:request.maxOutputTokens}),
});

async function* readSseData(body:ReadableStream<Uint8Array>):AsyncGenerator<unknown>{
  const reader=body.getReader();
  const decoder=new TextDecoder();
  let buffer="";
  const emitBlock=(block:string):unknown|undefined=>{
    const data=block.split("\n").filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n");
    if(!data||data==="[DONE]")return undefined;
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
    reader.releaseLock();
  }
}

export class OpenAIResponsesProvider implements AIProvider{
  readonly id="openai-responses";
  readonly #config:OpenAIResponsesProviderConfig;
  readonly #fetchImpl:OpenAIResponsesFetch;

  constructor(options:OpenAIResponsesProviderOptions){
    this.#config=OpenAIResponsesProviderConfigSchema.parse(options.config);
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
      yield{type:"error",error:safeError("invalid_output","Agent conversation history could not be converted for OpenAI.",false)};
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
      cleanup();
      yield{type:"error",error:httpError(response.status)};
      return;
    }
    if(!response.body){
      cleanup();
      yield{type:"error",error:safeError("invalid_output","OpenAI returned an empty streaming response.",true)};
      return;
    }

    const emittedCallIds=new Set<string>();
    try{
      for await(const rawEvent of readSseData(response.body)){
        const eventType=EventTypeSchema.safeParse(rawEvent);
        if(!eventType.success){
          yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed streaming event.",false)};
          return;
        }
        const type=eventType.data.type;
        if(type==="response.output_text.delta"){
          const parsed=TextDeltaSchema.safeParse(rawEvent);
          if(!parsed.success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed text event.",false)};
            return;
          }
          if(parsed.data.delta)yield{type:"text-delta",text:parsed.data.delta};
          continue;
        }
        if(type==="response.output_item.done"){
          const parsed=OutputItemDoneSchema.safeParse(rawEvent);
          if(!parsed.success)continue;
          if(emittedCallIds.has(parsed.data.item.call_id))continue;
          try{
            const call=parseToolArguments(parsed.data.item.call_id,parsed.data.item.name,parsed.data.item.arguments,allowedToolIds);
            emittedCallIds.add(call.id);
            yield{type:"tool-call",call};
          }catch{
            yield{type:"error",error:safeError("invalid_output","OpenAI returned invalid tool-call arguments.",false)};
            return;
          }
          continue;
        }
        if(type==="response.completed"){
          const parsed=CompletedSchema.safeParse(rawEvent);
          if(!parsed.success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed completion event.",false)};
            return;
          }
          yield{type:"completed",usage:usageFrom(parsed.data.response.usage)};
          return;
        }
        if(type==="response.failed"){
          if(!FailedSchema.safeParse(rawEvent).success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed failure event.",false)};
            return;
          }
          yield{type:"error",error:safeError("provider","OpenAI response generation failed.",true)};
          return;
        }
        if(type==="response.incomplete"){
          if(!IncompleteSchema.safeParse(rawEvent).success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed incomplete event.",false)};
            return;
          }
          yield{type:"error",error:safeError("invalid_output","OpenAI response generation was incomplete.",true)};
          return;
        }
        if(type==="response.cancelled"){
          if(!CancelledSchema.safeParse(rawEvent).success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed cancellation event.",false)};
            return;
          }
          yield{type:"error",error:safeError("cancelled","OpenAI response generation was cancelled.",true)};
          return;
        }
        if(type==="error"){
          if(!ErrorEventSchema.safeParse(rawEvent).success){
            yield{type:"error",error:safeError("invalid_output","OpenAI returned a malformed error event.",false)};
            return;
          }
          yield{type:"error",error:safeError("provider","OpenAI streaming request failed.",true)};
          return;
        }
      }
      yield{type:"error",error:safeError("invalid_output","OpenAI streaming response ended without a terminal event.",true)};
    }catch(error){
      yield{type:"error",error:streamError(error,timedOut,signal)};
    }finally{
      cleanup();
    }
  }
}

export const createOpenAIResponsesProvider=(config:OpenAIResponsesProviderConfig,fetchImpl?:OpenAIResponsesFetch)=>new OpenAIResponsesProvider({config,fetchImpl});

export const createOpenAIResponsesProviderFromEnv=(
  env:OpenAIProviderEnvironment=process.env,
  options:Partial<Pick<OpenAIResponsesProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:OpenAIResponsesFetch}={},
)=>{
  if(typeof window!=="undefined")throw new Error("OpenAI Responses provider is server-only.");
  const {fetchImpl,...configOverrides}=options;
  return new OpenAIResponsesProvider({config:loadOpenAIResponsesProviderConfig(env,configOverrides),fetchImpl});
};

export const createOpenAIResponsesProviderFromProcessEnv=(options:Partial<Pick<OpenAIResponsesProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:OpenAIResponsesFetch}={})=>{
  const {fetchImpl,...configOverrides}=options;
  return new OpenAIResponsesProvider({config:loadOpenAIResponsesProviderConfigFromProcessEnv(configOverrides),fetchImpl});
};
