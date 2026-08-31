import { expect, test } from "@playwright/test";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "C4 Connection Center";
const READ_TOOLS = [
  "read_project_summary",
  "read_timeline",
  "read_transcript",
  "read_selection",
  "list_assets",
  "search_assets",
  "read_mission",
  "read_qa",
] as const;

test("C4 Connection Center read bridge", async ({ page }) => {
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
  const body = (await created.json()) as { project: Project };
  const projectId = body.project.project.id;
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);

  await page.getByTestId("open-connection-center").click();
  const center = page.getByTestId("connection-center");
  await expect(center).toBeVisible();
  await expect(page.getByTestId("mcp-active-project")).toHaveText(projectId);
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText("stopped");

  await center.getByRole("button", { name: "Start read bridge", exact: true }).click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText(
    /ready|connected|disconnected/,
  );
  const address = await page.getByTestId("mcp-bridge-address").textContent();
  expect(address).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/mcp$/);

  const catalog = page.getByTestId("mcp-read-tool-catalog");
  for (const tool of READ_TOOLS) {
    await expect(catalog.getByText(tool, { exact: true })).toBeVisible();
  }

  await page.getByTestId("issue-mcp-credential").click();
  const credential = page.getByTestId("mcp-one-time-credential");
  await expect(credential).toBeVisible();
  const token = (await credential.locator("code").textContent()) ?? "";
  expect(token.length).toBeGreaterThan(32);
  expect(address).not.toContain(token);
  await expect(page.getByTestId("mcp-activity-log")).not.toContainText(token);

  await center.getByRole("button", { name: "Close" }).click();
  await page.getByTestId("open-connection-center").click();
  await expect(page.getByTestId("mcp-one-time-credential")).toHaveCount(0);
  await expect(page.getByTestId("mcp-read-tool-catalog")).not.toContainText(token);

  await page
    .getByTestId("connection-center")
    .getByRole("button", { name: "Stop bridge", exact: true })
    .click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText("stopped");
});
