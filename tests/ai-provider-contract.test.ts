import {describe,expect,it} from "vitest";
import {AIProviderAbortError,MockAIProvider,normalizeAIProviderError,type AIProviderRequest} from "@/lib/ai";

const request:AIProviderRequest={
  system:"You are the Video OS editing agent.",
  messages:[{id:"m1",role:"user",content:"Explain the current Scene.",createdAt:"2026-08-26T00:00:00.000Z"}],
  tools:[],
  model:"mock-model",
  maxOutputTokens:512,
};

describe("AI provider contract",()=>{
  it("streams deterministic normalized events and records the request",async()=>{
    const provider=new MockAIProvider([
      {type:"text-delta",text:"I will inspect the Scene."},
      {type:"tool-call",call:{id:"call_1",toolId:"get_scene_context",arguments:{sceneId:"scene-1"}}},
      {type:"completed",usage:{inputTokens:20,outputTokens:8,totalTokens:28}},
    ]);
    const events=[];
    for await(const event of provider.run(request))events.push(event);
    expect(events.map(event=>event.type)).toEqual(["text-delta","tool-call","completed"]);
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]).not.toBe(request);
    expect(provider.requests[0].messages[0].content).toBe("Explain the current Scene.");
  });

  it("rejects invalid scripted provider events at construction",()=>{
    expect(()=>new MockAIProvider([{type:"tool-call",call:{id:"call_1",toolId:"Bad Tool",arguments:{}}} as never])).toThrow();
  });

  it("honors AbortSignal before emitting provider events",async()=>{
    const provider=new MockAIProvider([{type:"text-delta",text:"hello"}]);
    const controller=new AbortController();
    controller.abort();
    const iterator=provider.run(request,controller.signal)[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toBeInstanceOf(AIProviderAbortError);
  });

  it("normalizes runtime errors without leaking unknown objects",()=>{
    expect(normalizeAIProviderError(new Error("network unavailable"),"network")).toEqual({code:"network",message:"network unavailable",retryable:true});
    expect(normalizeAIProviderError({secret:"should-not-be-stringified"},"provider")).toEqual({code:"provider",message:"AI provider request failed.",retryable:true});
  });
});
