import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test, type Page } from "@playwright/test";
import type { Project } from "@/schemas/project";
import type { WorkflowRun } from "@/lib/workflows/schema";

const execFileAsync = promisify(execFile);
const enabled =
  process.env.W4_WINDOWS_WORKFLOW_UI_SMOKE === "1" && Boolean(process.env.W4_SOURCE_VIDEO);

test.skip(
  !enabled,
  "Set W4_WINDOWS_WORKFLOW_UI_SMOKE=1 and W4_SOURCE_VIDEO to run the real W4 Windows acceptance.",
);

test("W4 real browser Generate First Draft review edit approve and final render", async ({
  page,
}, testInfo) => {
  test.setTimeout(15 * 60_000);
  const source = process.env.W4_SOURCE_VIDEO!;
  const projectName = `W4 Real ${Date.now()}`;
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });
  await page.goto("/");
  await page.getByTitle("Project").click();
  await page.getByLabel("Project name").fill(projectName);
  const talkingHead = page.locator(".v21-scenario-card").filter({ hasText: "Talking Head" });
  if (await talkingHead.count()) await talkingHead.first().click();
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as { project: Project };
  const projectId = createdBody.project.project.id;

  const importResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/projects/${encodeURIComponent(projectId)}/media?`),
  );
  await page.locator('input[type="file"]').setInputFiles(source);
  expect((await importResponse).ok()).toBeTruthy();
  await expect
    .poll(
      async () =>
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

  await page.getByTitle("AI").click();
  await page.getByRole("tab", { name: "Workflow", exact: true }).click();
  const startResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/workflows"),
  );
  await page.getByRole("button", { name: "Generate First Draft", exact: true }).click();
  const workflowCreated = await startResponse;
  expect(workflowCreated.status()).toBe(201);
  const createdWorkflow = (await workflowCreated.json()) as { workflow: WorkflowRun };
  const workflowId = createdWorkflow.workflow.id;

  await expect(page.locator('.v22-review-card[data-review-stage="CONTENT_REVIEW"]')).toBeVisible({
    timeout: 5 * 60_000,
  });
  const beforeEdit = await page.evaluate(async (id) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    return ((await response.json()) as { project: Project }).project;
  }, projectId);
  const caption = page.locator('[data-clip-id^="wf-caption-"]').first();
  await expect(caption).toBeVisible();
  await caption.click();
  const fontSize = page.getByLabel("Font Size");
  await expect(fontSize).toBeVisible();
  await fontSize.fill("60");
  await fontSize.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(
        async ({ id, revision }) => {
          const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
            cache: "no-store",
          });
          return (
            ((await response.json()) as { project: Project }).project.project.revision > revision
          );
        },
        { id: projectId, revision: beforeEdit.project.revision },
      ),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Approve & Continue", exact: true }).click();
  await expect(page.locator('.v22-review-card[data-review-stage="ASSEMBLY_REVIEW"]')).toBeVisible({
    timeout: 6 * 60_000,
  });
  await page.getByRole("button", { name: "Approve & Continue", exact: true }).click();
  await expect(page.locator('.v22-workflow-panel[data-workflow-state="completed"]')).toBeVisible({
    timeout: 8 * 60_000,
  });

  const finalRun = await page.evaluate(async (id) => {
    const response = await fetch(`/api/workflows/${encodeURIComponent(id)}`, { cache: "no-store" });
    return ((await response.json()) as { workflow: WorkflowRun }).workflow;
  }, workflowId);
  expect(
    finalRun.stageExecutions.every(
      (stage) => stage.status === "completed" || stage.status === "skipped",
    ),
  ).toBeTruthy();
  expect(
    finalRun.checkpoints.filter((checkpoint) => checkpoint.status === "approved"),
  ).toHaveLength(2);
  const finalStage = finalRun.stageExecutions.find((stage) => stage.stageId === "FINAL_RENDER");
  const finalJobId = finalStage?.jobIds.at(-1);
  expect(finalJobId).toBeTruthy();

  // Durable UI proof: discard the current browser view, reopen the Project from Recent,
  // then discover the same persisted WorkflowRun rather than relying on component memory.
  await page.reload();
  await page.getByTitle("Project").click();
  const recent = page.locator(".os-recent-list button").filter({ hasText: projectName }).first();
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.locator(".v21-project-title")).toContainText(projectName);
  await page.getByTitle("AI").click();
  await page.getByRole("tab", { name: "Workflow", exact: true }).click();
  await expect(page.locator('.v22-workflow-panel[data-workflow-state="completed"]')).toBeVisible();
  await expect(page.locator(".v22-run-meta code")).toContainText(workflowId.slice(0, 8));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download MP4", exact: true }).click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath("w4-final.mp4");
  await download.saveAs(outputPath);
  const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
  const { stdout } = await execFileAsync(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_name,width,height,r_frame_rate",
      "-of",
      "json",
      outputPath,
    ],
    { windowsHide: true },
  );
  const probe = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_name?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
    }>;
  };
  expect(Number(probe.format?.duration ?? 0)).toBeGreaterThan(0);
  expect(
    probe.streams?.some(
      (stream) => stream.codec_name === "h264" && Boolean(stream.width) && Boolean(stream.height),
    ),
  ).toBeTruthy();

  console.log(
    "W4_ACCEPTANCE_EVIDENCE",
    JSON.stringify(
      {
        workflowId,
        projectId,
        projectRevision: finalRun.lastKnownProjectRevision,
        checkpointStatuses: finalRun.checkpoints.map((item) => ({
          stageId: item.stageId,
          status: item.status,
          baseProjectRevision: item.baseProjectRevision,
          resolvedProjectRevision: item.resolvedProjectRevision,
        })),
        finalJobId,
        finalArtifact: finalRun.artifacts.find((item) => item.stageId === "FINAL_RENDER")
          ?.relativePath,
        reopenDurability: "PASS",
        probe,
      },
      null,
      2,
    ),
  );
});
