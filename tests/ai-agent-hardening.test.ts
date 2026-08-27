import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import type {AIProvider} from "@/lib/ai/provider";
import type {AgentProviderEvent,AIProviderRequest} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-27T11:00:00.000Z";
const later="2026-08-27T11:01:00.000Z";
const projectId="a6-agent-hardening-project";
const sessionId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const sessionFixture=()=>AgentSessionSchema.parse({
  id:sessionId,
  projectId,
  providerId:"hardening-provider",
  model:"hardening-model",
  status:"active",
  createdAt:now,
  updatedAt:now,
  messages:[],
  turns:[],
  proposals:[],
  approvedOperations:[],
});

class RecoverableProvider implements AIProvider{
  readonly id="hardening-provider";
  readonly requests:AIProviderRequest[]=[];
  private attempt=0;

  async *run(request:AIProviderRequest):AsyncIterable<AgentProviderEvent>{
    this.requests.push(request);
    this.attempt+=1;
    if(this.attempt===1){
      yield{type:"error",error:{code:"network",message:"temporary upstream failure",retryable:true}};
      return;
    }
    yield{type:"text-delta",text:"Recovered on retry."};
    yield{type:"completed",usage:{inputTokens:5,outputTokens:4,totalTokens:9}};
  }
}

describe("V2.3 A6 Agent hardening",()=>{
  it("recovers a corrupt primary Session from the atomic backup and self-heals the primary file",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a6-agent");
    const created=sessionFixture();
    await sessions.create(created);
    await sessions.save(AgentSessionSchema.parse({...created,updatedAt:later}));

    const primary=`/a6-agent/projects/${projectId}/edit/agent/sessions/${sessionId}.json`;
    const backup=`/a6-agent/projects/${projectId}/edit/agent/sessions/${sessionId}.backup.json`;
    expect(fs.files.has(backup)).toBe(true);
    fs.files.set(primary,"{partial-write");

    const recovered=await sessions.load(projectId,sessionId);

    expect(recovered?.updatedAt).toBe(now);
    expect(()=>JSON.parse(fs.files.get(primary)!)).not.toThrow();
    expect(AgentSessionSchema.parse(JSON.parse(fs.files.get(primary)!))).toEqual(created);
    expect(fs.files.get(backup)).toContain(sessionId);
  });

  it("discovers and self-heals a backup-only Session during restart listing",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a6-agent");
    const created=sessionFixture();
    await sessions.create(created);
    await sessions.save(AgentSessionSchema.parse({...created,updatedAt:later}));

    const primary=`/a6-agent/projects/${projectId}/edit/agent/sessions/${sessionId}.json`;
    fs.files.delete(primary);

    const restartedRepository=new AgentSessionRepository(fs,"/a6-agent");
    const listed=await restartedRepository.list(projectId);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(sessionId);
    expect(listed[0]?.updatedAt).toBe(now);
    expect(fs.files.has(primary)).toBe(true);
  });

  it("retries a recoverable provider failure as a fresh turn without replaying durable work",async()=>{
    const project=ProjectSchema.parse(createProject({id:projectId,name:"A6 Agent Hardening",now,durationInFrames:300}));
    project.project.revision=2;
    const before=JSON.stringify(project);
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a6-provider-retry");
    const provider=new RecoverableProvider();
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(project)});
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("not used");}}});
    let idCounter=0;
    const service=new AgentSessionService({
      provider,
      context,
      tools,
      sessions,
      now:()=>later,
      makeId:()=>`00000000-0000-4000-8000-${String(++idCounter).padStart(12,"0")}`,
    });
    const created=await service.create({projectId});

    const failed=await service.runTurn({projectId,sessionId:created.id,userContent:"Retry this safely"});
    expect(failed.status).toBe("active");
    expect(failed.turns).toHaveLength(1);
    expect(failed.turns[0]?.status).toBe("failed");
    expect(failed.turns[0]?.error).toMatchObject({code:"network",retryable:true});
    expect(failed.turns[0]?.toolExecutions).toEqual([]);

    const retried=await service.runTurn({projectId,sessionId:created.id,userContent:"Retry this safely"});

    expect(retried.turns.map(turn=>turn.status)).toEqual(["failed","completed"]);
    expect(retried.turns[0]?.toolExecutions).toEqual([]);
    expect(retried.turns[1]?.toolExecutions).toEqual([]);
    expect(retried.proposals).toEqual([]);
    expect(retried.approvedOperations).toEqual([]);
    expect(retried.messages.filter(message=>message.role==="user").map(message=>message.content)).toEqual(["Retry this safely","Retry this safely"]);
    expect(retried.messages.at(-1)?.content).toBe("Recovered on retry.");
    expect(provider.requests).toHaveLength(2);
    expect(JSON.stringify(project)).toBe(before);
    expect(project.project.revision).toBe(2);
  });
});
