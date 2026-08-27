import {describe,expect,it,vi} from "vitest";
import {MockAIProvider,observeAIProvider,type AIProviderRequest} from "@/lib/ai";

const request:AIProviderRequest={
  system:"Bounded test Agent.",
  messages:[{id:"m1",role:"user",content:"hello",createdAt:"2026-08-27T00:00:00.000Z"}],
  tools:[],
};

describe("ObservedAIProvider",()=>{
  it("mirrors normalized provider events without changing ordering or provider identity",async()=>{
    const base=new MockAIProvider([
      {type:"text-delta",text:"hello"},
      {type:"completed",usage:{totalTokens:3}},
    ]);
    const observed=[] as string[];
    const provider=observeAIProvider(base,event=>{observed.push(event.type);});
    const received=[] as string[];
    for await(const event of provider.run(request))received.push(event.type);

    expect(provider.id).toBe(base.id);
    expect(observed).toEqual(["text-delta","completed"]);
    expect(received).toEqual(observed);
  });

  it("does not let a UI/progress observer failure break durable provider execution",async()=>{
    const base=new MockAIProvider([
      {type:"text-delta",text:"safe"},
      {type:"completed"},
    ]);
    const observer=vi.fn(()=>{throw new Error("client disconnected");});
    const provider=observeAIProvider(base,observer);
    const events=[];
    for await(const event of provider.run(request))events.push(event);

    expect(events.map(event=>event.type)).toEqual(["text-delta","completed"]);
    expect(observer).toHaveBeenCalledTimes(2);
  });
});
