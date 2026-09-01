import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectHistoryAttributionRepository} from "@/lib/project/history-attribution";
import {ProjectTransactionMutationSchema} from "@/lib/project/mutation-contract";
import {ProjectRepository} from "@/lib/project/repository";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
const sessionId="11111111-1111-4111-8111-111111111111";
const proposalId="22222222-2222-4222-8222-222222222222";

describe("V2.5 C6 trusted History attribution",()=>{
  it("persists the first trusted origin and never rewrites it from a later conflicting source",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const projects=new ProjectRepository(fs,"/data");
    await projects.create({id:"history-project",name:"History",now:"2026-09-01T00:00:00.000Z"});
    const attribution=new ProjectHistoryAttributionRepository(fs,projects,()=>"2026-09-01T00:01:00.000Z");

    const first=await attribution.record("history-project","operation-1",{kind:"human"});
    const replay=await attribution.record("history-project","operation-1",{kind:"external-agent",sessionId,proposalId});

    expect(first.origin).toEqual({kind:"human"});
    expect(replay.origin).toEqual({kind:"human"});
    expect(await attribution.list("history-project")).toHaveLength(1);
    const log=await fs.readText("/data/projects/history-project/history-attribution.jsonl");
    expect(log.trim().split(/\r?\n/u)).toHaveLength(1);
  });

  it("keeps origin outside the public Project transaction mutation schema",()=>{
    const base={
      expectedRevision:0,
      transactionId:"tx-1",
      transaction:{label:"Human edit",commands:[{type:"rename-project",name:"Renamed"}]},
    };
    expect(ProjectTransactionMutationSchema.safeParse(base).success).toBe(true);
    expect(ProjectTransactionMutationSchema.safeParse({...base,origin:{kind:"external-agent",sessionId,proposalId}}).success).toBe(false);
  });

  it("records Human, Built-in Agent, External Agent and Mission only at trusted server boundaries",()=>{
    const human=read("app/api/projects/[projectId]/transactions/route.ts");
    const proposal=read("app/api/projects/[projectId]/agent/sessions/[sessionId]/proposals/[proposalId]/route.ts");
    const turns=read("app/api/projects/[projectId]/agent/sessions/[sessionId]/turns/route.ts");
    const repair=read("lib/production/execution/repair-step-port.ts");
    expect(human).toContain('record(projectId,result.operationId,{kind:"human"})');
    expect(proposal).toContain('result.session.providerId==="local-mcp"?"external-agent":"builtin-agent"');
    expect(turns).toContain('auto.session.providerId==="local-mcp"?"external-agent":"builtin-agent"');
    expect(repair).toContain('record(input.mission.projectId,result.operationId,{kind:"mission",missionId:input.mission.id})');
  });

  it("renders durable History separately from current-session Undo and leaves unproven legacy origin unknown",()=>{
    const surface=read("components/studio/ProjectHistorySurface.tsx");
    const dock=read("components/studio/AgentNativeContextDock.tsx");
    expect(surface).toContain("listAttributedProjectHistory");
    expect(surface).toContain("Durable logical history");
    expect(surface).toContain("Current-session Undo stack");
    expect(surface).toContain("Unknown origin");
    expect(surface).not.toContain("operationId.startsWith");
    expect(dock).toContain("ProjectHistorySurface");
  });
});
