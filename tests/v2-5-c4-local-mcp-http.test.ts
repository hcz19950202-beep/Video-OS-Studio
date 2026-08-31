import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AgentContextService } from "@/lib/ai/context";
import {
  SharedAgentToolContractSchema,
  type SharedAgentToolContract,
} from "@/lib/ai/tools/shared-contract";
import {
  SharedToolRegistry,
  type RegisteredSharedTool,
} from "@/lib/ai/tools/shared-registry";
import {
  LOCAL_MCP_MAX_REQUEST_BYTES,
  LocalMcpHttpServer,
} from "@/lib/mcp/local-http-server";
import {
  LOCAL_MCP_PROTOCOL_VERSION,
  LOCAL_MCP_STALE_CLIENT_MS,
  LocalMcpBridgeController,
} from "@/lib/mcp/bridge-controller";
import { createProject } from "@/lib/project/factory";
import { ProjectSchema } from "@/schemas/project";

const execFileAsync = promisify(execFile);
const TOOL_IDS = [
  "read_project_summary",
  "read_timeline",
  "read_transcript",
  "read_selection",
  "list_assets",
  "search_assets",
  "read_mission",
  "read_qa",
] as const;
const EmptyInput = z.object({}).strict();
const Output = z.object({ projectId: z.string(), toolId: z.string() }).strict();

const readContract = (toolId: string): SharedAgentToolContract =>
  SharedAgentToolContractSchema.parse({
    toolId,
    version: "1.0.0",
    description: `Read bounded ${toolId} data from the active Video OS Project.`,
    inputJsonSchema: { type: "object", properties: {}, additionalProperties: false },
    outputJsonSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, toolId: { type: "string" } },
      required: ["projectId", "toolId"],
      additionalProperties: false,
    },
    riskClass: "R0",
    requiredScopes: ["project:read"],
    approval: { defaultMode: "auto", allowSessionOverride: false },
    revisionPolicy: "none",
    idempotency: "read-only",
    timeoutMs: 1_000,
    cancellation: "request-scoped",
    audit: {
      eventKind: `tool.${toolId}`,
      recordArguments: false,
      sensitiveArgumentKeys: [],
      recordResultSummary: true,
    },
  });

const registry = new SharedToolRegistry(
  TOOL_IDS.map(
    (toolId): RegisteredSharedTool => ({
      contract: readContract(toolId),
      inputSchema: EmptyInput,
      outputSchema: Output,
      handler: (_input, context) => ({ projectId: context.projectId, toolId }),
    }),
  ),
);

const project = ProjectSchema.parse(
  createProject({
    id: "c4-active-project",
    name: "C4 MCP Active Project",
    now: "2026-08-31T00:00:00.000Z",
    durationInFrames: 300,
  }),
);

const createHarness = async () => {
  const contextService = new AgentContextService({
    load: async (projectId) => {
      if (projectId !== project.project.id) throw new Error("Unknown test project");
      return project;
    },
  });
  const controller = new LocalMcpBridgeController(contextService);
  controller.setActiveProject(project.project.id, {});
  const credential = controller.issueCredential({
    clientType: "test",
    clientLabel: "C4 test client",
  });
  const server = new LocalMcpHttpServer(controller, registry);
  const started = await server.start();
  return { controller, credential, server, address: started.address };
};

type Harness = Awaited<ReturnType<typeof createHarness>>;
const running: Harness[] = [];
afterEach(async () => {
  await Promise.all(
    running.splice(0).map(async (harness) => {
      if (harness.server.isRunning()) await harness.server.stop();
    }),
  );
});

const rpcBody = (method: string, params: Record<string, unknown> = {}) =>
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": LOCAL_MCP_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": { name: "C4 protocol test", version: "1.0.0" },
      },
    },
  });

const post = async (
  harness: Harness,
  method: string,
  params: Record<string, unknown> = {},
  options: { token?: string; name?: string; body?: string } = {},
) =>
  fetch(harness.address, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": LOCAL_MCP_PROTOCOL_VERSION,
      "Mcp-Method": method,
      ...(options.name ? { "Mcp-Name": options.name } : {}),
      ...(options.token === undefined
        ? { Authorization: `Bearer ${harness.credential.token}` }
        : options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
    },
    body: options.body ?? rpcBody(method, params),
  });

