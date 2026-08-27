import {z} from "zod";
import {AIProviderRequestSchema,AgentToolCallSchema,AgentToolResultSchema,type AgentProviderError,type AgentProviderEvent,type AgentUsage,type AIProviderRequest} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {VolcengineAgentPlanModelSchema,VolcengineAgentPlanProviderConfigSchema,loadVolcengineAgentPlanProviderConfigFromProcessEnv,type VolcengineAgentPlanEnvironment,type VolcengineAgentPlanProviderConfig,loadVolcengineAgentPlanProviderConfig} from "@/lib/ai/providers/volcengine-agent-plan-config";

export type VolcengineAgentPlanFetch=typeof fetch;

export type VolcengineAgentPlanProviderOptions={
  config:VolcengineAgentPlanProviderConfig;
  fetchImpl?:VolcengineAgentPlanFetch;
};

const ToolHistoryEnvelopeSchema=z.object({
  call:AgentToolCallSchema,
  result:AgentToolResultSchema,
}).strict();

const UsageSchema=z.object({
  prompt_tokens:z.number().int().nonnegative().optional(),
  completion_tokens:z.number().int().nonnegative().optional(),
  total_tokens:z.number().int().nonnegative().optional(),
}).passthrough();

const CompletionToolCallSchema=z.object({
  id:z.string().min(1),
  type:z.literal("function"),
  function:z.object({
    name:z.string().min(1),
    arguments:z.string(),
  }).passthrough(),
}).passthrough();

const CompletionSchema=z.object({
  choices:z.array(z.object({
    index:z.number().int().nonnegative(),
    message:z.object({
      role:z.string().optional(),
      content:z.string().nullable().optional(),
      tool_calls:z.array(CompletionToolCallSchema).nullish(),
    }).passthrough(),
    finish_reason:z.string().nullish(),
  }).passthrough()).min(1),
  usage:UsageSchema.nullish(),
}).passthrough();

const StreamChunkSchema=z.object({
  choices:z.array(z.object({
    index:z.number().int().nonnegative(),
    delta:z.object({content:z.string().nullable().optional()}).passthrough(),
    finish_reason:z.string().nullish(),
  }).passthrough()),
  usage:UsageSchema.nullish(),
}).passthrough();

const MAX_SSE_EVENT_CHARACTERS=1_000_000;
const DONE=Symbol("volcengine_agent_plan_sse_done");

const safeError=(code:AgentProviderError["code"],message:string,retryable:boolean,status?:number):AgentProviderError=>({
  code,
  message,
  retryable,
  ...(status===undefined?{}:{status}),
});

const httpError=(status:number):AgentProviderError=>{
  if(status===401||status===403)return safeError("auth","Volcengine Agent Plan authentication failed.",false,status);
  if(status===429)return safeError("rate_limit","Volcengine Agent Plan rate limit was reached.",true,status);
  if(status===408||status===504)return safeError("timeout","Volcengine Agent Plan request timed out.",true,status);
  if(status>=500)return safeError("provider","Volcengine Agent Plan service request failed.",true,status);
  if(status>=400&&status<500)return safeError("invalid_output","Volcengine Agent Plan rejected the provider request.",false,status);
  return safeError("provider","Volcengine Agent Plan request failed.",true,status);
};

