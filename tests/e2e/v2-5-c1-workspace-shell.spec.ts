import { expect, test } from "@playwright/test";

const PROJECT_NAME = "V2.5 C1 Workspace Acceptance";

test("C1 keeps Agent Viewer Context and Timeline stable in one desktop workspace", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("video-os-v2.1-workspace-layout"));
  await page.reload();

  await expect(page.getByTestId("agent-native-workspace")).toBeVisible();
  await expect(page.locator('[data-workspace-region="viewer"]')).toBeVisible();
  await expect(page.getByTestId("agent-context-dock")).toBeVisible();
  await expect(page.locator('[data-workspace-region="timeline"]')).toBeVisible();
  await expect(page.getByTestId("agent-native-command-strip")).toBeVisible();

  const workspace = page.locator(".v21-workspace");
  const leftResize = page.getByRole("separator", { name: "Resize Agent Workspace" });
  const beforeWidth = await workspace.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--v21-left-width"),
  );
  await leftResize.focus();
  await leftResize.press("ArrowRight");
  const afterWidth = await workspace.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--v21-left-width"),
  );
  expect(afterWidth).not.toBe(beforeWidth);

  await page.reload();
  await expect(page.getByTestId("agent-native-workspace")).toBeVisible();
  await expect
    .poll(() =>
      workspace.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--v21-left-width"),
      ),
    )
    .toBe(afterWidth);

  await page.getByTestId("open-projects").click();
  await page.getByLabel("Project name").fill(PROJECT_NAME);
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  expect((await createResponse).status()).toBe(201);
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
  await expect(page.getByTestId("project-connection-status")).toContainText("Project connected");

  await page.getByTestId("agent-surface-toggle").click();
  await expect(page.getByTestId("agent-native-workspace")).toContainText("Agent Workspace");

  await page.getByTestId("open-projects").click();
  await expect(page.getByLabel("Project name")).toBeVisible();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
  await page.getByTestId("agent-surface-toggle").click();

  await page.getByRole("tab", { name: "Assets", exact: true }).click();
  await expect(page.locator('[data-context-tab="assets"]')).toBeVisible();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
  await page.getByTestId("open-history").click();
  await expect(page.locator('[data-context-tab="history"]')).toBeVisible();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
  await page.getByRole("tab", { name: "Inspector", exact: true }).click();

  await page.getByRole("button", { name: "Hide Timeline", exact: true }).click();
  await expect(page.locator('[data-workspace-region="timeline"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Show Timeline", exact: true }).click();
  await expect(page.locator('[data-workspace-region="timeline"]')).toBeVisible();

  const screenshot = await page.screenshot({
    path: testInfo.outputPath("v2-5-c1-1440.png"),
    fullPage: true,
  });
  await testInfo.attach("v2.5-c1-1440", { body: screenshot, contentType: "image/png" });
});
