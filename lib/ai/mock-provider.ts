import {AIProviderAbortError} from "@/lib/ai/errors";
import type {AIProvider} from "@/lib/ai/provider";
import {AIProviderRequestSchema,AgentProviderEventSchema,type AIProviderRequest,type AgentProviderEvent} from "@/lib/ai/schema";

export type MockProviderScript=readonly AgentProviderEvent[];

export class MockAIProvider implements AIProvider{
  readonly id="mock";
  private readonly events:AgentProviderEvent[];
  readonly requests:AIProviderRequest[]=[];

  constructor(script:MockProviderScript){
    this.events=script.map(event=>AgentProviderEventSchema.parse(event));
  }

  async *run(requestInput:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    const request=AIProviderRequestSchema.parse(requestInput);
    this.requests.push(structuredClone(request));
    if(signal?.aborted)throw new AIProviderAbortError();
    for(const event of this.events){
      await Promise.resolve();
      if(signal?.aborted)throw new AIProviderAbortError();
      yield structuredClone(event);
    }
  }
}
