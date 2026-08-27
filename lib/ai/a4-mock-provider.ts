import {AIProviderAbortError} from "@/lib/ai/errors";
import type {AIProvider} from "@/lib/ai/provider";
import {AIProviderRequestSchema,type AIProviderRequest,type AgentProviderEvent} from "@/lib/ai/schema";

export class DeterministicA4MockProvider implements AIProvider{
  readonly id="a4-mock-provider";

  async *run(requestInput:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    const request=AIProviderRequestSchema.parse(requestInput);
    if(signal?.aborted)throw new AIProviderAbortError();
    const last=request.messages.at(-1);
    if(last?.role==="tool"){
      yield{type:"text-delta",text:"I created a reviewable visual proposal from the current Project context."};
      yield{type:"completed",usage:{inputTokens:40,outputTokens:12,totalTokens:52}};
      return;
    }
    if(request.tools.some(tool=>tool.id==="propose_visual_plan")){
      yield{type:"tool-call",call:{id:`a4-mock-plan-${request.messages.length}`,toolId:"propose_visual_plan",arguments:{intent:"Highlight concrete proof and the CTA with clear motion."}}};
      yield{type:"completed",usage:{inputTokens:36,outputTokens:8,totalTokens:44}};
      return;
    }
    yield{type:"text-delta",text:"A4 mock Agent is ready."};
    yield{type:"completed",usage:{inputTokens:10,outputTokens:6,totalTokens:16}};
  }
}
