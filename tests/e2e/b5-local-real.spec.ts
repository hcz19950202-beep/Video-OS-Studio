import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test, type Page } from "@playwright/test";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { ProductionExecutionRepository } from "@/lib/production/execution/repository";
import {
  ProductionMissionExecutor,
  type ProductionStepRunner,
} from "@/lib/production/execution/executor";
import { FileJobStore } from "@/lib/jobs/store";
import { ProductionMissionRepository } from "@/lib/production/mission/repository";
import type { ProductionMission } from "@/lib/production/mission/schema";
import { ProductionPlanRepository } from "@/lib/production/plan/repository";
import { ProductionPlanSchema } from "@/lib/production/plan/schema";
import { ProjectMutationCoordinator } from "@/lib/project/mutation-coordinator";
import { ProjectRepository } from "@/lib/project/repository";
import type { Project } from "@/schemas/project";

const execFileAsync = promisify(execFile);
const enabled =
  process.env.B5_WINDOWS_MISSION_UI_SMOKE === "1" &&
  Boolean(process.env.B5_SOURCE_VIDEO) &&
  Boolean(process.env.B5_ACCEPTANCE_SHA) &&
  Boolean(process.env.VIDEO_OS_DATA_ROOT);

test.skip(
  !enabled,
  "Set B5_WINDOWS_MISSION_UI_SMOKE=1, B5_SOURCE_VIDEO, B5_ACCEPTANCE_SHA, and VIDEO_OS_DATA_ROOT to run the real B5 Windows acceptance.",
);

const openRecentProject = async (page: Page, projectName: string) => {
  await page.getByTitle("Project").click();
  const recent = page.locator(".os-recent-list button").filter({ hasText: projectName }).first();
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.locator(".v21-project-title")).toContainText(projectName);
};

const openMissionWorkspace = async (page: Page) => {
  await page.getByTitle("AI").click();
  await page.getByRole("tab", { name: "Mission", exact: true }).click();
  await expect(page.getByText("Production Mission Workspace", { exact: true })).toBeVisible();
};

const recursiveNames = async (root: string): Promise<string[]> => {
  const names: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    names.push(entry.name);
    if (entry.isDirectory()) names.push(...(await recursiveNames(join(root, entry.name))));
  }
  return names;
};

