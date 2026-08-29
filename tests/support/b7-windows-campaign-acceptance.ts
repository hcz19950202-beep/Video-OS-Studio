import { createReadStream } from "node:fs";
import { copyFile, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, delimiter, extname, join, resolve } from "node:path";
import { expect } from "vitest";
import { NodeFfmpegAdapter } from "@/adapters/ffmpeg";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { NodeHyperFramesAdapter } from "@/adapters/hyperframes";
import { NodeRemotionCliAdapter } from "@/adapters/remotion-cli";
import { NodeVideoUseAdapter } from "@/adapters/video-use";
import { AgentSessionRepository } from "@/lib/ai/session/repository";
import { HyperFramesRenderService } from "@/lib/hyperframes/render-service";
import { createJobExecutors } from "@/lib/jobs/executors";
import { DurableJobRuntime } from "@/lib/jobs/runtime";
import { FileJobStore } from "@/lib/jobs/store";
import { MediaImportService } from "@/lib/media/import-service";
import { ProjectMutationCoordinator } from "@/lib/project/mutation-coordinator";
import { ProjectRepository } from "@/lib/project/repository";
import { createProtectedProductionExecutionService } from "@/lib/production/autonomy/composition";
import { ProductionEditProtectionRepository } from "@/lib/production/autonomy/repository";
import { ProductionEditProtectionService } from "@/lib/production/autonomy/service";
import type { ProductionStepTargetResolver } from "@/lib/production/autonomy/runner";
import { ProductionCampaignDashboardService } from "@/lib/production/campaign/dashboard";
import { ProductionExecutionCampaignMissionPort } from "@/lib/production/campaign/execution-port";
import { ProductionCampaignRepository } from "@/lib/production/campaign/repository";
import { ProductionCampaignRunner } from "@/lib/production/campaign/runner";
import { ProductionCampaignService } from "@/lib/production/campaign/service";
import type {
  ProductionCampaignMissionExecutionPort,
  ProductionCampaignMissionRunResult,
} from "@/lib/production/campaign/runner";
import {
  ApplicationProductionStepRunner,
  ProductionVisualPlanProposalResolver,
  type ProductionAgentStepPort,
} from "@/lib/production/execution/application-runner";
import { ProductionExecutionRepository } from "@/lib/production/execution/repository";
import { ProductionMissionRepository } from "@/lib/production/mission/repository";
import { ProductionMissionSchema } from "@/lib/production/mission/schema";
import { ProductionPlanRepository } from "@/lib/production/plan/repository";
import { ProductionPlanSchema } from "@/lib/production/plan/schema";
import { QAReportRepository } from "@/lib/production/qa/repository";
import { ProductionWorkspaceService } from "@/lib/production/workspace/service";
import { VideoUseService } from "@/lib/video-use/service";
import { VisualPlanService } from "@/lib/visual-planner/service";
import type { VisualPlannerAdapter } from "@/lib/visual-planner/rules";
import { WorkflowDefinitionRegistry, WorkflowStageRegistry } from "@/lib/workflows/registry";
import { WorkflowRunner } from "@/lib/workflows/runner";
import { WorkflowService } from "@/lib/workflows/service";
import { FileWorkflowStore } from "@/lib/workflows/store";

const NOW = "2026-08-29T15:00:00.000Z";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const MISSION_IDS = [
  "11111111-1111-4111-8111-111111111121",
  "11111111-1111-4111-8111-111111111122",
] as const;
const PLAN_IDS = [
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
] as const;
const TARGET_FRAMES = 90;
const TARGET_FPS = 30;
const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 360;
const MIN_SOURCE_SECONDS = TARGET_FRAMES / TARGET_FPS;

const mimeFor = (path: string) =>
  extname(path).toLowerCase() === ".mov" ? "video/quicktime" : "video/mp4";

