import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C5_CREATE_EDIT_PROPOSAL_TOOL_ID } from "@/lib/ai/tools/shared-proposal-tools";

const roots: string[] = [];
const previousDataRoot = process.env.VIDEO_OS_DATA_ROOT;

afterEach(async () => {
  if (previousDataRoot === undefined) delete process.env.VIDEO_OS_DATA_ROOT;
  else process.env.VIDEO_OS_DATA_ROOT = previousDataRoot;
  vi.resetModules();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("V2.5 C5 Permission Center catalog", () => {
  it("reports controlled MCP authority without starting durable runtime ownership", async () => {
    const root = await mkdtemp(join(tmpdir(), "video-os-c5-permission-center-"));
    roots.push(root);
    process.env.VIDEO_OS_DATA_ROOT = root;
    vi.resetModules();
    const { getLocalMcpControlledToolCatalog } = await import("@/lib/server/mcp-runtime");
    const catalog = getLocalMcpControlledToolCatalog();
    const proposal = catalog.find((tool) => tool.id === C5_CREATE_EDIT_PROPOSAL_TOOL_ID);

    expect(proposal).toMatchObject({
      riskClass: "R1",
      authority: "proposal-only",
      approval: { defaultMode: "auto", allowSessionOverride: false },
      revisionPolicy: "snapshot",
      idempotency: "proposal-only",
    });
    expect(proposal?.requiredScopes).toContain("project:propose");
    expect(proposal?.requiredScopes).not.toContain("project:write");

    for (const tool of catalog) {
      expect(["R0", "R1"]).toContain(tool.riskClass);
      if (tool.riskClass === "R0") expect(tool.authority).toBe("direct-read");
      if (tool.riskClass === "R1") {
        expect(tool.authority).toBe("proposal-only");
        expect(tool.approval).toEqual({ defaultMode: "auto", allowSessionOverride: false });
        expect(tool.requiredScopes).not.toContain("project:write");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(access(join(root, ".runtime-owner.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(access(join(root, ".runtime-owner.lock"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
