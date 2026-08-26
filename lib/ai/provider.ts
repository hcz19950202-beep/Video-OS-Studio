import type {AIProviderRequest,AgentProviderEvent} from "@/lib/ai/schema";

export interface AIProvider{
  readonly id:string;
  run(request:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>;
}

export type AIProviderFactory=(config?:Record<string,unknown>)=>AIProvider;
