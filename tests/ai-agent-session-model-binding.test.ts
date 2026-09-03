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

class CapturingProvider implements AIProvider{
  readonly id="openai-responses";
  readonly requests:AIProviderRequest[]=[];
  async *run(request:AIProviderRequest):AsyncIterable<AgentProviderEvent>{
    this.requests.push(request);
    yield{type:"completed"};
  }
}

describe("durable Agent session model binding",()=>{
  it("uses the model persisted on the session for every provider request after reopen",async()=>{
    const project=ProjectSchema.parse(createProject({
      id:"agent-model-binding-project",
      name:"Agent model binding",
      now:"2026-09-03T00:00:00.000Z",
      durationInFrames:300,
    }));
    const fileSystem=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fileSystem,"/agent-model-binding");
    const context=new AgentContextService({load:async()=>project});
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("visual plan should not run");}}});

    const firstProvider=new CapturingProvider();
    const firstService=new AgentSessionService({provider:firstProvider,context,tools,sessions});
    const created=await firstService.create({projectId:project.project.id,model:"gpt-5.6-session-pinned"});
    await firstService.runTurn({projectId:project.project.id,sessionId:created.id,userContent:"First turn"});

    const reopenedProvider=new CapturingProvider();
    const reopenedService=new AgentSessionService({provider:reopenedProvider,context,tools,sessions});
    const reopened=await reopenedService.open(project.project.id,created.id);
    await reopenedService.runTurn({projectId:project.project.id,sessionId:created.id,userContent:"Second turn"});

    expect(reopened.model).toBe("gpt-5.6-session-pinned");
    expect(firstProvider.requests[0]?.model).toBe("gpt-5.6-session-pinned");
    expect(reopenedProvider.requests[0]?.model).toBe("gpt-5.6-session-pinned");
  });
});
