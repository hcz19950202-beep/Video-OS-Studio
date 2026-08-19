import { describe, expect, it } from "vitest";
import { InMemoryFileSystemAdapter } from "@/adapters/filesystem";
import { applyProjectCommand } from "@/lib/project/commands";
import { createProject } from "@/lib/project/factory";
import { ProjectRepository } from "@/lib/project/repository";

describe("Phase 1 project management", () => {
  it("changes canvas dimensions through a Project Command", () => {
    const project = createProject({ id: "demo", name: "Demo", now: "2026-08-20T00:00:00.000Z" });
    const next = applyProjectCommand(
      project,
      { type: "set-canvas", width: 1920, height: 1080 },
      { now: "2026-08-20T00:00:01.000Z" },
    );
    expect(next.canvas).toMatchObject({ width: 1920, height: 1080 });
    expect(next.project.revision).toBe(project.project.revision + 1);
  });

  it("lists recent projects from repository persistence", async () => {
    const fs = new InMemoryFileSystemAdapter();
    const repository = new ProjectRepository(fs, "/data");
    await repository.create({ id: "first", name: "First", now: "2026-08-20T00:00:00.000Z" });
    const second = await repository.create({ id: "second", name: "Second", now: "2026-08-20T00:01:00.000Z" });
    await repository.save(applyProjectCommand(second, { type: "rename-project", name: "Second Updated" }, { now: "2026-08-20T00:02:00.000Z" }));

    const recent = await repository.listRecent();
    expect(recent.map((item) => item.id)).toEqual(["second", "first"]);
    expect(recent[0].name).toBe("Second Updated");
  });
});
