import {expect,test} from "@playwright/test";

const PROJECT_NAME="V2.5 C2 Unified Conversation";

test("C2 opens directly into one Agent conversation with execution policy and advanced details",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.addInitScript(()=>{
    localStorage.setItem("video-os-studio-locale","en-US");
    localStorage.setItem("video-os-studio-theme","dark");
  });

  await page.goto("/");
  await page.evaluate(()=>localStorage.removeItem("video-os-v2.1-workspace-layout"));
  await page.reload();

  await page.getByTestId("open-projects").click();
  const projectName=page.getByRole("textbox",{name:"Project name",exact:true});
  await projectName.fill(PROJECT_NAME);
  const createResponse=page.waitForResponse(response=>response.request().method()==="POST"&&response.url().endsWith("/api/projects"));
  await page.getByRole("button",{name:"Create Project",exact:true}).click();
  expect((await createResponse).status()).toBe(201);

  await page.getByTestId("agent-surface-toggle").click();
  await expect(page.getByTestId("unified-ai-workspace")).toBeVisible();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await expect(page.getByTestId("agent-conversation-list")).toContainText("You do not need to choose Mission, Agent, Composer, or Workflow first");
  await expect(page.getByTestId("agent-production-cards")).toBeVisible();
  await expect(page.getByTestId("agent-mission-card")).toBeVisible();
  await expect(page.getByTestId("agent-qa-card")).toBeVisible();

  const executionMode=page.getByRole("combobox",{name:"Execution mode",exact:true});
  await expect(executionMode).toHaveValue("review-first");
  await executionMode.selectOption("plan-only");
  await expect(executionMode).toHaveValue("plan-only");
  await expect(page.getByTestId("agent-execution-mode")).toContainText("Read, analyze, search, plan and propose only");

  await page.getByText("Advanced",{exact:true}).click();
  await expect(page.getByRole("button",{name:"Mission",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Composer",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Workflow",exact:true})).toBeVisible();

  await page.getByRole("button",{name:"Mission",exact:true}).click();
  await expect(page.getByTestId("advanced-mission-detail")).toBeVisible();
  await page.getByRole("button",{name:"Conversation",exact:true}).click();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);
});
