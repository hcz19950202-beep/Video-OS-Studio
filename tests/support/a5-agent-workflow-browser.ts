import { expect, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { WorkflowRun } from "@/lib/workflows/schema";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "A5 Agent Workflow";
const SOURCE_ASSET_ID = "a5-source-asset";

const readProject = async (page: Page, projectId: string): Promise<Project> =>
  page.evaluate(async (id) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Project read failed: ${response.status}`);
    return (await response.json()).project;
  }, projectId);

const listProjectWorkflows = async (page: Page, projectId: string): Promise<WorkflowRun[]> =>
  page.evaluate(async (id) => {
    const response = await fetch(`/api/workflows?projectId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Workflow list failed: ${response.status}`);
    return (await response.json()).workflows;
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

const openRecentProject = async (page: Page, projectId: string) => {
  await page.getByTitle("Project").click();
  const recent = page.locator(".os-recent-list button").filter({ hasText: PROJECT_NAME }).first();
  await expect(recent).toBeVisible();
  const response = page.waitForResponse(
    (item) =>
      item.request().method() === "GET" &&
      item.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}`),
  );
  await recent.click();
  expect((await response).ok()).toBeTruthy();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
};

const openAgent = async (page: Page) => {
  await page.getByTitle("AI").click();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await expect(page.locator(".a4-agent-toolbar")).toBeVisible();
  await expect(page.locator(".a4-agent-context")).toContainText(
    "a4-mock-provider · a4-mock-model",
  );
};

export const runA5AgentWorkflowBrowserAcceptance = async (page: Page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });

  await page.goto("/");
  await page.getByTitle("Project").click();
  await page.getByLabel("Project name").fill(PROJECT_NAME);
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as { project: Project };
  const projectId = createdBody.project.project.id;

  await applyCommand(page, projectId, "a5-seed-source-asset", {
    type: "add-asset",
    asset: {
      id: SOURCE_ASSET_ID,
      kind: "video",
      relativePath: "assets/a5-source.mp4",
      label: "A5 source",
      mimeType: "video/mp4",
      durationInFrames: 300,
      width: 1920,
      height: 1080,
      sourceFps: 30,
      hasAudio: true,
      sizeBytes: 1024,
    },
  });

  await page.reload();
  await openRecentProject(page, projectId);
  const baseline = await readProject(page, projectId);
  expect(await listProjectWorkflows(page, projectId)).toHaveLength(0);

  await openAgent(page);
  await page
    .locator(".a4-agent-composer textarea")
    .fill(
      "Create a first draft workflow proposal for this product ad using the current source asset. Do not execute the Workflow until I explicitly confirm it.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("PROPOSAL READY", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".a4-agent-activity")).toContainText("request_workflow_action");

  expect((await readProject(page, projectId)).project.revision).toBe(baseline.project.revision);
  expect(await listProjectWorkflows(page, projectId)).toHaveLength(0);

  await page.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(page.getByText("Workflow Action Review", { exact: true })).toBeVisible();
  await expect(page.locator(".a5-agent-workflow-action")).toContainText("create_first_draft");
  await expect(page.locator(".a5-agent-workflow-action")).toContainText("product-ad");
  await expect(page.locator(".a5-agent-workflow-action")).toContainText(SOURCE_ASSET_ID);
  expect((await readProject(page, projectId)).project.revision).toBe(baseline.project.revision);
  expect(await listProjectWorkflows(page, projectId)).toHaveLength(0);

  await page.getByRole("button", { name: "Confirm Workflow Action", exact: true }).click();
  await expect
    .poll(async () => (await listProjectWorkflows(page, projectId)).length, { timeout: 20_000 })
    .toBe(1);
  const [workflow] = await listProjectWorkflows(page, projectId);
  expect(workflow.projectId).toBe(projectId);
  expect(workflow.scenario).toBe("product-ad");
  expect(workflow.sourceAssetIds).toEqual([SOURCE_ASSET_ID]);
  await expect(page.getByText("REVIEWED PROPOSAL", { exact: true })).toHaveCount(0);
};
