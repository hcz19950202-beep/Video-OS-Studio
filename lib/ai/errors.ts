import {AgentProviderErrorSchema,type AgentProviderError,type AgentProviderErrorCode} from "@/lib/ai/schema";

export class AIProviderRuntimeError extends Error{
  readonly details:AgentProviderError;
  constructor(details:AgentProviderError){
    const parsed=AgentProviderErrorSchema.parse(details);
    super(parsed.message);
    this.name="AIProviderRuntimeError";
    this.details=parsed;
  }
}

export class AIProviderAbortError extends AIProviderRuntimeError{
  constructor(message="AI provider request was cancelled."){
    super({code:"cancelled",message,retryable:true});
    this.name="AIProviderAbortError";
  }
}

const isAbortLike=(error:unknown)=>error instanceof DOMException&&error.name==="AbortError";

export const normalizeAIProviderError=(error:unknown,fallbackCode:AgentProviderErrorCode="provider"):AgentProviderError=>{
  if(error instanceof AIProviderRuntimeError)return error.details;
  if(isAbortLike(error))return{code:"cancelled",message:"AI provider request was cancelled.",retryable:true};
  if(error instanceof Error)return{code:fallbackCode,message:error.message||"AI provider request failed.",retryable:fallbackCode!=="auth"&&fallbackCode!=="invalid_output"};
  return{code:fallbackCode,message:"AI provider request failed.",retryable:fallbackCode!=="auth"&&fallbackCode!=="invalid_output"};
};
