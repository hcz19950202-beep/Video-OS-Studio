import { createReadStream } from "node:fs";
import { access, copyFile, mkdtemp, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeFfmpegAdapter } from "@/adapters/ffmpeg";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { NodeHyperFramesAdapter } from "@/adapters/hyperframes";
import { NodeRemotionCliAdapter } from "@/adapters/remotion-cli";
import { NodeVideoUseAdapter } from "@/adapters/video-use";
import type { AgentRunnerInput } from "@/lib/ai/runner";
import { AgentSessionRepository } from "@/lib/ai/session/repository";
import { AgentSessionSchema } from "@/lib/ai/session/schema";
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
import {
  ApplicationProductionStepRunner,
  ProductionVisualPlanProposalResolver,
  ProductionVisualPlanTargetResolver,
} from "@/lib/production/execution/application-runner";
import { ApplicationProductionAgentStepPort } from "@/lib/production/execution/agent-step-port";
import { ProductionExecutionRepository } from "@/lib/production/execution/repository";
import type { ProductionStepRunnerInput } from "@/lib/production/execution/executor";
import { ApplicationProductionQAStepPort } from "@/lib/production/execution/qa-step-port";
import {
  ApplicationProductionRepairStepPort,
  ProductionQARepairResolver,
  ProductionQARepairTargetResolver,
} from "@/lib/production/execution/repair-step-port";
import { ProductionMissionRepository } from "@/lib/production/mission/repository";
import { ProductionMissionSchema } from "@/lib/production/mission/schema";
import { ProductionMissionService } from "@/lib/production/mission/service";
import { ProductionPlanRepository } from "@/lib/production/plan/repository";
import { ProductionPlanSchema } from "@/lib/production/plan/schema";
import { QAReportRepository } from "@/lib/production/qa/repository";
import { ProductionQAService } from "@/lib/production/qa/service";
import { VideoUseService } from "@/lib/video-use/service";
import { VisualPlanSchema } from "@/lib/visual-planner/schema";
import { VisualPlanService } from "@/lib/visual-planner/service";
import { WorkflowDefinitionRegistry, WorkflowStageRegistry } from "@/lib/workflows/registry";
import { WorkflowRunner } from "@/lib/workflows/runner";
import { WorkflowDefinitionSchema } from "@/lib/workflows/schema";
import { WorkflowService } from "@/lib/workflows/service";
import { FileWorkflowStore } from "@/lib/workflows/store";

const roots: string[] = [];
const servers: Server[] = [];
const windowsB6It = process.env.B6_WINDOWS_CORE_ACCEPTANCE === "1" ? it : it.skip;

const MISSION_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const EXECUTION_ID = "33333333-3333-4333-8333-333333333333";
const PROPOSAL_ID = "55555555-5555-4555-8555-555555555555";
const TURN_ID = "66666666-6666-4666-8666-666666666666";
const QA_REPAIR_ID = "77777777-7777-4777-8777-777777777777";
const OPERATION_IDS = [
  "44444444-4444-4444-8444-444444444441",
  "44444444-4444-4444-8444-444444444442",
  "44444444-4444-4444-8444-444444444443",
  "44444444-4444-4444-8444-444444444444",
  "44444444-4444-4444-8444-444444444445",
  "44444444-4444-4444-8444-444444444446",
  "44444444-4444-4444-8444-444444444447",
  "44444444-4444-4444-8444-444444444448",
] as const;
const NOW = "2026-08-29T00:00:00.000Z";
const SOURCE_DURATION_FRAMES = 180;
const TARGET_DURATION_SECONDS = 4;
const TARGET_DURATION_FRAMES = 120;

const mimeFor = (path: string) =>
  extname(path).toLowerCase() === ".mov" ? "video/quicktime" : "video/mp4";

