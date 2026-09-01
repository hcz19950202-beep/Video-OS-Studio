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
    listHistory: vi.fn(),
  },
  projectHistoryAttributions: {
    list: vi.fn(),
    record: vi.fn(),
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

const tempRoots: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  fakes.projectHistoryAttributions.list.mockResolvedValue([]);
  fakes.projectHistoryAttributions.record.mockResolvedValue({operationId:"op-1",origin:{kind:"human"},recordedAt:"2026-09-01T00:00:00.000Z"});
  fakes.projectMutations.listHistory.mockResolvedValue([]);
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

    const listed = await projectsRoute.GET();
    expect(listed.status).toBe(200);
    expect((await listed.json()).projects).toHaveLength(1);
    expect(fakes.projectRepository.listRecent).toHaveBeenCalledWith();
  });

  it("loads and explicitly replaces a Project through the detail route", async () => {
    fakes.projectRepository.load.mockResolvedValue(project);
    fakes.projectMutations.replaceProject.mockResolvedValue(mutationResult);
    const context = { params: Promise.resolve({ projectId: "h6-project" }) };

    const loaded = await projectRoute.GET(
      new Request("http://localhost/api/projects/h6-project"),
      context,
    );
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
      expect.objectContaining({transactionId:"tx-1",expectedRevision:0}),
    );
    expect(fakes.projectHistoryAttributions.record).toHaveBeenCalledWith("h6-project","op-1",{kind:"human"});
  });

  it("imports media through the Project media route", async () => {
    fakes.mediaImportService.importWithReport.mockResolvedValue({project,import:{kind:"video",normalized:false}});
    const form=new FormData();form.set("file",new File(["video"],"sample.mp4",{type:"video/mp4"}));
    const response=await mediaRoute.POST(new Request("http://localhost/api/projects/h6-project/media",{method:"POST",body:form}),{params:Promise.resolve({projectId:"h6-project"})});
    expect(response.status).toBe(200);
  });

  it("serves project asset files with range support", async () => {
    const root=await mkdtemp(join(tmpdir(),"video-os-h6-route-"));tempRoots.push(root);
    const file=join(root,"asset.mp4");await writeFile(file,Buffer.from("0123456789"));
    fakes.projectRepository.resolveProjectFile.mockReturnValue(file);
    const response=await assetRoute.GET(new Request("http://localhost/api/projects/h6-project/assets/asset-1",{headers:{range:"bytes=2-5"}}),{params:Promise.resolve({projectId:"h6-project",assetId:"asset-1"})});
    expect(response.status).toBe(206);
    expect(await response.text()).toBe("2345");
  });

  it("creates, lists, reads, retries and cancels durable Jobs", async () => {
    fakes.jobRuntime.list.mockResolvedValue([job]);fakes.jobRuntime.create.mockResolvedValue(job);fakes.jobRuntime.get.mockResolvedValue(job);fakes.jobRuntime.getArtifacts.mockResolvedValue([]);fakes.jobRuntime.retry.mockResolvedValue(job);fakes.jobRuntime.cancel.mockResolvedValue(job);
    const listed=await jobsRoute.GET(new Request("http://localhost/api/jobs?projectId=h6-project"));expect(listed.status).toBe(200);
    const created=await jobsRoute.POST(new Request("http://localhost/api/jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"render-final",projectId:"h6-project",input:{}})}));expect(created.status).toBe(201);
    const detail=await jobRoute.GET(new Request("http://localhost/api/jobs/job"),{params:Promise.resolve({jobId:job.id})});expect(detail.status).toBe(200);
    const retried=await retryRoute.POST(new Request("http://localhost/api/jobs/job/retry",{method:"POST"}),{params:Promise.resolve({jobId:job.id})});expect(retried.status).toBe(200);
    const cancelled=await jobRoute.DELETE(new Request("http://localhost/api/jobs/job",{method:"DELETE"}),{params:Promise.resolve({jobId:job.id})});expect(cancelled.status).toBe(200);
  });

  it("creates render Jobs through the bounded render route",async()=>{
    fakes.renderJobs.create.mockResolvedValue(job);
    const response=await rendersRoute.POST(new Request("http://localhost/api/projects/h6-project/renders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"final"})}),{params:Promise.resolve({projectId:"h6-project"})});
    expect(response.status).toBe(201);
  });
});