const parseSourceVideos = () => {
  const raw = process.env.B7_SOURCE_VIDEOS?.trim();
  if (!raw) {
    throw new Error(
      `Set B7_SOURCE_VIDEOS to two distinct real MOV/MP4 paths separated by ${delimiter}.`,
    );
  }
  const sources = raw
    .split(delimiter)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => resolve(value));
  if (sources.length !== 2 || new Set(sources.map((value) => value.toLowerCase())).size !== 2) {
    throw new Error("B7_SOURCE_VIDEOS must contain exactly two distinct real video paths.");
  }
  return sources;
};

const startAssetServer = async (repository: ProjectRepository) => {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const match = url.pathname.match(/^\/api\/projects\/([^/]+)\/assets\/([^/]+)$/u);
      if (!match) {
        response.statusCode = 404;
        response.end();
        return;
      }
      const projectId = decodeURIComponent(match[1]!);
      const assetId = decodeURIComponent(match[2]!);
      const project = await repository.load(projectId);
      const asset = project.assets.find((item) => item.id === assetId);
      if (!asset) {
        response.statusCode = 404;
        response.end();
        return;
      }
      const path = repository.resolveProjectFile(projectId, asset.relativePath);
      const info = await stat(path);
      const range = request.headers.range;
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
      if (range) {
        const parsed = range.match(/^bytes=(\d+)-(\d*)$/u);
        if (!parsed) {
          response.statusCode = 416;
          response.end();
          return;
        }
        const start = Number(parsed[1]);
        const end = parsed[2] ? Math.min(Number(parsed[2]), info.size - 1) : info.size - 1;
        if (start > end || start >= info.size) {
          response.statusCode = 416;
          response.end();
          return;
        }
        response.statusCode = 206;
        response.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
        response.setHeader("Content-Length", String(end - start + 1));
        createReadStream(path, { start, end }).pipe(response);
        return;
      }
      response.statusCode = 200;
      response.setHeader("Content-Length", String(info.size));
      createReadStream(path).pipe(response);
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to start B7 asset server.");
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const closeServer = (server: Server) =>
  new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));

const unexpectedAgent: ProductionAgentStepPort = {
  execute: async () => {
    throw new Error("B7 real-batch acceptance must not invoke an Agent step.");
  },
};

const unexpectedPlanner: VisualPlannerAdapter = {
  generate: () => {
    throw new Error("B7 real-batch acceptance must not generate a Visual Plan.");
  },
};

const noMutationTargets: ProductionStepTargetResolver = {
  resolve: async () => [],
};

