import { describe, expect, it } from "vitest";
import { InMemoryFileSystemAdapter } from "@/adapters/filesystem";
import { applyProjectCommand } from "@/lib/project/commands";
import { ProjectRepository } from "@/lib/project/repository";
import { deserializeProject, serializeProject } from "@/lib/project/serialization";

const now = "2026-08-19T00:00:00.000Z";

describe("project serialization", () => {
  it("round-trips a project through JSON", async () => {
    const fs = new InMemoryFileSystemAdapter();
    const repository = new ProjectRepository(fs, "/data");
    const project = await repository.create({ id: "p1", name: "Project", now });

    expect(deserializeProject(serializeProject(project))).toEqual(project);
  });

  it("preserves a backup on subsequent save", async () => {
    const fs = new InMemoryFileSystemAdapter();
    const repository = new ProjectRepository(fs, "/data");
    const project = await repository.create({ id: "p1", name: "Project", now });
    const renamed = applyProjectCommand(project, { type: "rename-project", name: "Updated" }, { now });

    await repository.save(renamed);

    const backup = await fs.readText("/data/projects/p1/project.backup.json");
    expect(deserializeProject(backup).project.name).toBe("Project");
    expect((await repository.load("p1")).project.name).toBe("Updated");
  });

  it("treats equivalent path separators consistently in the in-memory adapter", async () => {
    const fs = new InMemoryFileSystemAdapter();

    await fs.writeTextAtomic("/data/projects/p1/project.json", "project");

    expect(await fs.readText("/data\\projects\\p1\\project.json")).toBe("project");
  });
});
