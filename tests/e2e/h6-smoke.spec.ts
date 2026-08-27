import { expect, test, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "H6 Browser Smoke";
const CAPTION_ID = "h6-caption";
const SCENE_ID = "h6-proof-scene";
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7r8AAAAASUVORK5CYII=",
  "base64",
);

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
        body: JSON.stringify({
          expectedRevision,
          commandId: operationId,
          command: payload,
        }),
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
  const openResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}`),
  );
  await recent.click();
  expect((await openResponse).ok()).toBeTruthy();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
};

test("H6 Create/Open/Import/Caption/Canvas/AI/Undo/Redo/Save/Reopen", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });

  await page.goto("/");
  await expect(page.getByTitle("Project")).toBeVisible();
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
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);

  const importResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/projects/${encodeURIComponent(projectId)}/media?`),
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "h6-tiny.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  expect((await importResponse).ok()).toBeTruthy();
  await expect(page.getByText("h6-tiny.png", { exact: true }).first()).toBeVisible();

  let seeded = await applyCommand(page, projectId, "h6-e2e-scene", {
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
  seeded = await applyCommand(page, projectId, "h6-e2e-caption", {
    type: "add-clip",
    trackId: "captions-main",
    clip: {
      id: CAPTION_ID,
      type: "caption",
      text: "90% complete in 15 days",
      startFrame: 30,
      durationInFrames: 60,
      enabled: true,
      layer: 100,
      preset: "primary",
      emphasis: "numbers",
      keywords: [],
    },
  });
  expect(seeded.scenes.some((scene) => scene.id === SCENE_ID)).toBeTruthy();

  await page.reload();
  await openRecentProject(page, projectId);

  const captionClip = page.locator(`[data-clip-id="${CAPTION_ID}"]`);
  await expect(captionClip).toBeVisible();
  await captionClip.click();
  await expect(page.locator('[data-inspector-section="typography"]')).toBeVisible();
  const fontSize = page.getByLabel("Font Size");
  await fontSize.fill("64");
  await fontSize.press("Enter");
  await expect
    .poll(async () => {
      const project = await readProject(page, projectId);
      const caption = project.tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.id === CAPTION_ID);
      return caption?.type === "caption" ? caption.style?.fontSize : undefined;
    })
    .toBe(64);

  await page.keyboard.press("Escape");
  const canvas = page.locator('[data-inspector-section="canvas"]');
  await expect(canvas).toBeVisible();
  await canvas.getByLabel("Width").fill("1280");
  await canvas.getByLabel("Height").fill("720");
  await expect(page.getByText("Canvas Change Preview", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply Canvas", exact: true }).click();
  await expect
    .poll(async () => {
      const project = await readProject(page, projectId);
      return `${project.canvas.width}x${project.canvas.height}`;
    })
    .toBe("1280x720");

  const timeReadout = page.locator(".time-readout strong");
  const timeBeforeRemountPlayback = await timeReadout.textContent();
  await page.keyboard.press("Space");
  await expect.poll(async () => timeReadout.textContent()).not.toBe(timeBeforeRemountPlayback);
  await page.keyboard.press("Space");

  await page.getByTitle("AI").click();
  await page.getByRole("button", { name: "Analyze Scenes", exact: true }).click();
  await expect(page.getByText("Review Recommendations", { exact: true })).toBeVisible();
  const applySelected = page.getByRole("button", { name: /Apply Selected/ });
  await expect(applySelected).toBeEnabled();
  await applySelected.click();

  let appliedMotionId = "";
  await expect
    .poll(async () => {
      const project = await readProject(page, projectId);
      const ids = motionClipIds(project);
      appliedMotionId = ids[0] ?? "";
      return ids.length;
    })
    .toBe(1);
  expect(appliedMotionId).not.toBe("");

  await page.locator(".timeline-actions button").filter({ hasText: "↶" }).click();
  await expect
    .poll(async () => motionClipIds(await readProject(page, projectId)).includes(appliedMotionId))
    .toBe(false);

  await page.locator(".timeline-actions button").filter({ hasText: "↷" }).click();
  await expect
    .poll(async () => motionClipIds(await readProject(page, projectId)).includes(appliedMotionId))
    .toBe(true);

  const saveResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}`),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saveResponse).ok()).toBeTruthy();

  await openRecentProject(page, projectId);
  const reopened = await readProject(page, projectId);
  expect(reopened.canvas).toMatchObject({ width: 1280, height: 720 });
  const reopenedCaption = reopened.tracks
    .flatMap((track) => track.clips)
    .find((clip) => clip.id === CAPTION_ID);
  expect(reopenedCaption?.type === "caption" ? reopenedCaption.style?.fontSize : undefined).toBe(
    64,
  );
  expect(motionClipIds(reopened)).toContain(appliedMotionId);
});