export const runB7WindowsCampaignAcceptance = async () => {
  expect(process.platform).toBe("win32");
  const sources = parseSourceVideos();
  const suppliedRoot = process.env.B7_DATA_ROOT?.trim();
  const root = suppliedRoot || (await mkdtemp(join(tmpdir(), "video-os-b7-real-batch-")));
  const removeRoot = !suppliedRoot;
  const fs = new NodeFileSystemAdapter();
  const ffmpeg = new NodeFfmpegAdapter();
  const projects = new ProjectRepository(fs, root);
  const mutations = new ProjectMutationCoordinator(fs, projects);
  let server: Server | undefined;

  try {
    await fs.ensureDir(join(root, "acceptance-source"));
    const importer = new MediaImportService(fs, ffmpeg, projects, undefined, mutations);
    const missionRepository = new ProductionMissionRepository(fs, root);
    const planRepository = new ProductionPlanRepository(fs, root);
    const executionRepository = new ProductionExecutionRepository(fs, root);
    const projectIds: string[] = [];
    const sourceEvidence: Array<{
      fileName: string;
      durationSeconds: number;
      hasAudio: boolean;
      projectId: string;
      projectRevision: number;
    }> = [];

    for (const [index, source] of sources.entries()) {
      const sourceInfo = await stat(source);
      if (!sourceInfo.isFile() || sourceInfo.size <= 0) {
        throw new Error(`B7 source ${index + 1} is not a non-empty file.`);
      }
      const probe = await ffmpeg.probe(source);
      if (probe.durationSeconds < MIN_SOURCE_SECONDS) {
        throw new Error(`B7 source ${index + 1} must be at least ${MIN_SOURCE_SECONDS} seconds.`);
      }

      const projectId = `b7-real-${index + 1}-${Date.now()}`;
      projectIds.push(projectId);
      await projects.create({
        id: projectId,
        name: `B7 Real Batch ${index + 1}`,
        now: NOW,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        fps: TARGET_FPS,
        durationInFrames: TARGET_FRAMES,
        scenario: "talking-head",
      });

      const staged = join(root, "acceptance-source", `${index + 1}-${basename(source)}`);
      await copyFile(source, staged);
      const imported = await importer.importWithReport({
        projectId,
        fileName: basename(source),
        mimeType: mimeFor(source),
        sourcePath: staged,
        sizeBytes: sourceInfo.size,
        expectedRevision: 0,
        operationId: `b7-real-import-${index + 1}`,
      });
      const asset = imported.project.assets.find((item) => item.id === imported.import.assetId);
      if (!asset || asset.kind !== "video") {
        throw new Error(`B7 source ${index + 1} did not import as video.`);
      }

      const placed = await mutations.applyTransaction(projectId, {
        expectedRevision: imported.project.project.revision,
        transactionId: `b7-real-place-${index + 1}`,
        transaction: {
          label: `B7 real batch source ${index + 1}`,
          commands: [
            {
              type: "add-clip",
              trackId: "video-main",
              clip: {
                id: `b7-source-video-${index + 1}`,
                type: "video",
                assetId: asset.id,
                sourceStartFrame: 0,
                startFrame: 0,
                durationInFrames: TARGET_FRAMES,
                volume: 1,
                fit: "cover",
                enabled: true,
                layer: 0,
              },
            },
          ],
        },
      });
      const baseRevision = placed.project.project.revision;

      await missionRepository.create(
        ProductionMissionSchema.parse({
          id: MISSION_IDS[index]!,
          projectId,
          title: `B7 real batch Mission ${index + 1}`,
          brief: "Render one isolated real source through the accepted bounded execution path.",
          target: {
            platform: "facebook",
            format: "talking-head",
            targetDurationSeconds: TARGET_FRAMES / TARGET_FPS,
          },
          autonomyPolicy: { mode: "full-production", finalReviewRequired: false },
          baseProjectRevision: baseRevision,
          status: "ready",
          planId: PLAN_IDS[index]!,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      );
      await planRepository.create(
        ProductionPlanSchema.parse({
          id: PLAN_IDS[index]!,
          projectId,
          missionId: MISSION_IDS[index]!,
          version: 1,
          baseProjectRevision: baseRevision,
          summary: "B7 resource-isolation acceptance renders one real Project without mutation.",
          steps: [
            {
              id: "render-final",
              kind: "render-final",
              title: "Render isolated final",
              objective: "Encode the exact current Project revision as an isolated MP4.",
              dependsOn: [],
              risk: "medium",
              owner: "job",
              reviewRequired: false,
              requiresProjectRevision: true,
              evidence: [],
            },
          ],
          generatedAt: NOW,
        }),
      );

      sourceEvidence.push({
        fileName: basename(source),
        durationSeconds: probe.durationSeconds,
        hasAudio: probe.hasAudio,
        projectId,
        projectRevision: baseRevision,
      });
    }

    const assetServer = await startAssetServer(projects);
    server = assetServer.server;
    const hyperFrames = new HyperFramesRenderService(
      fs,
      new NodeHyperFramesAdapter(),
      projects,
      mutations,
    );
    const videoUse = new VideoUseService(fs, new NodeVideoUseAdapter(), projects, mutations);
    const jobs = new DurableJobRuntime(
      new FileJobStore(root),
      createJobExecutors({
        fs,
        repository: projects,
        remotion: new NodeRemotionCliAdapter(),
        ffmpeg,
        hyperFrames,
        videoUse,
      }),
    );
    await jobs.waitUntilReady();

    const workflowDefinitions = new WorkflowDefinitionRegistry();
    const workflowStages = new WorkflowStageRegistry();
    const workflowStore = new FileWorkflowStore(root);
    const workflowRunner = new WorkflowRunner(
      workflowStore,
      workflowDefinitions,
      workflowStages,
      jobs,
      { jobPollIntervalMs: 100 },
    );
    const workflows = new WorkflowService(
      projects,
      workflowStore,
      workflowDefinitions,
      workflowRunner,
    );
    const sessions = new AgentSessionRepository(fs, root);
    const proposals = new ProductionVisualPlanProposalResolver(sessions);
    const visualPlans = new VisualPlanService(
      fs,
      projects,
      unexpectedPlanner,
      hyperFrames,
      mutations,
    );
    const applicationRunner = new ApplicationProductionStepRunner(
      unexpectedAgent,
      proposals,
      visualPlans,
      workflows,
      jobs,
      { resolve: async () => assetServer.baseUrl },
      { pollIntervalMs: 100, waitTimeoutMs: 10 * 60 * 1000 },
    );
    const protection = new ProductionEditProtectionService(
      new ProductionEditProtectionRepository(fs, root, () => NOW),
      () => NOW,
    );
    const executionService = createProtectedProductionExecutionService({
      missions: missionRepository,
      plans: planRepository,
      executions: executionRepository,
      projects,
      runner: applicationRunner,
      targets: noMutationTargets,
      protection,
    });
    const realExecutionPort = new ProductionExecutionCampaignMissionPort(executionService);

    let activeMissions = 0;
    let maxActiveMissions = 0;
    const measuredPort: ProductionCampaignMissionExecutionPort = {
      runMission: async (ref, signal): Promise<ProductionCampaignMissionRunResult> => {
        activeMissions += 1;
        maxActiveMissions = Math.max(maxActiveMissions, activeMissions);
        try {
          return await realExecutionPort.runMission(ref, signal);
        } finally {
          activeMissions -= 1;
        }
      },
      cancelMission: (ref) => realExecutionPort.cancelMission(ref),
    };

    const campaignRepository = new ProductionCampaignRepository(fs, root);
    const campaignService = new ProductionCampaignService(
      campaignRepository,
      { load: (projectId, missionId) => missionRepository.load(projectId, missionId) },
      { now: () => new Date(NOW), createId: () => CAMPAIGN_ID },
    );
    await campaignService.create({
      title: "B7 Windows real batch acceptance",
      brief: "Two isolated real videos through bounded Campaign and render resource limits.",
      maxConcurrency: 2,
      sharedReferences: {
        brandIds: ["brand.b7-real"],
        assetIds: ["asset.b7-real-source"],
        policyIds: ["policy.bounded-batch"],
        skillIds: ["skill.numeric-proof"],
        exportTemplateIds: ["export.facebook-feed"],
      },
      missions: projectIds.map((projectId, index) => ({
        projectId,
        missionId: MISSION_IDS[index]!,
      })),
    });
    await campaignService.enqueue(CAMPAIGN_ID);

    const runner = new ProductionCampaignRunner(campaignRepository, measuredPort, {
      now: () => new Date(NOW),
    });
    const completed = await runner.run(CAMPAIGN_ID);
    expect(completed.status).toBe("completed");
    expect(maxActiveMissions).toBe(2);
    expect(completed.missions).toHaveLength(2);
    expect(completed.missions.every((mission) => mission.status === "completed")).toBe(true);
    expect(new Set(completed.missions.map((mission) => mission.projectId)).size).toBe(2);

    const rendered = [] as Array<{
      projectId: string;
      jobId: string;
      relativePath: string;
      startedAt: string;
      finishedAt: string;
      sizeBytes: number;
      durationSeconds: number;
      width?: number;
      height?: number;
      fps?: number;
      hasAudio: boolean;
    }>;
    for (const mission of completed.missions) {
      expect(mission.finalArtifactIds).toHaveLength(1);
      const jobId = mission.finalArtifactIds[0]!;
      const job = await jobs.get(jobId);
      expect(job?.status).toBe("completed");
      const relativePath = job?.output?.outputRelativePath;
      if (typeof relativePath !== "string" || !job?.startedAt || !job.finishedAt) {
        throw new Error("B7 render Job is missing durable output/timing evidence.");
      }
      const outputPath = projects.resolveProjectFile(mission.projectId, relativePath);
      const outputInfo = await stat(outputPath);
      const probe = await ffmpeg.probe(outputPath);
      expect(outputInfo.size).toBeGreaterThan(0);
      expect(probe.durationSeconds).toBeGreaterThan(0);
      expect(probe.width).toBe(TARGET_WIDTH);
      expect(probe.height).toBe(TARGET_HEIGHT);
      rendered.push({
        projectId: mission.projectId,
        jobId,
        relativePath,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        sizeBytes: outputInfo.size,
        durationSeconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        fps: probe.fps,
        hasAudio: probe.hasAudio,
      });
    }
    expect(new Set(rendered.map((item) => item.jobId)).size).toBe(2);
    expect(new Set(rendered.map((item) => `${item.projectId}:${item.relativePath}`)).size).toBe(2);

    const byStart = [...rendered].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    expect(Date.parse(byStart[0]!.finishedAt)).toBeLessThanOrEqual(Date.parse(byStart[1]!.startedAt));

    const restartedCampaigns = new ProductionCampaignRepository(fs, root);
    const restartedWorkspace = new ProductionWorkspaceService(
      new ProjectRepository(fs, root),
      new ProductionMissionRepository(fs, root),
      new ProductionPlanRepository(fs, root),
      new ProductionExecutionRepository(fs, root),
      new QAReportRepository(fs, root),
    );
    const reloaded = await new ProductionCampaignDashboardService(
      restartedCampaigns,
      restartedWorkspace,
    ).snapshot(CAMPAIGN_ID);
    expect(reloaded.campaign.status).toBe("completed");
    expect(reloaded.missions).toHaveLength(2);
    expect(reloaded.missions.every((mission) => mission.live?.activity === "completed")).toBe(true);
    expect(reloaded.missions.every((mission) => mission.live?.finalRenderReadiness === "ready")).toBe(
      true,
    );

    const residue = (await readdir(root, { recursive: true })).map((item) => String(item));
    expect(residue.some((item) => item.endsWith(".props.json"))).toBe(false);
    expect(residue.some((item) => item.includes(".hf-work"))).toBe(false);

    const evidence = {
      expectedSha: process.env.B7_EXPECTED_SHA ?? null,
      campaignId: CAMPAIGN_ID,
      campaignStatus: completed.status,
      maxConcurrencyConfigured: 2,
      maxMissionConcurrencyObserved: maxActiveMissions,
      renderResourceLimitObserved: 1,
      sourceEvidence,
      rendered,
      durableReloadStatus: reloaded.campaign.status,
      durableMissionActivities: reloaded.missions.map((mission) => ({
        projectId: mission.run.projectId,
        activity: mission.live?.activity,
        finalRenderReadiness: mission.live?.finalRenderReadiness,
        projectRevision: mission.live?.projectRevision,
      })),
      noPropsResidue: true,
      noHyperFramesWorkResidue: true,
    };
    console.log(`B7_WINDOWS_ACCEPTANCE_EVIDENCE=${JSON.stringify(evidence)}`);
    return evidence;
  } finally {
    if (server) await closeServer(server);
    if (removeRoot) await rm(root, { recursive: true, force: true });
  }
};
