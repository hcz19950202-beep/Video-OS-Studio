import { expect, test, type Page } from "@playwright/test";
import type { ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "H1 Editing Boundary";
const MOTION_ID = "h1-slider-motion";

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

const motionProgress = (project: Project) => {
  const motion = project.tracks
    .flatMap((track) => track.clips)
    .find((clip) => clip.id === MOTION_ID);
  return motion?.type === "motion" ? Number(motion.props.progress) : undefined;
};

test("H1 typing and slider drafts commit as one history intent", async ({ page }) => {
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
  const originalFont = createdBody.project.brand.typography.headingFont;
  const initialRevision = createdBody.project.project.revision;

  const headingFont = page.getByLabel("Heading Font");
  await expect(headingFont).toBeVisible();

  let commandPosts = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}/commands`)
    ) {
      commandPosts += 1;
    }
  });

  const nextFont = `${originalFont} H1 Draft`;
  await headingFont.fill(nextFont);

  const duringTextDraft = await readProject(page, projectId);
  expect(duringTextDraft.project.revision).toBe(initialRevision);
  expect(duringTextDraft.brand.typography.headingFont).toBe(originalFont);
  expect(commandPosts).toBe(0);

  await headingFont.press("Enter");

  await expect
    .poll(async () => {
      const latest = await readProject(page, projectId);
      return {
        revision: latest.project.revision,
        headingFont: latest.brand.typography.headingFont,
      };
    })
    .toEqual({ revision: initialRevision + 1, headingFont: nextFont });
  expect(commandPosts).toBe(1);

  await page.locator(".timeline-actions button").filter({ hasText: "↶" }).click();
  await expect
    .poll(async () => (await readProject(page, projectId)).brand.typography.headingFont)
    .toBe(originalFont);

  await applyCommand(page, projectId, "h1-seed-slider-motion", {
    type: "add-clip",
    trackId: "motion-main",
    clip: {
      id: MOTION_ID,
      type: "motion",
      engine: "remotion",
      effectId: "metric-focus",
      props: {
        title: "COMPLETION",
        value: "90",
        unit: "%+",
        accentColor: "#55d187",
        progress: 90,
      },
      startFrame: 0,
      durationInFrames: 120,
      enabled: true,
      layer: 20,
    },
  });

  await page.reload();
  await openRecentProject(page, projectId);
  await page.locator(`[data-clip-id="${MOTION_ID}"]`).click();

  const slider = page.getByLabel("Progress");
  await expect(slider).toBeVisible();
  const sliderBase = await readProject(page, projectId);
  expect(motionProgress(sliderBase)).toBe(90);
  commandPosts = 0;

  await slider.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "42";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const duringSliderDraft = await readProject(page, projectId);
  expect(duringSliderDraft.project.revision).toBe(sliderBase.project.revision);
  expect(motionProgress(duringSliderDraft)).toBe(90);
  expect(commandPosts).toBe(0);

  await slider.dispatchEvent("pointerup");
  await expect
    .poll(async () => {
      const latest = await readProject(page, projectId);
      return { revision: latest.project.revision, progress: motionProgress(latest) };
    })
    .toEqual({ revision: sliderBase.project.revision + 1, progress: 42 });
  expect(commandPosts).toBe(1);

  await page.getByLabel("Progress").blur();
  await page.waitForTimeout(150);
  const afterBlur = await readProject(page, projectId);
  expect(afterBlur.project.revision).toBe(sliderBase.project.revision + 1);
  expect(commandPosts).toBe(1);

  await page.locator(".timeline-actions button").filter({ hasText: "↶" }).click();
  await expect.poll(async () => motionProgress(await readProject(page, projectId))).toBe(90);
});
