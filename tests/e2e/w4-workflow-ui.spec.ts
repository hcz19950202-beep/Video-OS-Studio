import { expect, test, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";
import type { WorkflowRun } from "@/lib/workflows/schema";

const PROJECT_NAME = "W4 Workflow Browser";
const VIDEO_ASSET_ID = "w4-browser-video";

const readProject = async (page: Page, projectId: string): Promise<Project> =>
  page.evaluate(async (id) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Project read failed: ${response.status}`);
    return (await response.json()).project;
  }, projectId);

const applyCommand = async (
  page: Page,
  projectId: string,
  commandId: string,
  command: ProjectCommand,
): Promise<Project> => {
  const current = await readProject(page, projectId);
  return page.evaluate(
    async ({ id, expectedRevision, operationId, payload }) => {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision, commandId: operationId, command: payload }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || result.error || `Command failed: ${response.status}`);
      return result.project;
    },
    {
      id: projectId,
      expectedRevision: current.project.revision,
      operationId: commandId,
      payload: command,
    },
  );
};

const createPendingWorkflow = async (page: Page, project: Project): Promise<WorkflowRun> =>
  page.evaluate(
    async (input) => {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || result.error || `Workflow create failed: ${response.status}`,
        );
      return result.workflow;
    },
    {
      projectId: project.project.id,
      scenario: "talking-head",
      sourceAssetIds: [VIDEO_ASSET_ID],
      expectedProjectRevision: project.project.revision,
    },
  );

const openRecentProject = async (page: Page) => {
  await page.getByTitle("Project").click();
  const recent = page.locator(".os-recent-list button").filter({ hasText: PROJECT_NAME }).first();
  await expect(recent).toBeVisible();
  await recent.click();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
};

test("W4 Workflow tab discovers durable runs and cancels without starting engines", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });
  await page.goto("/");
  await page.getByTitle("Project").click();
  await page.getByLabel("Project name").fill(PROJECT_NAME);
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as { project: Project };
  const projectId = createdBody.project.project.id;

  const seeded = await applyCommand(page, projectId, "w4-browser-add-video", {
    type: "add-asset",
    asset: {
      id: VIDEO_ASSET_ID,
      kind: "video",
      relativePath: "media/w4-browser-video.mp4",
      label: "W4 browser source",
      originalName: "w4-browser-video.mp4",
      mimeType: "video/mp4",
      durationInFrames: 300,
      width: 1280,
      height: 720,
      sourceFps: 30,
      hasAudio: true,
      sizeBytes: 1024,
    },
  });
  const pending = await createPendingWorkflow(page, seeded);
  expect(pending.status).toBe("pending");
  expect(pending.definitionVersion).toBe("2");
  expect(pending.assetBaseUrl).toBeTruthy();
  const browserOrigin = new URL(page.url());
  const assetOrigin = new URL(pending.assetBaseUrl!);
  expect(assetOrigin.protocol).toBe(browserOrigin.protocol);
  expect(assetOrigin.port).toBe(browserOrigin.port);
  expect(["127.0.0.1", "localhost"]).toContain(assetOrigin.hostname);

  await page.reload();
  await openRecentProject(page);
  await page.getByTitle("AI").click();
  await page.getByRole("tab", { name: "Workflow", exact: true }).click();
  const panel = page.locator(".v22-workflow-panel");
  await expect(panel).toHaveAttribute("data-workflow-state", "pending");
  await expect(page.locator('[data-workflow-stage="CONTENT_REVIEW"]')).toBeVisible();
  await expect(page.locator('[data-workflow-stage="ASSEMBLY_REVIEW"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate First Draft", exact: true }),
  ).toBeVisible();

  const cancelResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/api/workflows/${pending.id}`),
  );
  await page.getByRole("button", { name: "Cancel Workflow", exact: true }).click();
  expect((await cancelResponse).ok()).toBeTruthy();
  await expect(panel).toHaveAttribute("data-workflow-state", "cancelled");

  await page.reload();
  await openRecentProject(page);
  await page.getByTitle("AI").click();
  await page.getByRole("tab", { name: "Workflow", exact: true }).click();
  await expect(page.locator(".v22-workflow-panel")).toHaveAttribute(
    "data-workflow-state",
    "cancelled",
  );
});
