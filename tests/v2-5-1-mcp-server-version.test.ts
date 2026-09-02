import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../package.json";
import {
  LOCAL_MCP_PROTOCOL_VERSION,
  type LocalMcpBridgeController,
} from "../lib/mcp/bridge-controller";
import { LocalMcpHttpServer } from "../lib/mcp/local-http-server";
import type { SharedToolRegistry } from "../lib/ai/tools/shared-registry";

const runningServers: LocalMcpHttpServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

describe("V2.5.1 MCP server version contract", () => {
  it("reports the package version through authenticated server/discover metadata", async () => {
    const controller = {
      authenticateBearer: vi.fn(() => ({ credentialId: "v2-5-1-version-test" })),
      observeAuthenticatedRequest: vi.fn(),
      markStarting: vi.fn(),
      markReady: vi.fn(),
      markStopped: vi.fn(),
      markError: vi.fn(),
    } as unknown as LocalMcpBridgeController;
    const tools = {} as SharedToolRegistry;
    const server = new LocalMcpHttpServer(controller, tools);
    runningServers.push(server);

    const { address } = await server.start();
    const response = await fetch(address, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": LOCAL_MCP_PROTOCOL_VERSION,
        "Mcp-Method": "server/discover",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "v2-5-1-version",
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": LOCAL_MCP_PROTOCOL_VERSION,
            "io.modelcontextprotocol/clientInfo": {
              name: "v2-5-1-version-test",
              version: "1.0.0",
            },
          },
        },
      }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result?: {
        supportedVersions?: string[];
        _meta?: {
          "io.modelcontextprotocol/serverInfo"?: {
            name?: string;
            version?: string;
          };
        };
      };
    };

    expect(payload.result?.supportedVersions).toEqual([LOCAL_MCP_PROTOCOL_VERSION]);
    expect(payload.result?._meta?.["io.modelcontextprotocol/serverInfo"]).toEqual({
      name: "video-os-studio",
      version: packageJson.version,
    });
  });
});
