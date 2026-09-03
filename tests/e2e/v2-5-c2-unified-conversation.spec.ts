import { expect, test } from "@playwright/test";

const PROJECT_NAME = "V2.5 C2 Unified Conversation";

test("C2 uses one unified Agent conversation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("video-os-v2.1-workspace-layout"));
  await page.reload();

  await page.getByTestId("open-projects").click();
  const projectName = page.getByRole("textbox", { name: "Project name", exact: true });
  await projectName.fill(PROJECT_NAME);
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/projects"),
  );
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  expect((await createResponse).status()).toBe(201);

  await page.getByTestId("agent-surface-toggle").click();
  await expect(page.getByTestId("unified-ai-workspace")).toBeVisible();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await expect(page.getByTestId("agent-conversation-list")).toContainText("do not need to choose");
  await expect(page.getByTestId("agent-production-cards")).toBeVisible();
  await expect(page.getByTestId("agent-mission-card")).toBeVisible();
  await expect(page.getByTestId("agent-qa-card")).toBeVisible();

  const provider = page.getByRole("combobox", { name: "Built-in Agent provider", exact: true });
  const model = page.getByRole("combobox", { name: "Agent model", exact: true });
  await expect(provider).toHaveValue("volcengine-agent-plan");
  await expect(model).toHaveValue("ark-code-latest");
  await expect(page.getByTestId("agent-provider-model")).toContainText("Provider and model are pinned");

  const executionMode = page.getByRole("combobox", { name: "Execution mode", exact: true });
  await expect(executionMode).toHaveValue("review-first");
  await executionMode.selectOption("plan-only");
  await expect(executionMode).toHaveValue("plan-only");
  await expect(page.getByTestId("agent-execution-mode")).toContainText("Read, analyze, search");

  await page.getByText("Advanced", { exact: true }).click();
  for (const name of ["Mission", "Composer", "Workflow"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Mission", exact: true }).click();
  await expect(page.getByTestId("advanced-mission-detail")).toBeVisible();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await page.getByRole("button", { name: "Conversation", exact: true }).click();
  await expect(page.getByTestId("agent-advanced-detail")).toHaveCount(0);
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
});