test(
  "B5 real Windows Mission checkpoint restart retry cancellation and workspace durability",
  async ({ page }) => {
    test.setTimeout(15 * 60_000);
    const sourceVideo = process.env.B5_SOURCE_VIDEO!;
    const dataRoot = process.env.VIDEO_OS_DATA_ROOT!;
    const expectedSha = process.env.B5_ACCEPTANCE_SHA!;
    const { stdout: headOutput } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      windowsHide: true,
    });
    const actualSha = headOutput.trim();
    expect(actualSha).toBe(expectedSha);

    const projectName = `B5 Real ${Date.now()}`;
    const editedProjectName = `${projectName} · bounded edit`;
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() => {
      localStorage.setItem("video-os-studio-locale", "en-US");
      localStorage.setItem("video-os-studio-theme", "dark");
    });
    await page.goto("/");
    await page.getByTitle("Project").click();
    await page.getByLabel("Project name").fill(projectName);
    const createProjectResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().endsWith("/api/projects"),
    );
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    const projectResponse = await createProjectResponse;
    expect(projectResponse.status()).toBe(201);
    const projectId = ((await projectResponse.json()) as { project: Project }).project.project.id;

    const importResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/projects/${encodeURIComponent(projectId)}/media?`),
    );
    await page.locator('input[type="file"]').setInputFiles(sourceVideo);
    expect((await importResponse).ok()).toBeTruthy();
    await expect
      .poll(
        () =>
          page.evaluate(async (id) => {
            const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
              cache: "no-store",
            });
            const body = (await response.json()) as { project: Project };
            return body.project.assets.filter((asset) => asset.kind === "video").length;
          }, projectId),
        { timeout: 120_000 },
      )
      .toBeGreaterThan(0);

    await openMissionWorkspace(page);
    await page.getByRole("button", { name: "New mission", exact: true }).click();
    await page.getByLabel("Mission title").fill("B5 local acceptance mission");
    await page
      .getByLabel("Production brief")
      .fill(
        "Prove controlled Mission execution over this real imported video without producing B6 output.",
      );
    const createMissionResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}/missions`),
    );
    await page.getByRole("button", { name: "Create mission", exact: true }).click();
    const missionResponse = await createMissionResponse;
    expect(missionResponse.status()).toBe(201);
    const mission = ((await missionResponse.json()) as { mission: ProductionMission }).mission;
    const missionId = mission.id;

    const fs = new NodeFileSystemAdapter();
    const projects = new ProjectRepository(fs, dataRoot);
    const missions = new ProductionMissionRepository(fs, dataRoot);
    const plans = new ProductionPlanRepository(fs, dataRoot);
    const executions = new ProductionExecutionRepository(fs, dataRoot);
    const currentProject = await projects.load(projectId);
    const baseRevision = currentProject.project.revision;
    expect(mission.baseProjectRevision).toBe(baseRevision);
    const videoAsset = currentProject.assets.find((asset) => asset.kind === "video");
    expect(videoAsset).toBeTruthy();
    const assetId = videoAsset!.id;
    const assetPath = projects.resolveProjectFile(projectId, videoAsset!.relativePath);
    const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
    const { stdout: probeOutput } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name",
        "-of",
        "json",
        assetPath,
      ],
      { windowsHide: true },
    );
    const probe = JSON.parse(probeOutput) as {
      format?: { duration?: string };
      streams?: Array<{ codec_name?: string }>;
    };
    expect(Number(probe.format?.duration ?? 0)).toBeGreaterThan(0);
    expect(probe.streams?.some((stream) => Boolean(stream.codec_name))).toBeTruthy();

    const planId = randomUUID();
    const plan = ProductionPlanSchema.parse({
      id: planId,
      projectId,
      missionId,
      version: 1,
      baseProjectRevision: baseRevision,
      summary: "Prove B5 controlled execution over a real imported media Project.",
      generatedAt: new Date().toISOString(),
      steps: [
        {
          id: "inspect-real-media",
          kind: "analyze-script",
          title: "Inspect real media evidence",
          objective: "Attach the imported video asset as durable Mission evidence.",
          dependsOn: [],
          risk: "low",
          owner: "agent",
          reviewRequired: false,
          requiresProjectRevision: false,
          evidence: [{ kind: "asset", id: assetId }],
        },
        {
          id: "bounded-project-edit",
          kind: "edit-project",
          title: "Apply bounded Project edit",
          objective: "Rename the Project through the accepted idempotent mutation coordinator.",
          dependsOn: ["inspect-real-media"],
          risk: "medium",
          owner: "agent",
          reviewRequired: false,
          requiresProjectRevision: true,
          evidence: [],
        },
        {
          id: "retryable-asset-prep",
          kind: "prepare-assets",
          title: "Retry bounded asset preparation",
          objective: "Fail once with a retryable error, then reuse the same operation identity.",
          dependsOn: ["bounded-project-edit"],
          risk: "low",
          owner: "agent",
          reviewRequired: false,
          requiresProjectRevision: false,
          evidence: [{ kind: "asset", id: assetId }],
        },
        {
          id: "cancelled-before-job",
          kind: "render-preview",
          title: "Job-owned step remains pending",
          objective: "Remain pending so cancellation proves no later Job is dispatched.",
          dependsOn: ["retryable-asset-prep"],
          risk: "low",
          owner: "job",
          reviewRequired: false,
          requiresProjectRevision: true,
          evidence: [],
        },
      ],
    });
    await plans.create(plan);
    await missions.mutate(projectId, missionId, (current) => ({
      ...current,
      planId,
      status: "ready",
      updatedAt: new Date().toISOString(),
    }));

    const runnerCalls: Array<{ stepId: string; operationId: string; attempts: number }> = [];
    const makeRunner = (
      projectRepository: ProjectRepository,
      mutations: ProjectMutationCoordinator,
    ): ProductionStepRunner => ({
      execute: async (input) => {
        const stepState = input.execution.steps.find((item) => item.stepId === input.step.id)!;
        runnerCalls.push({
          stepId: input.step.id,
          operationId: input.operationId,
          attempts: stepState.attempts,
        });
        if (input.step.id === "inspect-real-media") {
          return { status: "completed", evidence: [{ kind: "asset", id: assetId }] };
        }
        if (input.step.id === "bounded-project-edit") {
          const result = await mutations.applyCommand(projectId, {
            expectedRevision: input.expectedProjectRevision,
            commandId: input.operationId,
            command: { type: "rename-project", name: editedProjectName },
          });
          return {
            status: "completed",
            evidence: [
              { kind: "project", id: projectId },
              { kind: "apply-operation", id: input.operationId },
            ],
            projectRevisionAfter: result.appliedRevision,
          };
        }
        if (input.step.id === "retryable-asset-prep" && stepState.attempts === 1) {
          return {
            status: "retryable-failure",
            code: "LOCAL_ACCEPTANCE_RETRY",
            message: "Intentional bounded retry for the B5 local acceptance fixture.",
          };
        }
        if (input.step.id === "retryable-asset-prep") {
          const latest = await projectRepository.load(projectId);
          expect(latest.assets.some((asset) => asset.id === assetId)).toBeTruthy();
          return { status: "completed", evidence: [{ kind: "asset", id: assetId }] };
        }
        return {
          status: "blocked",
          code: "UNEXPECTED_LOCAL_ACCEPTANCE_STEP",
          message: "The B5 local acceptance must cancel before a Job-owned step runs.",
        };
      },
    });

    const firstMutations = new ProjectMutationCoordinator(fs, projects);
    const firstExecutor = new ProductionMissionExecutor(
      missions,
      plans,
      executions,
      projects,
      makeRunner(projects, firstMutations),
    );
    const afterInspect = await firstExecutor.advance(projectId, missionId);
    expect(afterInspect.status).toBe("running");
    expect(afterInspect.steps[0].status).toBe("completed");

    const waiting = await firstExecutor.advance(projectId, missionId);
    expect(waiting.status).toBe("waiting-review");
    const checkpointId = waiting.steps[1].checkpoint?.id;
    expect(checkpointId).toBeTruthy();
    expect(
      runnerCalls.filter((call) => call.stepId === "bounded-project-edit"),
    ).toHaveLength(0);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator(".b5c-mission-hero")).toContainText("WAITING-REVIEW");
    await expect(page.getByText("pending", { exact: true })).toBeVisible();

    // Reconstruct every execution repository/service object to prove restart durability.
    const restartedFs = new NodeFileSystemAdapter();
    const restartedProjects = new ProjectRepository(restartedFs, dataRoot);
    const restartedMissions = new ProductionMissionRepository(restartedFs, dataRoot);
    const restartedPlans = new ProductionPlanRepository(restartedFs, dataRoot);
    const restartedExecutions = new ProductionExecutionRepository(restartedFs, dataRoot);
    const restartedMutations = new ProjectMutationCoordinator(restartedFs, restartedProjects);
    const restartedExecutor = new ProductionMissionExecutor(
      restartedMissions,
      restartedPlans,
      restartedExecutions,
      restartedProjects,
      makeRunner(restartedProjects, restartedMutations),
    );

    await restartedExecutor.review(projectId, missionId, {
      checkpointId: checkpointId!,
      decision: "approved",
    });
    const afterEdit = await restartedExecutor.advance(projectId, missionId);
    expect(afterEdit.status).toBe("running");
    const editedProject = await restartedProjects.load(projectId);
    expect(editedProject.project.name).toBe(editedProjectName);
    expect(editedProject.project.revision).toBe(baseRevision + 1);
    const editState = afterEdit.steps.find((step) => step.stepId === "bounded-project-edit")!;
    expect(editState.status).toBe("completed");
    expect(
      runnerCalls.filter((call) => call.stepId === "bounded-project-edit"),
    ).toHaveLength(1);

    const replay = await restartedMutations.applyCommand(projectId, {
      expectedRevision: baseRevision,
      commandId: editState.operationId,
      command: { type: "rename-project", name: editedProjectName },
    });
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.appliedRevision).toBe(baseRevision + 1);
    expect((await restartedProjects.load(projectId)).project.revision).toBe(baseRevision + 1);

    const retrying = await restartedExecutor.advance(projectId, missionId);
    expect(retrying.status).toBe("running");
    expect(retrying.steps.find((step) => step.stepId === "retryable-asset-prep")?.status).toBe(
      "retrying",
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator(".b5c-mission-hero")).toContainText("RETRYING");

    const afterRetry = await restartedExecutor.advance(projectId, missionId);
    expect(afterRetry.status).toBe("running");
    const retryCalls = runnerCalls.filter((call) => call.stepId === "retryable-asset-prep");
    expect(retryCalls).toHaveLength(2);
    expect(retryCalls[0].operationId).toBe(retryCalls[1].operationId);
    expect(
      afterRetry.steps.find((step) => step.stepId === "cancelled-before-job")?.status,
    ).toBe("pending");

    const cancelledExecution = await restartedExecutor.cancel(projectId, missionId);
    expect(cancelledExecution?.status).toBe("cancelled");
    const cancelledMission = await restartedMissions.require(projectId, missionId);
    expect(cancelledMission.status).toBe("cancelled");
    expect(cancelledMission.jobIds).toEqual([]);
    expect(runnerCalls.some((call) => call.stepId === "cancelled-before-job")).toBe(false);

    const projectJobs = (await new FileJobStore(dataRoot).list()).filter(
      (job) => job.projectId === projectId,
    );
    expect(projectJobs).toEqual([]);

    await page.reload();
    await openRecentProject(page, editedProjectName);
    await openMissionWorkspace(page);
    await expect(page.locator(".b5c-mission-hero")).toContainText("CANCELLED");
    await expect(page.getByLabel("Autonomy mode")).toBeDisabled();
    await expect(page.getByText("3/4", { exact: true })).toBeVisible();

    const residueNames = await recursiveNames(dataRoot);
    const forbiddenResidue = residueNames.filter(
      (name) =>
        name.endsWith(".props.json") ||
        name === ".hf-work" ||
        name.endsWith(".lock") ||
        name.endsWith(".tmp"),
    );
    expect(forbiddenResidue).toEqual([]);

    console.log(
      "B5_ACCEPTANCE_EVIDENCE",
      JSON.stringify(
        {
          exactSha: actualSha,
          projectId,
          missionId,
          planId,
          executionId: cancelledExecution?.id,
          sourceAssetId: assetId,
          sourceProbe: probe,
          baseProjectRevision: baseRevision,
          finalProjectRevision: (await restartedProjects.load(projectId)).project.revision,
          checkpointId,
          checkpointStatus: cancelledExecution?.steps.find(
            (step) => step.stepId === "bounded-project-edit",
          )?.checkpoint?.status,
          editOperationId: editState.operationId,
          editReplayAlreadyApplied: replay.alreadyApplied,
          retryOperationIds: retryCalls.map((call) => call.operationId),
          cancelledBeforeJob: true,
          projectJobCount: projectJobs.length,
          browserReopenDurability: "PASS",
          forbiddenResidue,
        },
        null,
        2,
      ),
    );
  },
);
