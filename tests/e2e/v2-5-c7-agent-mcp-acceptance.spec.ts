import { expect, test, type Page } from "@playwright/test";
import { LOCAL_MCP_PROTOCOL_VERSION } from "@/lib/mcp/bridge-controller";
import type { Project } from "@/schemas/project";

const PROJECT_NAME = "V2.5 C7 Agent MCP Acceptance";
const PROPOSAL_TITLE = "C7 external caption approval";
const CLIP_ID = "c7-external-caption";
const CLIENT_INFO = {
  name: "video-os-c7-browser-external-client",
  version: "1.0.0",
};

type McpResponse<T> = {
  result?: T & { _meta?: Record<string, unknown> };
  error?: { code: number; message: string };
};

const mcpPost = async <T>(
  address: string,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  toolName?: string,
) => {
  const response = await fetch(address, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": LOCAL_MCP_PROTOCOL_VERSION,
      "Mcp-Method": method,
      ...(toolName ? { "Mcp-Name": toolName } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-${toolName ?? "server"}`,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": LOCAL_MCP_PROTOCOL_VERSION,
          "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
        },
      },
    }),
  });
  return {
    status: response.status,
    body: (await response.json()) as McpResponse<T>,
  };
};

const readProject = async (page: Page, projectId: string) => {
  const response = await page.request.get(`/api/projects/${encodeURIComponent(projectId)}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { project: Project };
  return payload.project;
};

test("C7 external MCP Proposal is reviewed in Studio, applied once, attributed, and survives bridge restart", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("video-os-studio-locale", "en-US");
    localStorage.setItem("video-os-studio-theme", "dark");
    localStorage.removeItem("video-os-v2.1-workspace-layout");
  });

  const createdResponse = await page.request.post("/api/projects", {
    data: { name: PROJECT_NAME, width: 1080, height: 1920, fps: 30 },
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as { project: Project };
  const projectId = created.project.project.id;
  expect(created.project.project.revision).toBe(0);

  await page.goto("/");
  await page.getByTestId("open-projects").click();
  await page.locator(".os-recent-list button").filter({ hasText: PROJECT_NAME }).first().click();
  await expect(page.locator(".v21-project-title")).toContainText(PROJECT_NAME);

  await page.getByTestId("open-connection-center").click();
  const center = page.getByTestId("connection-center");
  await expect(center).toBeVisible();
  await expect(page.getByTestId("mcp-active-project")).toHaveText(projectId);
  await center.getByRole("button", { name: "Start controlled bridge", exact: true }).click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText(/ready|connected|disconnected/);
  const initialAddress = (await page.getByTestId("mcp-bridge-address").textContent()) ?? "";
  expect(initialAddress).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/mcp$/);

  await page.getByTestId("issue-mcp-credential").click();
  const credential = page.getByTestId("mcp-one-time-credential");
  await expect(credential).toBeVisible();
  const token = (await credential.locator("code").textContent()) ?? "";
  expect(token.length).toBeGreaterThan(32);

  const beforeMcp = await readProject(page, projectId);
  const list = await mcpPost<{ tools: Array<{ name: string }> }>(
    initialAddress,
    token,
    "tools/list",
  );
  expect(list.status).toBe(200);
  expect(list.body.result?.tools.map((tool) => tool.name)).toContain("create_edit_proposal");

  const readBefore = await mcpPost<{
    structuredContent: { projectId: string; revision: number };
    isError: boolean;
  }>(
    initialAddress,
    token,
    "tools/call",
    { name: "read_project_summary", arguments: {} },
    "read_project_summary",
  );
  expect(readBefore.status).toBe(200);
  expect(readBefore.body.result?.isError).toBe(false);
  expect(readBefore.body.result?.structuredContent).toMatchObject({
    projectId,
    revision: 0,
  });

  const proposalInput = {
    title: PROPOSAL_TITLE,
    summary: "External MCP may propose this Timeline change but cannot apply it.",
    rationale: ["The edit remains revision-bound and reviewable inside Video OS."],
    operations: [
      {
        id: "c7-caption-project-transaction",
        kind: "project-transaction",
        summary: "Add one caption clip after explicit Video OS approval.",
        payload: {
          label: "C7 external approved caption",
          commands: [
            {
              type: "add-clip",
              trackId: "captions-main",
              clip: {
                id: CLIP_ID,
                type: "caption",
                text: "External MCP approved",
                enabled: true,
                layer: 4,
                startFrame: 20,
                durationInFrames: 40,
              },
            },
          ],
        },
      },
    ],
    warnings: [],
  };
  const proposed = await mcpPost<{
    structuredContent: {
      proposal: { id: string; sessionId: string; baseProjectRevision: number; status: string };
    };
    isError: boolean;
  }>(
    initialAddress,
    token,
    "tools/call",
    { name: "create_edit_proposal", arguments: proposalInput },
    "create_edit_proposal",
  );
  expect(proposed.status).toBe(200);
  expect(proposed.body.result?.isError).toBe(false);
  const proposal = proposed.body.result?.structuredContent.proposal;
  expect(proposal).toMatchObject({ baseProjectRevision: 0, status: "draft" });
  expect(proposal?.id).toBeTruthy();
  expect(proposal?.sessionId).toBeTruthy();

  const afterProposal = await readProject(page, projectId);
  expect(afterProposal).toEqual(beforeMcp);
  expect(
    afterProposal.tracks.flatMap((track) => track.clips).some((clip) => clip.id === CLIP_ID),
  ).toBe(false);

  await center.getByRole("button", { name: "Close" }).click();
  await page.getByTestId("agent-surface-toggle").click();
  await expect(page.getByTestId("unified-agent-conversation")).toBeVisible();
  const proposalCard = page.getByTestId("agent-proposal-item").filter({ hasText: PROPOSAL_TITLE });
  await expect(proposalCard).toBeVisible();
  await expect(proposalCard).toContainText("rev 0");

  await proposalCard.getByRole("button", { name: "Review / Diff", exact: true }).click();
  await expect(proposalCard).toContainText("Structured change preview");
  await expect(proposalCard).toContainText("rev 0 → 0");
  await proposalCard.getByRole("button", { name: "Apply All", exact: true }).click();

  await expect(page.locator(`[data-clip-id="${CLIP_ID}"]`)).toBeVisible();
  await expect.poll(async () => (await readProject(page, projectId)).project.revision).toBe(1);
  const appliedProject = await readProject(page, projectId);
  expect(
    appliedProject.tracks.flatMap((track) => track.clips).some((clip) => clip.id === CLIP_ID),
  ).toBe(true);

  const historyResponse = await page.request.get(
    `/api/projects/${encodeURIComponent(projectId)}/transactions`,
  );
  expect(historyResponse.ok()).toBeTruthy();
  const history = (await historyResponse.json()) as {
    transactions: Array<{
      operationId: string;
      label: string;
      beforeRevision: number;
      appliedRevision: number;
      origin: null | { kind: string; sessionId?: string; proposalId?: string };
    }>;
  };
  expect(history.transactions).toHaveLength(1);
  expect(history.transactions[0]).toMatchObject({
    label: "C7 external approved caption",
    beforeRevision: 0,
    appliedRevision: 1,
    origin: {
      kind: "external-agent",
      sessionId: proposal?.sessionId,
      proposalId: proposal?.id,
    },
  });

  await page.getByTestId("open-connection-center").click();
  const reopenedCenter = page.getByTestId("connection-center");
  await expect(reopenedCenter).toBeVisible();
  await expect(page.getByTestId("mcp-activity-log")).not.toContainText(token);
  await reopenedCenter.getByRole("button", { name: "Stop bridge", exact: true }).click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText("stopped");
  await reopenedCenter
    .getByRole("button", { name: "Start controlled bridge", exact: true })
    .click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText(/ready|connected|disconnected/);
  const restartedAddress = (await page.getByTestId("mcp-bridge-address").textContent()) ?? "";
  expect(restartedAddress).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/mcp$/);

  const readAfterRestart = await mcpPost<{
    structuredContent: { projectId: string; revision: number };
    isError: boolean;
  }>(
    restartedAddress,
    token,
    "tools/call",
    { name: "read_project_summary", arguments: {} },
    "read_project_summary",
  );
  expect(readAfterRestart.status).toBe(200);
  expect(readAfterRestart.body.result?.isError).toBe(false);
  expect(readAfterRestart.body.result?.structuredContent).toMatchObject({
    projectId,
    revision: 1,
  });
  await expect(page.getByTestId("mcp-activity-log")).not.toContainText(token);

  await reopenedCenter.getByRole("button", { name: "Stop bridge", exact: true }).click();
  await expect(page.getByTestId("mcp-bridge-status")).toHaveText("stopped");
});