const exceptionError=(error:unknown,timedOut:boolean,signal?:AbortSignal):AgentProviderError=>{
  if(timedOut)return safeError("timeout","Volcengine Agent Plan request timed out.",true);
  if(signal?.aborted)return safeError("cancelled","Volcengine Agent Plan request was cancelled.",true);
  if(error instanceof DOMException&&error.name==="AbortError")return safeError("cancelled","Volcengine Agent Plan request was cancelled.",true);
  if(error instanceof TypeError)return safeError("network","Volcengine Agent Plan network request failed.",true);
  return safeError("provider","Volcengine Agent Plan request failed.",true);
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

const toMessages=(request:AIProviderRequest):Record<string,unknown>[]=>{
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

const toTools=(request:AIProviderRequest)=>request.tools.map(tool=>({
  type:"function" as const,
  function:{
    name:tool.id,
    description:tool.description,
    parameters:tool.inputJsonSchema,
  },
}));

const responseBody=(request:AIProviderRequest,config:VolcengineAgentPlanProviderConfig)=>{
  const tools=toTools(request);
  const useStreaming=tools.length===0;
  return{
    model:VolcengineAgentPlanModelSchema.parse(request.model??config.model),
    messages:toMessages(request),
    ...(tools.length===0?{}:{tools,tool_choice:"auto" as const}),
    stream:useStreaming,
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
    reader.releaseLock();
  }
}

export class VolcengineAgentPlanProvider implements AIProvider{
  readonly id="volcengine-agent-plan";
  readonly #config:VolcengineAgentPlanProviderConfig;
  readonly #fetchImpl:VolcengineAgentPlanFetch;

  constructor(options:VolcengineAgentPlanProviderOptions){
    this.#config=VolcengineAgentPlanProviderConfigSchema.parse(options.config);
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
      yield{type:"error",error:safeError("invalid_output","Agent conversation history could not be converted for Volcengine Agent Plan.",false)};
      return;
    }

    const streaming=body.stream===true;
    let response:Response;
    try{
      response=await this.#fetchImpl(this.#config.endpoint,{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${this.#config.apiKey}`,
          "Content-Type":"application/json",
          "Accept":streaming?"text/event-stream":"application/json",
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

    if(!streaming){
      try{
        const raw=await response.json();
        const parsed=CompletionSchema.safeParse(raw);
        if(!parsed.success){
          yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned a malformed completion.",false)};
          return;
        }
        const choice=parsed.data.choices.find(item=>item.index===0)??parsed.data.choices[0];
        const finishReason=choice.finish_reason;
        if(finishReason==="length"||finishReason==="content_filter"){
          yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan response generation was incomplete.",true)};
          return;
        }
        const toolCalls=choice.message.tool_calls??[];
        if(toolCalls.length>0){
          for(const rawCall of toolCalls){
            try{
              yield{type:"tool-call",call:parseToolArguments(rawCall.id,rawCall.function.name,rawCall.function.arguments,allowedToolIds)};
            }catch{
              yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned invalid tool-call arguments.",false)};
              return;
            }
          }
        }else if(choice.message.content){
          yield{type:"text-delta",text:choice.message.content};
        }
        if(toolCalls.length===0&&!choice.message.content){
          yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned an empty completion.",false)};
          return;
        }
        yield{type:"completed",...(usageFrom(parsed.data.usage)===undefined?{}:{usage:usageFrom(parsed.data.usage)})};
      }catch(error){
        if(timedOut||signal?.aborted||(error instanceof DOMException&&error.name==="AbortError"))yield{type:"error",error:exceptionError(error,timedOut,signal)};
        else yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned invalid JSON.",false)};
      }finally{
        cleanup();
      }
      return;
    }

    if(!response.body){
      cleanup();
      yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned an empty streaming response.",true)};
      return;
    }

    let usage:AgentUsage|undefined;
    let finishReason:string|null|undefined;
    let sawText=false;
    try{
      for await(const rawEvent of readSseData(response.body)){
        if(rawEvent===DONE){
          if(finishReason&&finishReason!=="stop"){
            yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan streaming response did not finish normally.",true)};
            return;
          }
          if(!sawText){
            yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan streaming response contained no text.",false)};
            return;
          }
          yield{type:"completed",...(usage===undefined?{}:{usage})};
          return;
        }
        const parsed=StreamChunkSchema.safeParse(rawEvent);
        if(!parsed.success){
          yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned a malformed streaming event.",false)};
          return;
        }
        usage=usageFrom(parsed.data.usage)??usage;
        for(const choice of parsed.data.choices){
          if(choice.index!==0)continue;
          if(choice.delta.content){
            sawText=true;
            yield{type:"text-delta",text:choice.delta.content};
          }
          if(choice.finish_reason!==undefined&&choice.finish_reason!==null)finishReason=choice.finish_reason;
        }
      }
      yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan streaming response ended without the [DONE] terminal event.",true)};
    }catch(error){
      if(timedOut||signal?.aborted||(error instanceof DOMException&&error.name==="AbortError"))yield{type:"error",error:exceptionError(error,timedOut,signal)};
      else if(error instanceof TypeError)yield{type:"error",error:safeError("network","Volcengine Agent Plan streaming connection failed.",true)};
      else yield{type:"error",error:safeError("invalid_output","Volcengine Agent Plan returned a malformed streaming response.",false)};
    }finally{
      cleanup();
    }
  }
}

export const createVolcengineAgentPlanProvider=(config:VolcengineAgentPlanProviderConfig,fetchImpl?:VolcengineAgentPlanFetch)=>new VolcengineAgentPlanProvider({config,fetchImpl});

export const createVolcengineAgentPlanProviderFromEnv=(
  env:VolcengineAgentPlanEnvironment=process.env,
  options:Partial<Pick<VolcengineAgentPlanProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:VolcengineAgentPlanFetch}={},
)=>{
  if(typeof window!=="undefined")throw new Error("Volcengine Agent Plan provider is server-only.");
  const {fetchImpl,...configOverrides}=options;
  return new VolcengineAgentPlanProvider({config:loadVolcengineAgentPlanProviderConfig(env,configOverrides),fetchImpl});
};

export const createVolcengineAgentPlanProviderFromProcessEnv=(options:Partial<Pick<VolcengineAgentPlanProviderConfig,"endpoint"|"timeoutMs">>&{fetchImpl?:VolcengineAgentPlanFetch}={})=>{
  const {fetchImpl,...configOverrides}=options;
  return new VolcengineAgentPlanProvider({config:loadVolcengineAgentPlanProviderConfigFromProcessEnv(configOverrides),fetchImpl});
};
