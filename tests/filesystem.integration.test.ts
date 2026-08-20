import { afterAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { applyProjectCommand } from "@/lib/project/commands";
import { ProjectRepository } from "@/lib/project/repository";
import { deserializeProject } from "@/lib/project/serialization";

const configuredRoot = process.env.VIDEO_OS_DATA_ROOT;
const temporaryRoots: string[] = [];

const getDataRoot = async (): Promise<string> => {
  if (configuredRoot) return configuredRoot;
  const root = await mkdtemp(join(tmpdir(), "video-os-studio-"));
  temporaryRoots.push(root);
  return root;
};

afterAll(async () => {
  for (const root of temporaryRoots) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("NodeFileSystemAdapter project persistence", () => {
  it("creates, saves, backs up, and reloads a project on the real filesystem", async () => {
    const dataRoot = await getDataRoot();
    const repository = new ProjectRepository(new NodeFileSystemAdapter(), dataRoot);
    const now = "2026-08-20T00:00:00.000Z";
    const project = await repository.create({ id: "phase0-local-validation", name: "Original", now });
    const renamed = applyProjectCommand(project, { type: "rename-project", name: "Updated" }, { now });

    await repository.save(renamed);

    const projectDir = join(dataRoot, "projects", "phase0-local-validation");
    const backup = deserializeProject(await readFile(join(projectDir, "project.backup.json"), "utf8"));
    expect(backup.project.name).toBe("Original");
    expect((await repository.load("phase0-local-validation")).project.name).toBe("Updated");
  });

  it("rejects project IDs that could escape the configured data root", async () => {
    const dataRoot = await getDataRoot();
    const repository = new ProjectRepository(new NodeFileSystemAdapter(), dataRoot);

    await expect(repository.load("../escape")).rejects.toThrow();
  });
});
