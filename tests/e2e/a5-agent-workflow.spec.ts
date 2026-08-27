import { test } from "@playwright/test";
import { runA5AgentWorkflowBrowserAcceptance } from "../support/a5-agent-workflow-browser";

test("A5 Agent Workflow requires explicit confirmation", async ({ page }) => {
  await runA5AgentWorkflowBrowserAcceptance(page);
});
