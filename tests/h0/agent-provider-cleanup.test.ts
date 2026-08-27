import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import type {AIProvider} from "@/lib/ai/provider";
import type {AIProviderRequest,AgentProviderEvent} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-28T00:00:00.000Z";

class CleanupProbeProvider implements AIProvider{
  readonly id="cleanup-probe";
  closed=false;
  abortedAtClose=false;

  async *run(_request:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    try{
      yield{type:"error",error:{code:"provider",message:"private provider detail",retryable:true}};
    }finally{
      this.closed=true;
      this.abortedAtClose=signal?.aborted??false;
    }
  }
}

describe("V2.3.1 H0 Agent provider cleanup",()=>{
  it("aborts and closes the provider iterator when a provider event fails the round",async()=>{
    const project=ProjectSchema.parse(createProject({id:"h0-agent-cleanup",name:"H0 Agent Cleanup",now,durationInFrames:300}));
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/runtime");
    const provider=new CleanupProbeProvider();
    const context=new AgentContextService({load:async()=>project});
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("Unexpected visual planning in cleanup test.");}}});
    const service=new AgentSessionService({provider,context,tools,sessions,now:()=>now});
    const session=await service.create({projectId:project.project.id});

    const result=await service.runTurn({projectId:project.project.id,sessionId:session.id,userContent:"Trigger provider cleanup"});

    expect(result.turns[0]?.status).toBe("failed");
    expect(result.turns[0]?.error).toMatchObject({category:"provider",code:"provider"});
    expect(provider.closed).toBe(true);
    expect(provider.abortedAtClose).toBe(true);
  });
});
