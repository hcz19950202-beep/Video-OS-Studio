import {AgentToolCallSchema,AgentToolDefinitionSchema,AgentToolResultSchema,type AgentToolCall,type AgentToolDefinition,type AgentToolResult} from "@/lib/ai/schema";
import type {AgentToolExecutionContext,RegisteredAgentTool} from "@/lib/ai/tools/schema";

const errorResult=(call:AgentToolCall,code:string,message:string,retryable=false):AgentToolResult=>AgentToolResultSchema.parse({callId:call.id,toolId:call.toolId,status:"error",error:{code,message,retryable}});
const safeUnexpectedErrorCode=(error:unknown)=>{const code=error&&typeof error==="object"&&"code" in error?(error as {code?:unknown}).code:undefined;return typeof code==="string"&&/^[A-Za-z0-9_-]{1,64}$/.test(code)?code:undefined;};

export class AgentToolSafeError extends Error{
  constructor(readonly code:string,message:string,readonly retryable=false){super(message);this.name="AgentToolSafeError";}
}

export class AgentToolRegistry{
  private readonly tools:Map<string,RegisteredAgentTool>;

  constructor(tools:readonly RegisteredAgentTool[]){
    this.tools=new Map();
    for(const tool of tools){
      const definition=AgentToolDefinitionSchema.parse(tool.definition);
      if(this.tools.has(definition.id))throw new Error(`Duplicate Agent tool id: ${definition.id}`);
      this.tools.set(definition.id,{...tool,definition});
    }
  }

  listDefinitions():AgentToolDefinition[]{
    return [...this.tools.values()].map(tool=>structuredClone(tool.definition)).sort((a,b)=>a.id.localeCompare(b.id));
  }

  getDefinition(toolId:string):AgentToolDefinition|undefined{
    const tool=this.tools.get(toolId);
    return tool?structuredClone(tool.definition):undefined;
  }

  async execute(callInput:AgentToolCall,context:AgentToolExecutionContext):Promise<AgentToolResult>{
    const call=AgentToolCallSchema.parse(callInput);
    const tool=this.tools.get(call.toolId);
    if(!tool)return errorResult(call,"unknown_tool",`Unknown Agent tool: ${call.toolId}`);

    const input=tool.inputSchema.safeParse(call.arguments);
    if(!input.success)return errorResult(call,"invalid_tool_arguments",`Invalid arguments for Agent tool ${call.toolId}.`);

    try{
      const rawOutput=await tool.handler(input.data,context);
      const output=tool.outputSchema.safeParse(rawOutput);
      if(!output.success)return errorResult(call,"invalid_tool_output",`Agent tool ${call.toolId} returned invalid output.`);
      return AgentToolResultSchema.parse({callId:call.id,toolId:call.toolId,status:"success",output:output.data});
    }catch(error){
      if(error instanceof AgentToolSafeError)return errorResult(call,error.code,error.message,error.retryable);
      console.error("[video-os][agent-tool] unexpected tool failure",{
        toolId:call.toolId,
        sessionId:context.sessionId,
        errorType:error instanceof Error?error.name:typeof error,
        errorCode:safeUnexpectedErrorCode(error),
      });
      return errorResult(call,"tool_execution_failed",`Agent tool ${call.toolId} failed without exposing internal runtime details.`);
    }
  }
}
