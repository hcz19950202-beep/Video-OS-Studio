import { expect, test, type Page } from "@playwright/test";

const PROJECT_NAME = "B5c Mission Workspace";
const MISSION_TITLE = "Launch proof-led B2B short";

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

const openMissionWorkspace = async (page: Page) => {
  await page.getByTitle("AI").click();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await page.getByText("Advanced", { exact: true }).click();
  await page.getByRole("button", { name: "Mission", exact: true }).click();
  await expect(page.getByTestId("advanced-mission-detail")).toBeVisible();
  await expect(page.getByText("Production Mission Workspace", { exact: true })).toBeVisible();
};

test("B5c Mission workspace reloads durable Mission truth and exposes no fake executor action", async ({
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
  const createProjectResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  const created = await createProjectResponse;
  expect(created.status()).toBe(201);
  const projectId = ((await created.json()) as { project: { project: { id: string } } }).project
    .project.id;

  await openMissionWorkspace(page);
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  await page.getByLabel("Mission title").fill(MISSION_TITLE);
  await page
    .getByLabel("Production brief")
    .fill(
      "Create a concise social video that leads with measurable proof and keeps final review enabled.",
    );
  const createMissionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/api/projects/${encodeURIComponent(projectId)}/missions`),
  );
  await page.getByRole("button", { name: "Create mission", exact: true }).click();
  expect((await createMissionResponse).status()).toBe(201);
  await expect(page.getByRole("heading", { name: MISSION_TITLE })).toBeVisible();
  await expect(page.getByText("No Plan yet", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not fake an Approve-and-continue action/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Run|Advance|Approve|Approve and continue)$/i }),
  ).toHaveCount(0);

  const autonomy = page.getByLabel("Autonomy mode");
  await expect(autonomy).toHaveValue("guided");
  const patchResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/projects/${encodeURIComponent(projectId)}/missions/`),
  );
  await autonomy.selectOption("assist");
  expect((await patchResponse).ok()).toBeTruthy();
  await expect(autonomy).toHaveValue("assist");

  await page.reload();
  await openRecentProject(page, projectId);
  await openMissionWorkspace(page);
  await expect(page.getByRole("heading", { name: MISSION_TITLE })).toBeVisible();
  await expect(page.getByLabel("Autonomy mode")).toHaveValue("assist");
  await expect(
    page.getByText(/Derived from durable render, QA, and revision evidence/),
  ).toBeVisible();

  const cancelResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().includes(`/api/projects/${encodeURIComponent(projectId)}/missions/`),
  );
  await page.getByRole("button", { name: "Cancel mission", exact: true }).click();
  expect((await cancelResponse).ok()).toBeTruthy();
  await expect(
    page.locator(".b5c-mission-hero").getByText("CANCELLED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Autonomy mode")).toBeDisabled();

  await page.reload();
  await openRecentProject(page, projectId);
  await openMissionWorkspace(page);
  await expect(
    page.locator(".b5c-mission-hero").getByText("CANCELLED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Autonomy mode")).toBeDisabled();
});
