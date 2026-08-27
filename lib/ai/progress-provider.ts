import type {AIProvider} from "@/lib/ai/provider";
import type {AgentProviderEvent,AIProviderRequest} from "@/lib/ai/schema";

export type AgentProviderProgressObserver=(event:AgentProviderEvent)=>void|Promise<void>;

const notifySafely=async(observer:AgentProviderProgressObserver,event:AgentProviderEvent)=>{
  try{await observer(event);}catch{
    // UI/progress transport failure must never change durable Agent execution.
  }
};

export class ObservedAIProvider implements AIProvider{
  readonly id:string;

  constructor(
    private readonly provider:AIProvider,
    private readonly observer:AgentProviderProgressObserver,
  ){
    this.id=provider.id;
  }

  async *run(request:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    for await(const event of this.provider.run(request,signal)){
      await notifySafely(this.observer,event);
      yield event;
    }
  }
}

export const observeAIProvider=(provider:AIProvider,observer:AgentProviderProgressObserver):AIProvider=>new ObservedAIProvider(provider,observer);
