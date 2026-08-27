import { expect, test, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "A7 Agent Product Acceptance";
const PROOF_SCENE_ID = "a7-proof-scene";
const PROOF_CAPTION_ID = "a7-proof-caption";
const MANUAL_SCENE_ID = "a7-manual-scene";

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
  await page.getByRole("tab", { name: "Agent", exact: true }).click();
  await expect(page.locator(".a4-agent-toolbar")).toBeVisible();
  await expect(page.locator(".a4-agent-context")).toContainText(
    "a4-mock-provider · a4-mock-model",
  );
};

const sendProposalRequest = async (page: Page, prompt: string) => {
  await page.locator(".a4-agent-composer textarea").fill(prompt);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("PROPOSAL READY", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".a4-agent-activity")).toContainText("propose_visual_plan");
};

test("A7 stale proposal → re-plan latest → preserve manual edit → apply once → reload", async ({
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
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const createdBody = (await created.json()) as { project: Project };
  const projectId = createdBody.project.project.id;

  await applyCommand(page, projectId, "a7-seed-proof-scene", {
    type: "add-scene",
    scene: {
      id: PROOF_SCENE_ID,
      name: "Proof",
      semanticType: "proof",
      startFrame: 0,
      endFrame: createdBody.project.canvas.durationInFrames,
      visualStrategy: { intensity: "high", preferredEngines: ["remotion"] },
    },
  });
  await applyCommand(page, projectId, "a7-seed-proof-caption", {
    type: "add-clip",
    trackId: "captions-main",
    clip: {
      id: PROOF_CAPTION_ID,
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
  await openAgent(page);

  await sendProposalRequest(
    page,
    "Create a reviewable visual proposal emphasizing the proof numbers and CTA. Do not apply it.",
  );
  const proposed = await readProject(page, projectId);
  const proposalRevision = proposed.project.revision;
  const motionBefore = motionClipIds(proposed);

  const manuallyEdited = await applyCommand(page, projectId, "a7-user-manual-edit", {
    type: "add-scene",
    scene: {
      id: MANUAL_SCENE_ID,
      name: "Manual user edit",
      semanticType: "proof",
      startFrame: 0,
      endFrame: createdBody.project.canvas.durationInFrames,
      visualStrategy: { intensity: "low", preferredEngines: ["remotion"] },
    },
  });
  expect(manuallyEdited.project.revision).toBe(proposalRevision + 1);
  expect(manuallyEdited.scenes.some((scene) => scene.id === MANUAL_SCENE_ID)).toBe(true);

  await page.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(page.getByText("STALE PROPOSAL", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply All", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Re-plan latest", exact: true }).click();
  await expect(page.getByText("PROPOSAL READY", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".a4-agent-activity")).toContainText("propose_visual_plan");

  const afterReplan = await readProject(page, projectId);
  expect(afterReplan.project.revision).toBe(proposalRevision + 1);
  expect(afterReplan.scenes.some((scene) => scene.id === MANUAL_SCENE_ID)).toBe(true);
  expect(motionClipIds(afterReplan)).toEqual(motionBefore);

  await page.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(page.getByText("Structured change preview", { exact: true })).toBeVisible();
  const applySelected = page.getByRole("button", { name: /Apply Selected \(\d+\)/ }).first();
  await expect(applySelected).toBeEnabled();
  await applySelected.click();

  let applied: Project | undefined;
  await expect
    .poll(async () => {
      applied = await readProject(page, projectId);
      return applied.project.revision;
    })
    .toBe(proposalRevision + 2);

  expect(applied?.scenes.some((scene) => scene.id === MANUAL_SCENE_ID)).toBe(true);
  const motionAfter = motionClipIds(applied!);
  expect(motionAfter.length).toBeGreaterThan(motionBefore.length);
  expect(new Set(motionAfter).size).toBe(motionAfter.length);

  await page.reload();
  await openRecentProject(page, projectId);
  await openAgent(page);
  const reopened = await readProject(page, projectId);
  expect(reopened.project.revision).toBe(proposalRevision + 2);
  expect(reopened.scenes.some((scene) => scene.id === MANUAL_SCENE_ID)).toBe(true);
  expect(motionClipIds(reopened)).toEqual(motionAfter);
  await expect(page.locator(".a4-agent-conversation")).toContainText(
    "The Project or Workflow state changed. Read the latest context",
  );
  await expect(page.locator(".a4-agent-toolbar select option")).toHaveCount(1);
});
