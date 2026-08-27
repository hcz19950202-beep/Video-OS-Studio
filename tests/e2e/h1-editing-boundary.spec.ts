import { expect, test, type Page } from "@playwright/test";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "H1 Editing Boundary";

const readProject = async (page: Page, projectId: string): Promise<Project> =>
  page.evaluate(async (id) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Project read failed: ${response.status}`);
    return (await response.json()).project;
  }, projectId);

test("H1 typing stays local until commit and creates one history intent", async ({ page }) => {
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

  const duringDraft = await readProject(page, projectId);
  expect(duringDraft.project.revision).toBe(initialRevision);
  expect(duringDraft.brand.typography.headingFont).toBe(originalFont);
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
});
