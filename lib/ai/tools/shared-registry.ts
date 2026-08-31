import {z} from "zod";
import {
  SharedAgentToolContractSchema,
  type SharedAgentToolContract,
} from "@/lib/ai/tools/shared-contract";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import type {BoundedResolvedContextReference} from "@/lib/ai/context-reference-service";

export const SharedToolTransportSchema=z.enum(["agent","mcp"]);
export type SharedToolTransport=z.infer<typeof SharedToolTransportSchema>;

export type SharedToolExecutionContext={
  transport:SharedToolTransport;
  projectId:string;
  requestId:string;
  sessionId?:string;
  signal?:AbortSignal;
  projectContext?:AgentContextSnapshot;
  contextReferences?:ReadonlyArray<BoundedResolvedContextReference>;
};

export type RegisteredSharedTool={
  contract:SharedAgentToolContract;
  inputSchema:z.ZodType<unknown>;
  outputSchema:z.ZodType<unknown>;
  handler:(input:unknown,context:SharedToolExecutionContext)=>Promise<unknown>|unknown;
};

export type SharedToolExecutionResult=
  |{status:"success";output:Record<string,unknown>}
  |{status:"error";error:{code:string;message:string;retryable:boolean}}
  |{status:"cancelled"};

const SAFE_ERROR_CODE=/^[a-z][a-z0-9_]{0,127}$/;
const safeUnexpectedErrorCode=(error:unknown)=>{
  const code=error&&typeof error==="object"&&"code" in error?(error as {code?:unknown}).code:undefined;
  return typeof code==="string"&&SAFE_ERROR_CODE.test(code)?code:undefined;
};

export class SharedToolSafeError extends Error{
  readonly code:string;
  readonly retryable:boolean;

  constructor(code:string,message:string,retryable=false){
    super(message);
    this.name="SharedToolSafeError";
    this.code=SAFE_ERROR_CODE.test(code)?code:"shared_tool_failed";
    this.retryable=retryable;
  }
}

const errorResult=(code:string,message:string,retryable=false):SharedToolExecutionResult=>({
  status:"error",
  error:{code,message,retryable},
});

const timeoutResult=(toolId:string):SharedToolExecutionResult=>
  errorResult("tool_timeout",`Shared tool ${toolId} exceeded its execution timeout.`,true);

const raceExecution=async(
  tool:RegisteredSharedTool,
  input:unknown,
  context:SharedToolExecutionContext,
):Promise<{kind:"output";value:unknown}|{kind:"timeout"}|{kind:"cancelled"}>=>{
  let timeoutHandle:ReturnType<typeof setTimeout>|undefined;
  let removeAbortListener:undefined|(()=>void);

  const execution=Promise.resolve(tool.handler(input,context)).then(value=>({kind:"output" as const,value}));
  const timeout=new Promise<{kind:"timeout"}>(resolve=>{
    timeoutHandle=setTimeout(()=>resolve({kind:"timeout"}),tool.contract.timeoutMs);
  });
  const races:Array<Promise<{kind:"output";value:unknown}|{kind:"timeout"}|{kind:"cancelled"}>>=[execution,timeout];

  if(tool.contract.cancellation!=="not-applicable"&&context.signal){
    if(context.signal.aborted){
      if(timeoutHandle)clearTimeout(timeoutHandle);
      return {kind:"cancelled"};
    }
    races.push(new Promise<{kind:"cancelled"}>(resolve=>{
      const abort=()=>resolve({kind:"cancelled"});
      context.signal?.addEventListener("abort",abort,{once:true});
      removeAbortListener=()=>context.signal?.removeEventListener("abort",abort);
    }));
  }

  try{
    return await Promise.race(races);
  }finally{
    if(timeoutHandle)clearTimeout(timeoutHandle);
    removeAbortListener?.();
  }
};

export class SharedToolRegistry{
  private readonly tools=new Map<string,RegisteredSharedTool>();

  constructor(tools:readonly RegisteredSharedTool[]){
    for(const tool of tools){
      const contract=SharedAgentToolContractSchema.parse(tool.contract);
      if(this.tools.has(contract.toolId))throw new Error(`Duplicate shared tool id: ${contract.toolId}`);
      this.tools.set(contract.toolId,{...tool,contract});
    }
  }

  listContracts():SharedAgentToolContract[]{
    return [...this.tools.values()]
      .map(tool=>structuredClone(tool.contract))
      .sort((a,b)=>a.toolId.localeCompare(b.toolId));
  }

  getContract(toolId:string):SharedAgentToolContract|undefined{
    const tool=this.tools.get(toolId);
    return tool?structuredClone(tool.contract):undefined;
  }

  getRegisteredTool(toolId:string):RegisteredSharedTool|undefined{
    return this.tools.get(toolId);
  }

  async execute(toolId:string,input:unknown,contextInput:SharedToolExecutionContext):Promise<SharedToolExecutionResult>{
    const tool=this.tools.get(toolId);
    if(!tool)return errorResult("unknown_tool",`Unknown shared tool: ${toolId}`);

    const transport=SharedToolTransportSchema.safeParse(contextInput.transport);
    if(!transport.success||!contextInput.projectId||!contextInput.requestId){
      return errorResult("invalid_execution_context","Shared tool execution context is invalid.");
    }
    const context:SharedToolExecutionContext={...contextInput,transport:transport.data};

    if(tool.contract.cancellation!=="not-applicable"&&context.signal?.aborted)return {status:"cancelled"};

    const parsedInput=tool.inputSchema.safeParse(input);
    if(!parsedInput.success)return errorResult("invalid_tool_arguments",`Invalid arguments for shared tool ${toolId}.`);

    try{
      const raced=await raceExecution(tool,parsedInput.data,context);
      if(raced.kind==="cancelled")return {status:"cancelled"};
      if(raced.kind==="timeout")return timeoutResult(toolId);

      const parsedOutput=tool.outputSchema.safeParse(raced.value);
      if(!parsedOutput.success)return errorResult("invalid_tool_output",`Shared tool ${toolId} returned invalid output.`);
      if(!parsedOutput.data||typeof parsedOutput.data!=="object"||Array.isArray(parsedOutput.data)){
        return errorResult("invalid_tool_output",`Shared tool ${toolId} must return a JSON object.`);
      }
      return {status:"success",output:parsedOutput.data as Record<string,unknown>};
    }catch(error){
      if(error instanceof SharedToolSafeError)return errorResult(error.code,error.message,error.retryable);
      console.error("[video-os][shared-tool] unexpected tool failure",{
        toolId,
        transport:context.transport,
        requestId:context.requestId,
        errorType:error instanceof Error?error.name:typeof error,
        errorCode:safeUnexpectedErrorCode(error),
      });
      return errorResult("tool_execution_failed",`Shared tool ${toolId} failed without exposing internal runtime details.`);
    }
  }
}