describe("V2.5 C4 Local MCP modern HTTP boundary", () => {
  it("refuses non-loopback bind configuration before opening a server", async () => {
    const contextService = new AgentContextService({ load: async () => project });
    const server = new LocalMcpHttpServer(
      new LocalMcpBridgeController(contextService),
      registry,
    );
    await expect(server.start({ host: "0.0.0.0" })).rejects.toThrow(/127\.0\.0\.1/);
    expect(server.isRunning()).toBe(false);
  });

  it("denies missing and invalid bearer credentials", async () => {
    const harness = await createHarness();
    running.push(harness);
    const missing = await post(harness, "server/discover", {}, { token: "" });
    expect(missing.status).toBe(401);
    const invalid = await post(
      harness,
      "server/discover",
      {},
      { token: "not-a-valid-local-mcp-secret-xxxxxxxxxxxxxxxx" },
    );
    expect(invalid.status).toBe(401);
  });

  it("discovers a read-only bridge and lists exactly the C4 minimum R0 catalog", async () => {
    const harness = await createHarness();
    running.push(harness);
    const discover = await post(harness, "server/discover");
    expect(discover.status).toBe(200);
    const discovered = (await discover.json()) as {
      result: { capabilities: { tools: unknown }; supportedVersions: string[] };
    };
    expect(discovered.result.supportedVersions).toEqual([LOCAL_MCP_PROTOCOL_VERSION]);
    expect(discovered.result.capabilities.tools).toBeDefined();

    const listed = await post(harness, "tools/list");
    expect(listed.status).toBe(200);
    const payload = (await listed.json()) as {
      result: { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> };
    };
    expect(payload.result.tools.map((tool) => tool.name).sort()).toEqual([...TOOL_IDS].sort());
    expect(payload.result.tools.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
  });

  it("calls an R0 tool only against the controller-bound active Project", async () => {
    const harness = await createHarness();
    running.push(harness);
    const response = await post(
      harness,
      "tools/call",
      { name: "read_project_summary", arguments: {} },
      { name: "read_project_summary" },
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: {
        structuredContent: { projectId: string; toolId: string };
        isError: boolean;
      };
    };
    expect(payload.result.isError).toBe(false);
    expect(payload.result.structuredContent).toEqual({
      projectId: "c4-active-project",
      toolId: "read_project_summary",
    });
  });

  it("rejects cross-project authority and mutation-field smuggling before handler execution", async () => {
    const harness = await createHarness();
    running.push(harness);
    for (const argumentsValue of [
      { projectId: "other-project" },
      { patch: { op: "replace", path: "/project/name", value: "mutated" } },
      { approved: true },
    ]) {
      const response = await post(
        harness,
        "tools/call",
        { name: "read_project_summary", arguments: argumentsValue },
        { name: "read_project_summary" },
      );
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain("forbidden authority fields");
    }
  });

  it("rejects unknown tools and oversized authenticated requests", async () => {
    const harness = await createHarness();
    running.push(harness);
    const unknown = await post(
      harness,
      "tools/call",
      { name: "delete_project", arguments: {} },
      { name: "delete_project" },
    );
    expect(unknown.status).toBe(400);
    expect(JSON.stringify(await unknown.json())).toContain("Unknown or non-readable MCP tool");

    const oversized = await post(harness, "tools/list", {}, {
      body: "x".repeat(LOCAL_MCP_MAX_REQUEST_BYTES + 1),
    });
    expect(oversized.status).toBe(413);
  });

  it("never exposes credential secrets and marks inactive clients stale", async () => {
    const harness = await createHarness();
    running.push(harness);
    const response = await post(harness, "tools/list");
    expect(response.status).toBe(200);
    const body = await response.text();
    const snapshot = harness.controller.getSnapshot();
    const serialized = JSON.stringify(snapshot);
    expect(body).not.toContain(harness.credential.token);
    expect(serialized).not.toContain(harness.credential.token);
    expect(snapshot.clients[0]?.status).toBe("connected");
    const lastSeen = Date.parse(snapshot.clients[0]?.lastSeenAt ?? "");
    expect(
      harness.controller.getSnapshot(lastSeen + LOCAL_MCP_STALE_CLIENT_MS + 1).clients[0]?.status,
    ).toBe("disconnected");
  });

  it(
    "serves discover, tool list and a bounded read to an independent external client process",
    async () => {
      const harness = await createHarness();
      running.push(harness);
      const fixture = resolve("tests/fixtures/v2-5-c4-external-mcp-client.mjs");
      const { stdout, stderr } = await execFileAsync(process.execPath, [fixture], {
        env: {
          ...process.env,
          C4_MCP_ADDRESS: harness.address,
          C4_MCP_TOKEN: harness.credential.token,
          C4_MCP_PROTOCOL_VERSION: LOCAL_MCP_PROTOCOL_VERSION,
          C4_MCP_PROJECT_ID: project.project.id,
        },
        timeout: 8_000,
        maxBuffer: 1024 * 1024,
      });
      expect(stderr).toBe("");
      expect(JSON.parse(stdout)).toEqual({
        discovered: true,
        toolCount: TOOL_IDS.length,
        projectId: project.project.id,
      });
      const snapshot = harness.controller.getSnapshot();
      expect(snapshot.clients[0]?.observedClientName).toBe("video-os-c4-external-process-proof");
    },
    10_000,
  );
});