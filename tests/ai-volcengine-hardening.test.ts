import {describe,expect,it} from "vitest";
import {AIProviderRequestSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import {loadVolcengineAgentPlanProviderConfig} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {VolcengineAgentPlanProvider,type VolcengineAgentPlanFetch} from "@/lib/ai/providers/volcengine-agent-plan";

const now="2026-08-27T12:30:00.000Z";

const request=AIProviderRequestSchema.parse({
  system:"You are a bounded editing Agent.",
  messages:[{id:"timeout-user",role:"user",content:"Read only",createdAt:now}],
  tools:[],
});

const collect=async(provider:VolcengineAgentPlanProvider)=>{
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(request))events.push(event);
  return events;
};

describe("V2.3 A6 Volcengine provider hardening",()=>{
  it("aborts a hung provider request at the configured timeout and returns a retryable normalized error",async()=>{
    let aborted=false;
    const fetchImpl=((_input:URL|RequestInfo,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      const signal=init?.signal;
      const abort=()=>{
        aborted=true;
        reject(new DOMException("aborted","AbortError"));
      };
      if(signal?.aborted)abort();
      else signal?.addEventListener("abort",abort,{once:true});
    })) as VolcengineAgentPlanFetch;
    const provider=new VolcengineAgentPlanProvider({
      config:loadVolcengineAgentPlanProviderConfig({
        VOLCENGINE_AGENT_API_KEY:"timeout-test-secret",
        VOLCENGINE_AGENT_MODEL:"ark-code-latest",
      },{endpoint:"https://example.test/api/plan/v3/chat/completions",timeoutMs:10}),
      fetchImpl,
    });

    const events=await collect(provider);

    expect(aborted).toBe(true);
    expect(events).toEqual([{
      type:"error",
      error:{code:"timeout",message:"Volcengine Agent Plan request timed out.",retryable:true},
    }]);
    expect(JSON.stringify(events)).not.toContain("timeout-test-secret");
  });
});
