import { expect, test, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "A4 Agent Browser";
const SCENE_ID = "a4-proof-scene";
const CAPTION_ID = "a4-proof-caption";

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

const motionClipIds = (project: Project) =>
  project.tracks
    .find((track) => track.id === "motion-main")
    ?.clips.filter((clip) => clip.type === "motion")
    .map((clip) => clip.id) ?? [];

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
  await expect(page.locator(".a4-agent-context")).toContainText("a4-mock-provider · a4-mock-model");
};

const sendAgent = async (page: Page, prompt: string) => {
  await page.locator(".a4-agent-composer textarea").fill(prompt);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("PROPOSAL READY", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".a4-agent-activity")).toContainText("propose_visual_plan");
};

test("A4 Agent selection → proposal → Review/Apply → reopen → stale guard", async ({ page }) => {
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

  await applyCommand(page, projectId, "a4-seed-scene", {
    type: "add-scene",
    scene: {
      id: SCENE_ID,
      name: "Proof",
      semanticType: "proof",
      startFrame: 0,
      endFrame: createdBody.project.canvas.durationInFrames,
      visualStrategy: { intensity: "high", preferredEngines: ["remotion"] },
    },
  });
  await applyCommand(page, projectId, "a4-seed-caption", {
    type: "add-clip",
    trackId: "captions-main",
    clip: {
      id: CAPTION_ID,
      type: "caption",
      text: "90% complete in 15 days — send us your project",
      startFrame: 30,
      durationInFrames: 90,
      enabled: true,
      layer: 100,
      preset: "primary",
      emphasis: "numbers",
      keywords: [],
    },
  });

  await page.reload();
  await openRecentProject(page, projectId);
  const caption = page.locator(`[data-clip-id="${CAPTION_ID}"]`);
  await expect(caption).toBeVisible();
  await caption.click();
  await openAgent(page);
  await expect(page.locator(".a4-agent-context")).toContainText(`Selection · Clip ${CAPTION_ID}`);

  const beforeProposal = await readProject(page, projectId);
  await sendAgent(
    page,
    "Create a reviewable visual proposal for the selected proof caption. Do not apply it.",
  );
  const afterProposal = await readProject(page, projectId);
  expect(afterProposal.project.revision).toBe(beforeProposal.project.revision);
  expect(motionClipIds(afterProposal)).toEqual(motionClipIds(beforeProposal));

  await page.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(page.getByText("Structured change preview", { exact: true })).toBeVisible();
  const afterReview = await readProject(page, projectId);
  expect(afterReview.project.revision).toBe(beforeProposal.project.revision);
  await expect(page.locator(".a4-agent-diff-counts").first()).toContainText("add");

  const applySelected = page.getByRole("button", { name: /Apply Selected \(\d+\)/ }).first();
  await expect(applySelected).toBeEnabled();
  await applySelected.click();
  let appliedMotionId = "";
  await expect
    .poll(async () => {
      const current = await readProject(page, projectId);
      appliedMotionId = motionClipIds(current)[0] ?? "";
      return current.project.revision;
    })
    .toBe(beforeProposal.project.revision + 1);
  expect(appliedMotionId).not.toBe("");

  // The server revision can become visible before the browser finishes the apply response and
  // pushes its local Undo entry. The apply control disappears only after that client-side path.
  await expect(applySelected).toHaveCount(0);
  await page.locator(".timeline-actions button").filter({ hasText: "↶" }).click();
  await expect
    .poll(async () => motionClipIds(await readProject(page, projectId)).includes(appliedMotionId))
    .toBe(false);

  await page.reload();
  await openRecentProject(page, projectId);
  await openAgent(page);
  await expect(page.locator(".a4-agent-conversation")).toContainText(
    "Create a reviewable visual proposal for the selected proof caption.",
  );
  await expect(page.locator(".a4-agent-toolbar select option")).toHaveCount(1);

  await sendAgent(
    page,
    "Create one more reviewable visual proposal against the current Project revision.",
  );
  const beforeConflict = await readProject(page, projectId);
  await applyCommand(page, projectId, "a4-external-revision", {
    type: "add-scene",
    scene: {
      id: "a4-external-scene",
      name: "External revision",
      semanticType: "proof",
      startFrame: 0,
      endFrame: beforeConflict.canvas.durationInFrames,
      visualStrategy: { intensity: "low", preferredEngines: ["remotion"] },
    },
  });

  await page.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(page.getByText("STALE PROPOSAL", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Re-plan latest", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Apply Selected/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply All", exact: true })).toHaveCount(0);
});
