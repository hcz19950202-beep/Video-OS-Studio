import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import type {AIProvider} from "@/lib/ai/provider";
import type {AgentProviderEvent} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-09-03T00:00:00.000Z";

class GatedProvider implements AIProvider{
  readonly id="skill-audit-provider";
  readonly started:Promise<void>;
  private readonly released:Promise<void>;
  private resolveStarted!:()=>void;
  private resolveReleased!:()=>void;

  constructor(){
    this.started=new Promise(resolve=>{this.resolveStarted=resolve;});
    this.released=new Promise(resolve=>{this.resolveReleased=resolve;});
  }

  release(){this.resolveReleased();}

  async *run():AsyncIterable<AgentProviderEvent>{
    this.resolveStarted();
    await this.released;
    yield{type:"text-delta",text:"Skill audit complete"};
    yield{type:"completed"};
  }
}

describe("V2.5.3 Agent Skill durable Turn audit",()=>{
  it("persists the bound Skill before provider completion so interrupted turns remain attributable",async()=>{
    const project=ProjectSchema.parse(createProject({id:"skill-audit-project",name:"Skill Audit",now,durationInFrames:300}));
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/skill-audit");
    const provider=new GatedProvider();
    const context=new AgentContextService({load:async projectId=>{
      expect(projectId).toBe(project.project.id);
      return project;
    }});
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("Visual plan should not be called in this test");}}});
    const service=new AgentSessionService({provider,context,tools,sessions,now:()=>now});
    const session=await service.create({projectId:project.project.id});
    const skill={id:"caption-emphasis",version:"1.0.0"} as const;

    const run=service.runTurn({
      projectId:project.project.id,
      sessionId:session.id,
      userContent:"Emphasize the approved caption",
      skill,
    });

    await provider.started;
    const during=await sessions.require(project.project.id,session.id);
    expect(during.turns).toHaveLength(1);
    expect(during.turns[0]?.status).toBe("running");
    expect(during.turns[0]?.skill).toEqual(skill);
    const durableText=[...fs.files.values()].join("\n");
    expect(durableText).toContain('"skill"');
    expect(durableText).toContain('"caption-emphasis"');
    expect(durableText).toContain('"1.0.0"');

    provider.release();
    const completed=await run;
    expect(completed.turns[0]?.status).toBe("completed");
    expect(completed.turns[0]?.skill).toEqual(skill);
  });
});