const startAssetServer = async (repository: ProjectRepository) => {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const match = url.pathname.match(/^\/api\/projects\/([^/]+)\/assets\/([^/]+)$/u);
      if (!match) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const projectId = decodeURIComponent(match[1]!);
      const assetId = decodeURIComponent(match[2]!);
      const project = await repository.load(projectId);
      const asset = project.assets.find((item) => item.id === assetId);
      if (!asset) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const path = repository.resolveProjectFile(projectId, asset.relativePath);
      const info = await stat(path);
      const range = req.headers.range;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
      if (range) {
        const parsed = range.match(/^bytes=(\d+)-(\d*)$/u);
        if (!parsed) {
          res.statusCode = 416;
          res.end();
          return;
        }
        const start = Number(parsed[1]);
        const end = parsed[2] ? Math.min(Number(parsed[2]), info.size - 1) : info.size - 1;
        if (start > end || start >= info.size) {
          res.statusCode = 416;
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
        res.setHeader("Content-Length", String(end - start + 1));
        createReadStream(path, { start, end }).pipe(res);
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Length", String(info.size));
      createReadStream(path).pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    }
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to start B6 asset server.");
  return `http://127.0.0.1:${address.port}`;
};

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("V2.4 B6 Windows real-video core acceptance", () => {
  windowsB6It(
    "imports a real video and completes protected Agent → Workflow → render → QA → repair → rerender",
    async () => {
      expect(process.platform).toBe("win32");
      const source = process.env.B6_SOURCE_VIDEO;
      if (!source)
        throw new Error("Set B6_SOURCE_VIDEO to a real MOV/MP4 before running B6 acceptance.");
      const sourceInfo = await stat(source);
      if (sourceInfo.size <= 0) throw new Error("B6_SOURCE_VIDEO is empty.");

      const root = process.env.B6_DATA_ROOT || (await mkdtemp(join(tmpdir(), "video-os-b6-real-")));
      if (!process.env.B6_DATA_ROOT) roots.push(root);
      const staging = join(root, "acceptance-source", basename(source));
      const fs = new NodeFileSystemAdapter();
      await fs.ensureDir(join(root, "acceptance-source"));
      await copyFile(source, staging);

      const ffmpeg = new NodeFfmpegAdapter();
      const sourceProbe = await ffmpeg.probe(staging);
      if (sourceProbe.durationSeconds < SOURCE_DURATION_FRAMES / 30) {
        throw new Error("B6_SOURCE_VIDEO must be at least 6 seconds long.");
      }

      const projects = new ProjectRepository(fs, root);
      const mutations = new ProjectMutationCoordinator(fs, projects);
      const projectId = `b6-real-${Date.now()}`;
      await projects.create({
        id: projectId,
        name: "B6 Real Core Acceptance",
        width: 640,
        height: 360,
        fps: 30,
        durationInFrames: SOURCE_DURATION_FRAMES,
        scenario: "talking-head",
      });

      const importer = new MediaImportService(fs, ffmpeg, projects, undefined, mutations);
      const imported = await importer.importWithReport({
        projectId,
        fileName: basename(source),
        mimeType: mimeFor(source),
        sourcePath: staging,
        sizeBytes: sourceInfo.size,
        expectedRevision: 0,
        operationId: "b6-real-media-import",
      });
      const sourceAsset = imported.project.assets.find(
        (asset) => asset.id === imported.import.assetId,
      );
      expect(sourceAsset?.kind).toBe("video");

      const fixtureSetup = await mutations.applyTransaction(projectId, {
        expectedRevision: imported.project.project.revision,
        transactionId: "b6-real-fixture-setup",
        transaction: {
          label: "B6 acceptance fixture · place source and semantic QA scenes",
          commands: [
            {
              type: "add-clip",
              trackId: "video-main",
              clip: {
                id: "b6-source-video",
                type: "video",
                assetId: imported.import.assetId,
                sourceStartFrame: 0,
                startFrame: 0,
                durationInFrames: SOURCE_DURATION_FRAMES,
                volume: 1,
                fit: "cover",
                enabled: true,
                layer: 0,
              },
            },
            {
              type: "add-scene",
              scene: {
                id: "scene-hook",
                name: "Hook",
                semanticType: "hook",
                startFrame: 0,
                endFrame: 40,
              },
            },
            {
              type: "add-scene",
              scene: {
                id: "scene-proof",
                name: "Proof",
                semanticType: "proof",
                startFrame: 40,
                endFrame: 80,
              },
            },
            {
              type: "add-scene",
              scene: {
                id: "scene-cta",
                name: "CTA",
                semanticType: "cta",
                startFrame: 80,
                endFrame: SOURCE_DURATION_FRAMES,
              },
            },
          ],
        },
      });
      const baseRevision = fixtureSetup.project.project.revision;
      expect(baseRevision).toBe(2);

      const assetBaseUrl = await startAssetServer(projects);
      const hyperFrames = new HyperFramesRenderService(
        fs,
        new NodeHyperFramesAdapter(),
        projects,
        mutations,
      );
      const videoUse = new VideoUseService(fs, new NodeVideoUseAdapter(), projects, mutations);
      const remotion = new NodeRemotionCliAdapter();
      const jobStore = new FileJobStore(root);
      const jobs = new DurableJobRuntime(
        jobStore,
        createJobExecutors({ fs, repository: projects, remotion, ffmpeg, hyperFrames, videoUse }),
      );
      await jobs.waitUntilReady();

      const workflowDefinitions = new WorkflowDefinitionRegistry();
      workflowDefinitions.register(
        WorkflowDefinitionSchema.parse({
          id: "b6-core-windows",
          version: "1",
          name: "B6 Windows Core Acceptance",
          scenario: "talking-head",
          stages: [
            {
              id: "READY",
              kind: "analysis",
              dependsOn: [],
              optional: false,
              retryable: false,
              reviewRequired: false,
              invalidates: [],
              executorKey: "b6.ready",
            },
          ],
          entryStageIds: ["READY"],
        }),
      );
      const workflowStages = new WorkflowStageRegistry();
      workflowStages.register("b6.ready", {
        start: async (context) => {
          const current = await projects.load(context.run.projectId);
          const video = current.tracks
            .find((track) => track.id === "video-main")
            ?.clips.find((clip) => clip.type === "video");
          const motion = current.tracks
            .find((track) => track.id === "motion-main")
            ?.clips.find((clip) => clip.type === "motion" && clip.effectId === "big-number");
          if (!video || !motion)
            throw new Error("B6 Workflow requires the imported source and Agent-applied visual.");
          return {
            kind: "completed",
            projectRevision: current.project.revision,
            outputDigest: `b6-ready-revision-${current.project.revision}`,
          };
        },
      });
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

      const missionRepository = new ProductionMissionRepository(fs, root);
      const planRepository = new ProductionPlanRepository(fs, root);
      const executionRepository = new ProductionExecutionRepository(fs, root);
      const missionService = new ProductionMissionService(missionRepository, projects, {
        now: () => NOW,
      });
      const qaRepository = new QAReportRepository(fs, root);
      const qa = new ProductionQAService(qaRepository, projects, jobs, missionService, fs, ffmpeg, {
        now: () => NOW,
        createRepairId: () => QA_REPAIR_ID,
      });

      const protectionRepository = new ProductionEditProtectionRepository(fs, root, () => NOW);
      const protection = new ProductionEditProtectionService(protectionRepository, () => NOW);
      await protection.markAiOwned(
        projectId,
        { kind: "canvas" },
        baseRevision,
        "B6 acceptance allows the bounded QA timing repair.",
      );

      const sessions = new AgentSessionRepository(fs, root);
      const visualPlan = VisualPlanSchema.parse({
        version: 2,
        projectId,
        generatedAt: NOW,
        source: "rules",
        context: { intent: "B6 numeric proof" },
        suggestions: [
          {
            id: "suggestion-1",
            sceneId: "scene-proof",
            startFrame: 40,
            endFrame: 70,
            spokenText: "15 day factory build",
            semanticType: "proof",
            recommendation: { engine: "remotion", effectId: "big-number", props: {} },
            reason: "B6 acceptance proves a real Remotion visual mutation.",
            confidence: 1,
            alternatives: [],
          },
        ],
        densityBefore: {
          motionCards: 0,
          cardsPerMinute: 0,
          peakConcurrency: 0,
          averageGapFrames: null,
          minimumGapFrames: null,
        },
      });
      const agentRunner = {
        runTurn: async (input: AgentRunnerInput) => {
          const session = await sessions.require(input.projectId, input.sessionId);
          return sessions.save(
            AgentSessionSchema.parse({
              ...session,
              updatedAt: NOW,
              turns: [
                ...session.turns,
                {
                  id: TURN_ID,
                  baseProjectRevision: baseRevision,
                  userMessageId: "b6-windows-user-message",
                  startedAt: NOW,
                  completedAt: NOW,
                  status: "completed",
                  providerRoundTrips: 1,
                  toolExecutions: [],
                  proposalIds: [PROPOSAL_ID],
                },
              ],
              proposals: [
                ...session.proposals,
                {
                  id: PROPOSAL_ID,
                  sessionId: session.id,
                  projectId,
                  baseProjectRevision: baseRevision,
                  title: "B6 Windows visual proposal",
                  summary: "Add one real Remotion numeric proof card.",
                  rationale: ["Use a persisted structured visual proposal."],
                  operations: [
                    {
                      id: "visual-op",
                      kind: "visual-plan",
                      summary: "Apply numeric proof visual.",
                      payload: { plan: visualPlan, selectedIds: ["suggestion-1"] },
                    },
                  ],
                  warnings: [],
                  createdAt: NOW,
                  status: "draft",
                },
              ],
            }),
          );
        },
      };
      const agent = new ApplicationProductionAgentStepPort(agentRunner, sessions, {
        providerId: "deterministic-b6",
        now: () => NOW,
      });
      const proposalResolver = new ProductionVisualPlanProposalResolver(sessions);
      const visualTargets = new ProductionVisualPlanTargetResolver(proposalResolver);
      const visualPlans = new VisualPlanService(fs, projects, {} as never, hyperFrames, mutations);
      const qaPort = new ApplicationProductionQAStepPort(qa);
      const repairResolver = new ProductionQARepairResolver(qa);
      const repairPort = new ApplicationProductionRepairStepPort(
        repairResolver,
        projects,
        mutations,
      );
      const repairTargets = new ProductionQARepairTargetResolver(repairResolver, projects);
      const applicationRunner = new ApplicationProductionStepRunner(
        agent,
        proposalResolver,
        visualPlans,
        workflows,
        jobs,
        { resolve: async () => assetBaseUrl },
        { pollIntervalMs: 100, waitTimeoutMs: 10 * 60 * 1000, qa: qaPort, repair: repairPort },
      );

      const mission = ProductionMissionSchema.parse({
        id: MISSION_ID,
        projectId,
        title: "B6 Windows autonomous core acceptance",
        brief:
          "Apply a bounded visual, run a real Workflow, render, repair duration once, rerender and pass QA.",
        target: {
          platform: "facebook",
          format: "product-ad",
          targetDurationSeconds: TARGET_DURATION_SECONDS,
          language: "en-AU",
        },
        autonomyPolicy: { mode: "full-production", finalReviewRequired: false },
        baseProjectRevision: baseRevision,
        status: "ready",
        planId: PLAN_ID,
        createdAt: NOW,
        updatedAt: NOW,
      });
      const plan = ProductionPlanSchema.parse({
        id: PLAN_ID,
        projectId,
        missionId: MISSION_ID,
        version: 1,
        baseProjectRevision: baseRevision,
        summary: "B6 exact bounded real-video core acceptance.",
        steps: [
          {
            id: "plan-visuals",
            kind: "plan-visuals",
            title: "Plan visuals",
            objective: "Persist one structured visual proposal.",
            dependsOn: [],
            risk: "low",
            owner: "agent",
            reviewRequired: false,
            requiresProjectRevision: false,
            evidence: [{ kind: "skill", id: "numeric-evidence-emphasis@1.0.0" }],
          },
          {
            id: "edit-project",
            kind: "edit-project",
            title: "Apply visual",
            objective: "Apply only the persisted bounded visual proposal.",
            dependsOn: ["plan-visuals"],
            risk: "medium",
            owner: "agent",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
            targets: [
              { kind: "track", id: "motion-main", action: "append" },
              { kind: "clip", id: "visual-suggestion-1", action: "create" },
            ],
          },
          {
            id: "workflow",
            kind: "run-workflow",
            title: "Run Workflow",
            objective: "Run the real checkpoint-free bounded Workflow.",
            dependsOn: ["edit-project"],
            risk: "medium",
            owner: "workflow",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [{ kind: "workflow", id: "b6-core-windows@1" }],
          },
          {
            id: "render-first",
            kind: "render-final",
            title: "Render first Final",
            objective: "Encode the exact current Project revision.",
            dependsOn: ["workflow"],
            risk: "medium",
            owner: "job",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
          },
          {
            id: "qa-first",
            kind: "qa",
            title: "QA first Final",
            objective: "Persist B4 QA for the first encoded artifact.",
            dependsOn: ["render-first"],
            risk: "low",
            owner: "application",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
          },
          {
            id: "repair",
            kind: "repair",
            title: "Repair duration",
            objective: "Apply the bounded typed QA timing repair.",
            dependsOn: ["qa-first"],
            risk: "medium",
            owner: "application",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
            targets: [{ kind: "canvas", action: "modify" }],
          },
          {
            id: "render-second",
            kind: "render-final",
            title: "Rerender Final",
            objective: "Encode the repaired exact Project revision.",
            dependsOn: ["repair"],
            risk: "medium",
            owner: "job",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
          },
          {
            id: "qa-final",
            kind: "qa",
            title: "QA repaired Final",
            objective: "Persist passing B4 QA for the rerendered artifact.",
            dependsOn: ["render-second"],
            risk: "low",
            owner: "application",
            reviewRequired: false,
            requiresProjectRevision: true,
            evidence: [],
          },
        ],
        generatedAt: NOW,
      });
      await missionRepository.create(mission);
      await planRepository.create(plan);

      const targets = {
        resolve: (input: ProductionStepRunnerInput) =>
          input.step.kind === "repair"
            ? repairTargets.resolve(input)
            : visualTargets.resolve(input),
      };
      const operationIds = [...OPERATION_IDS];
      const service = createProtectedProductionExecutionService(
        {
          missions: missionRepository,
          plans: planRepository,
          executions: executionRepository,
          projects,
          runner: applicationRunner,
          targets,
          protection,
        },
        {
          now: () => NOW,
          createExecutionId: () => EXECUTION_ID,
          createOperationId: () => operationIds.shift()!,
          createCheckpointId: () => "88888888-8888-4888-8888-888888888888",
        },
      );

      let execution;
      for (let index = 0; index < 12; index += 1) {
        execution = await service.advance(projectId, MISSION_ID);
        if (["completed", "blocked", "cancelled"].includes(execution.status)) break;
      }
      if (execution?.status !== "completed") {
        const blocked = execution?.steps.find((step) => step.status === "blocked");
        throw new Error(
          `B6 execution ended in ${execution?.status ?? "missing"}: ${blocked?.lastFailure?.code ?? ""} ${blocked?.lastFailure?.message ?? ""}`,
        );
      }

      expect(execution.expectedProjectRevision).toBe(baseRevision + 2);
      expect(execution.steps.map((step) => step.status)).toEqual(plan.steps.map(() => "completed"));
      expect(execution.counters).toMatchObject({ agentTurns: 1, providerCalls: 1, repairLoops: 1 });

      const finalProject = await projects.load(projectId);
      expect(finalProject.project.revision).toBe(baseRevision + 2);
      expect(finalProject.canvas.durationInFrames).toBe(TARGET_DURATION_FRAMES);
      expect(
        finalProject.tracks
          .find((track) => track.id === "video-main")
          ?.clips.some((clip) => clip.id === "b6-source-video"),
      ).toBe(true);
      expect(
        finalProject.tracks
          .find((track) => track.id === "motion-main")
          ?.clips.some((clip) => clip.type === "motion" && clip.effectId === "big-number"),
      ).toBe(true);

      const workflowRun = await workflows.get(OPERATION_IDS[2]);
      expect(workflowRun?.status).toBe("completed");
      expect(workflowRun?.checkpoints).toHaveLength(0);

      const allJobs = await jobs.list();
      const firstRender = await jobs.get(OPERATION_IDS[3]);
      const secondRender = await jobs.get(OPERATION_IDS[6]);
      expect(firstRender).toMatchObject({ status: "completed", type: "render-final" });
      expect(secondRender).toMatchObject({ status: "completed", type: "render-final" });
      expect(firstRender?.output?.sourceProjectRevision).toBe(baseRevision + 1);
      expect(secondRender?.output?.sourceProjectRevision).toBe(baseRevision + 2);
      expect(allJobs.filter((job) => job.id === OPERATION_IDS[3])).toHaveLength(1);
      expect(allJobs.filter((job) => job.id === OPERATION_IDS[6])).toHaveLength(1);

      const firstQA = await qa.load(projectId, OPERATION_IDS[4]);
      const finalQA = await qa.load(projectId, OPERATION_IDS[7]);
      expect(firstQA?.status).toBe("repair-recommended");
      expect(firstQA?.repairProposal?.actions.map((item) => item.kind)).toEqual([
        "adjust-scene-timing",
      ]);
      expect(firstQA?.findings.find((item) => item.id === "goal-duration-target")?.status).toBe(
        "fail",
      );
      expect(finalQA?.status).toBe("pass");
      expect(finalQA?.findings.find((item) => item.id === "goal-duration-target")?.status).toBe(
        "pass",
      );
      for (const findingId of [
        "content-hook",
        "content-cta",
        "content-evidence",
        "visual-scene-coverage",
      ]) {
        expect(finalQA?.findings.find((item) => item.id === findingId)?.status).toBe("pass");
      }

      const finalRelativePath = String(secondRender?.output?.outputRelativePath ?? "");
      expect(finalRelativePath).toMatch(/\.mp4$/u);
      const finalPath = projects.resolveProjectFile(projectId, finalRelativePath);
      const finalProbe = await ffmpeg.probe(finalPath);
      expect(finalProbe.width).toBe(640);
      expect(finalProbe.height).toBe(360);
      expect(finalProbe.durationSeconds).toBeGreaterThan(0);
      expect(Math.abs(finalProbe.durationSeconds - TARGET_DURATION_SECONDS)).toBeLessThanOrEqual(
        0.25,
      );
      await expect(access(`${finalPath}.props.json`)).rejects.toThrow();

      const finalArtifacts = await jobs.getArtifacts(OPERATION_IDS[6]);
      expect(finalArtifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "render-output", kind: "render", mimeType: "video/mp4" }),
        ]),
      );
      const agentSession = await sessions.require(projectId, OPERATION_IDS[0]);
      expect(agentSession.turns).toHaveLength(1);
      expect(agentSession.proposals.map((proposal) => proposal.id)).toEqual([PROPOSAL_ID]);

      console.log(
        "B6_ACCEPTANCE_EVIDENCE",
        JSON.stringify(
          {
            expectedSha: process.env.B6_EXPECTED_SHA ?? null,
            projectId,
            missionId: MISSION_ID,
            executionId: execution.id,
            source: {
              name: basename(source),
              bytes: sourceInfo.size,
              durationSeconds: sourceProbe.durationSeconds,
              normalized: imported.import.normalized,
              workingRelativePath: imported.import.workingRelativePath,
            },
            revisions: {
              missionBase: baseRevision,
              afterVisualEdit: baseRevision + 1,
              final: finalProject.project.revision,
            },
            agent: { sessionId: OPERATION_IDS[0], proposalId: PROPOSAL_ID, turnId: TURN_ID },
            workflow: {
              id: workflowRun?.id,
              status: workflowRun?.status,
              stages: workflowRun?.stageExecutions.map((stage) => ({
                stageId: stage.stageId,
                status: stage.status,
                jobIds: stage.jobIds,
              })),
            },
            renders: [
              {
                id: firstRender?.id,
                sourceProjectRevision: firstRender?.output?.sourceProjectRevision,
              },
              {
                id: secondRender?.id,
                sourceProjectRevision: secondRender?.output?.sourceProjectRevision,
                relativePath: finalRelativePath,
                width: finalProbe.width,
                height: finalProbe.height,
                durationSeconds: finalProbe.durationSeconds,
              },
            ],
            qa: [
              {
                id: firstQA?.id,
                status: firstQA?.status,
                projectRevision: firstQA?.projectRevision,
                repairActions: firstQA?.repairProposal?.actions.map((item) => item.kind),
              },
              {
                id: finalQA?.id,
                status: finalQA?.status,
                projectRevision: finalQA?.projectRevision,
              },
            ],
            repair: { proposalId: firstQA?.repairProposal?.id, operationId: OPERATION_IDS[5] },
            finalArtifactIds: finalArtifacts.map((artifact) => artifact.id),
          },
          null,
          2,
        ),
      );
    },
    20 * 60 * 1000,
  );
});
