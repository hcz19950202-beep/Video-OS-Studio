import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectRepository} from "@/lib/project/repository";

describe("H5 ProjectRepository recent summary index",()=>{
  it("lists recent projects from lightweight summaries without parsing full project.json",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    await repo.create({id:"summary-fast",name:"Fast",now:"2026-08-23T01:00:00.000Z"});
    await fs.writeTextAtomic("/data/projects/summary-fast/project.json","not-json");
    expect(await repo.listRecent()).toEqual([{id:"summary-fast",name:"Fast",updatedAt:"2026-08-23T01:00:00.000Z",revision:0}]);
  });

  it("falls back to project.json once for legacy folders and repairs the missing summary",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    await repo.create({id:"legacy-summary",name:"Legacy",now:"2026-08-23T01:00:00.000Z"});
    await fs.removeFile("/data/projects/legacy-summary/project.summary.json");
    expect(await fs.exists("/data/projects/legacy-summary/project.summary.json")).toBe(false);
    expect((await repo.listRecent())[0]?.id).toBe("legacy-summary");
    expect(await fs.exists("/data/projects/legacy-summary/project.summary.json")).toBe(true);
    await fs.writeTextAtomic("/data/projects/legacy-summary/project.json","broken-after-repair");
    expect((await repo.listRecent())[0]?.name).toBe("Legacy");
  });

  it("refreshes summary metadata after durable save",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    const project=await repo.create({id:"summary-save",name:"Before",now:"2026-08-23T01:00:00.000Z"});
    project.project.name="After";project.project.revision=3;project.project.updatedAt="2026-08-23T02:00:00.000Z";
    await repo.save(project);
    expect((await repo.listRecent())[0]).toEqual({id:"summary-save",name:"After",updatedAt:"2026-08-23T02:00:00.000Z",revision:3});
  });

  it("removes a stale summary instead of listing a project whose project.json is missing",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    await repo.create({id:"ghost-summary",name:"Ghost",now:"2026-08-23T03:00:00.000Z"});
    await fs.removeFile("/data/projects/ghost-summary/project.json");
    expect(await fs.exists("/data/projects/ghost-summary/project.summary.json")).toBe(true);
    expect(await repo.listRecent()).toEqual([]);
    expect(await fs.exists("/data/projects/ghost-summary/project.summary.json")).toBe(false);
  });
});
