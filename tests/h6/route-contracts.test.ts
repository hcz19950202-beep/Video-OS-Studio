import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "@/lib/project/factory";

const fakes = vi.hoisted(() => ({
  projectRepository: {
    listRecent: vi.fn(),
    create: vi.fn(),
    load: vi.fn(),
    resolveProjectFile: vi.fn(),
  },
  projectMutations: {
    applyCommand: vi.fn(),
    applyTransaction: vi.fn(),
    replaceProject: vi.fn(),
  },
  mediaImportService: {
    importWithReport: vi.fn(),
  },
  jobRuntime: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    getArtifacts: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
  },
  renderJobs: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/server/runtime", () => fakes);

import * as projectsRoute from "@/app/api/projects/route";
import * as projectRoute from "@/app/api/projects/[projectId]/route";
import * as commandsRoute from "@/app/api/projects/[projectId]/commands/route";
import * as transactionsRoute from "@/app/api/projects/[projectId]/transactions/route";
import * as mediaRoute from "@/app/api/projects/[projectId]/media/route";
import * as assetRoute from "@/app/api/projects/[projectId]/assets/[assetId]/route";
import * as jobsRoute from "@/app/api/jobs/route";
import * as jobRoute from "@/app/api/jobs/[jobId]/route";
import * as retryRoute from "@/app/api/jobs/[jobId]/retry/route";
import * as rendersRoute from "@/app/api/projects/[projectId]/renders/route";

const project = createProject({
  id: "h6-project",
  name: "H6 Project",
  now: "2026-08-23T06:00:00.000Z",
});
const mutationResult = {
  project,
  operationId: "op-1",
  appliedRevision: 1,
  alreadyApplied: false,
};
const job = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "render-final",
  projectId: "h6-project",
  status: "queued",
  stage: "queued",
  progress: 0,
  attempt: 1,
  input: {},
  createdAt: "2026-08-23T06:00:00.000Z",
  updatedAt: "2026-08-23T06:00:00.000Z",
};

let tempRoots: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("H6 route contracts", () => {
  it("creates and lists Projects through the real collection route", async () => {
    fakes.projectRepository.create.mockResolvedValue(project);
    fakes.projectRepository.listRecent.mockResolvedValue([
      {
        id: "h6-project",
        name: "H6 Project",
        updatedAt: "2026-08-23T06:00:00.000Z",
        revision: 0,
      },
    ]);

    const created = await projectsRoute.POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "h6-project", name: "H6 Project" }),
      }),
    );
    expect(created.status).toBe(201);
    expect((await created.json()).project.project.id).toBe("h6-project");

    const listed = await projectsRoute.GET(new Request("http://localhost/api/projects?limit=5"));
    expect(listed.status).toBe(200);
    expect((await listed.json()).projects).toHaveLength(1);
    expect(fakes.projectRepository.listRecent).toHaveBeenCalledWith(5);
  });

  it("loads and explicitly replaces a Project through the detail route", async () => {
    fakes.projectRepository.load.mockResolvedValue(project);
    fakes.projectMutations.replaceProject.mockResolvedValue(mutationResult);
    const context = { params: Promise.resolve({ projectId: "h6-project" }) };

    const loaded = await projectRoute.GET(new Request("http://localhost/api/projects/h6-project"), context);
    expect(loaded.status).toBe(200);
    expect((await loaded.json()).project.project.id).toBe("h6-project");

    const replaced = await projectRoute.PUT(
      new Request("http://localhost/api/projects/h6-project", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          operationId: "replace-1",
          reason: "maintenance",
          project,
        }),
      }),
      context,
    );
    expect(replaced.status).toBe(200);
    expect(fakes.projectMutations.replaceProject).toHaveBeenCalledWith(
      "h6-project",
      expect.objectContaining({ operationId: "replace-1", reason: "maintenance" }),
    );
  });

  it("requires H1 envelopes for command and transaction routes", async () => {
    fakes.projectMutations.applyCommand.mockResolvedValue(mutationResult);
    fakes.projectMutations.applyTransaction.mockResolvedValue(mutationResult);
    const context = { params: Promise.resolve({ projectId: "h6-project" }) };

    const commandResponse = await commandsRoute.POST(
      new Request("http://localhost/api/projects/h6-project/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          commandId: "cmd-1",
          command: { type: "rename-project", name: "Renamed" },
        }),
      }),
      context,
    );
    expect(commandResponse.status).toBe(200);
    expect(fakes.projectMutations.applyCommand).toHaveBeenCalledWith(
      "h6-project",
      expect.objectContaining({ commandId: "cmd-1", expectedRevision: 0 }),
    );

    const transactionResponse = await transactionsRoute.POST(
      new Request("http://localhost/api/projects/h6-project/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 0,
          transactionId: "tx-1",
          transaction: {
            label: "Rename",
            commands: [{ type: "rename-project", name: "Transaction name" }],
          },
        }),
      }),
      context,
    );
    expect(transactionResponse.status).toBe(200);
    expect(fakes.projectMutations.applyTransaction).toHaveBeenCalledWith(
      "h6-project",
      expect.objectContaining({ transactionId: "tx-1", expectedRevision: 0 }),
    );
  });

  it("streams raw media request bytes into a staged file before import", async () => {
    const root = await mkdtemp(join(tmpdir(), "video-os-h6-media-"));
    tempRoots.push(root);
    const uploadPath = join(root, "upload.part");
    fakes.projectRepository.resolveProjectFile.mockReturnValue(uploadPath);
    fakes.mediaImportService.importWithReport.mockImplementation(async (input) => {
      expect(input.fileName).toBe("tiny clip.mp4");
      expect(input.expectedRevision).toBe(3);
      expect(input.operationId).toBe("media-1");
      expect(input.sizeBytes).toBe(5);
      expect([...await readFile(input.sourcePath)]).toEqual([1, 2, 3, 4, 5]);
      return { project, assetId: "asset-1", normalized: false };
    });

    const response = await mediaRoute.POST(
      new Request(
        "http://localhost/api/projects/h6-project/media?fileName=tiny%20clip.mp4&expectedRevision=3&operationId=media-1",
        {
          method: "POST",
          headers: { "content-type": "video/mp4", "content-length": "5" },
          body: new Uint8Array([1, 2, 3, 4, 5]),
        },
      ),
      { params: Promise.resolve({ projectId: "h6-project" }) },
    );

    expect(response.status).toBe(200);
    expect(fakes.mediaImportService.importWithReport).toHaveBeenCalledTimes(1);
  });

  it("rejects media upload preflight above the 2 GB limit without importing", async () => {
    const response = await mediaRoute.POST(
      new Request(
        "http://localhost/api/projects/h6-project/media?fileName=too-big.mp4&expectedRevision=0&operationId=media-big",
        {
          method: "POST",
          headers: {
            "content-type": "video/mp4",
            "content-length": String(2 * 1024 * 1024 * 1024 + 1),
          },
          body: new Uint8Array(),
        },
      ),
      { params: Promise.resolve({ projectId: "h6-project" }) },
    );

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe("MEDIA_UPLOAD_TOO_LARGE");
    expect(fakes.mediaImportService.importWithReport).not.toHaveBeenCalled();
  });

  it("serves Asset GET/HEAD and single byte Range through the real route", async () => {
    const root = await mkdtemp(join(tmpdir(), "video-os-h6-asset-"));
    tempRoots.push(root);
    const assetPath = join(root, "tiny.mp4");
    await writeFile(assetPath, Buffer.from([10, 11, 12, 13, 14, 15]));
    const assetProject = structuredClone(project);
    assetProject.assets.push({
      id: "asset-1",
      kind: "video",
      relativePath: "input/tiny.mp4",
      mimeType: "video/mp4",
      sizeBytes: 6,
    });
    fakes.projectRepository.load.mockResolvedValue(assetProject);
    fakes.projectRepository.resolveProjectFile.mockReturnValue(assetPath);
    const context = { params: Promise.resolve({ projectId: "h6-project", assetId: "asset-1" }) };

    const ranged = await assetRoute.GET(
      new Request("http://localhost/api/projects/h6-project/assets/asset-1", {
        headers: { range: "bytes=1-3" },
      }),
      context,
    );
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get("content-range")).toBe("bytes 1-3/6");
    expect([...new Uint8Array(await ranged.arrayBuffer())]).toEqual([11, 12, 13]);

    const headed = await assetRoute.HEAD(
      new Request("http://localhost/api/projects/h6-project/assets/asset-1", { method: "HEAD" }),
      context,
    );
    expect(headed.status).toBe(200);
    expect(headed.headers.get("content-length")).toBe("6");
    expect(await headed.text()).toBe("");

    const invalid = await assetRoute.GET(
      new Request("http://localhost/api/projects/h6-project/assets/asset-1", {
        headers: { range: "bytes=99-100" },
      }),
      context,
    );
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get("content-range")).toBe("bytes */6");
  });

  it("creates, queries, cancels and retries durable Jobs through route handlers", async () => {
    fakes.jobRuntime.create.mockResolvedValue(job);
    fakes.jobRuntime.get.mockResolvedValue(job);
    fakes.jobRuntime.getArtifacts.mockResolvedValue([]);
    fakes.jobRuntime.cancel.mockResolvedValue({ ...job, status: "cancelled" });
    fakes.jobRuntime.retry.mockResolvedValue({ ...job, attempt: 2 });

    const created = await jobsRoute.POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "render-final", projectId: "h6-project", input: {} }),
      }),
    );
    expect(created.status).toBe(202);

    const context = { params: Promise.resolve({ jobId: job.id }) };
    const queried = await jobRoute.GET(new Request(`http://localhost/api/jobs/${job.id}`), context);
    expect(queried.status).toBe(200);
    expect((await queried.json()).job.id).toBe(job.id);

    const cancelled = await jobRoute.DELETE(
      new Request(`http://localhost/api/jobs/${job.id}`, { method: "DELETE" }),
      context,
    );
    expect(cancelled.status).toBe(200);

    const retried = await retryRoute.POST(
      new Request(`http://localhost/api/jobs/${job.id}/retry`, { method: "POST" }),
      context,
    );
    expect(retried.status).toBe(202);
    expect((await retried.json()).job.attempt).toBe(2);
  });

  it("creates project render jobs with the request origin as asset base URL", async () => {
    fakes.renderJobs.create.mockResolvedValue({ id: job.id, projectId: "h6-project", mode: "final" });
    const response = await rendersRoute.POST(
      new Request("http://127.0.0.1:3456/api/projects/h6-project/renders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "final", profile: { quality: "draft", includeAudio: false } }),
      }),
      { params: Promise.resolve({ projectId: "h6-project" }) },
    );

    expect(response.status).toBe(202);
    expect(fakes.renderJobs.create).toHaveBeenCalledWith(
      "h6-project",
      "final",
      "http://127.0.0.1:3456",
      expect.objectContaining({ quality: "draft", includeAudio: false }),
    );
  });
});
