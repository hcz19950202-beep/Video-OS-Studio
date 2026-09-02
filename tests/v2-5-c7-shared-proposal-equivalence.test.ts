import { describe, expect, it, vi } from "vitest";
import { AgentContextService } from "@/lib/ai/context";
import { AgentSessionAlreadyExistsError } from "@/lib/ai/session/repository";
import { AgentSessionSchema, type AgentSession } from "@/lib/ai/session/schema";
import { AgentToolRegistry } from "@/lib/ai/tools/registry";
import { createC5ProposalAgentTool } from "@/lib/ai/tools/shared-agent-adapter";
import {
  C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
  createC5SharedProposalTools,
} from "@/lib/ai/tools/shared-proposal-tools";
import { SharedToolRegistry } from "@/lib/ai/tools/shared-registry";
import { createProject } from "@/lib/project/factory";

const NOW = "2026-09-01T04:30:00.000Z";
const PROJECT_ID = "c7-shared-proposal-project";
const MCP_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const MCP_PROPOSAL_ID = "33333333-3333-4333-8333-333333333333";
const AGENT_PROPOSAL_ID = "44444444-4444-4444-8444-444444444444";

const project = createProject({
  id: PROJECT_ID,
  name: "C7 Shared Proposal",
  now: NOW,
  durationInFrames: 300,
});

const proposalInput = {
  title: "Add an approved caption",
  summary: "Propose one bounded Project transaction through the shared R1 handler.",
  operations: [
    {
      id: "caption-edit",
      kind: "project-transaction" as const,
      summary: "Add a caption clip after review.",
      payload: {
        label: "C7 shared proposal caption",
        commands: [
          {
            type: "add-clip" as const,
            trackId: "captions-main",
            clip: {
              id: "c7-shared-caption",
              type: "caption" as const,
              text: "Shared proposal",
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
};

const createSessions = () => {
  const sessions = new Map<string, AgentSession>();
  return {
    store: {
      load: async (projectId: string, sessionId: string) =>
        sessions.get(`${projectId}:${sessionId}`) ?? null,
      create: async (input: AgentSession) => {
        const parsed = AgentSessionSchema.parse(input);
        const key = `${parsed.projectId}:${parsed.id}`;
        if (sessions.has(key)) {
          throw new AgentSessionAlreadyExistsError(parsed.projectId, parsed.id);
        }
        sessions.set(key, parsed);
        return structuredClone(parsed);
      },
      mutate: async (
        projectId: string,
        sessionId: string,
        mutation: (current: AgentSession) => AgentSession | Promise<AgentSession>,
      ) => {
        const key = `${projectId}:${sessionId}`;
        const current = sessions.get(key);
        if (!current) throw new Error("missing C7 test session");
        const next = AgentSessionSchema.parse(await mutation(structuredClone(current)));
        sessions.set(key, next);
        return structuredClone(next);
      },
    },
    require: (sessionId: string) => {
      const session = sessions.get(`${PROJECT_ID}:${sessionId}`);
      if (!session) throw new Error(`missing session ${sessionId}`);
      return structuredClone(session);
    },
  };
};

describe("V2.5 C7 shared Proposal equivalence", () => {
  it("uses one production R1 handler and one snapshot/revision contract for MCP and Built-in Agent", async () => {
    const sessions = createSessions();
    const proposalIds = [MCP_PROPOSAL_ID, AGENT_PROPOSAL_ID];
    const [registered] = createC5SharedProposalTools({
      sessions: sessions.store,
      now: () => NOW,
      makeId: () => proposalIds.shift() ?? crypto.randomUUID(),
    });
    if (!registered) throw new Error("create_edit_proposal was not registered");
    const originalHandler = registered.handler;
    const handler = vi.fn(originalHandler);
    const shared = new SharedToolRegistry([{ ...registered, handler }]);
    const contextService = new AgentContextService({
      load: async (projectId) => {
        if (projectId !== PROJECT_ID) throw new Error("unknown C7 project");
        return project;
      },
    });
    const snapshot = await contextService.build(PROJECT_ID, {});

    const mcpResult = await shared.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID, proposalInput, {
      transport: "mcp",
      projectId: PROJECT_ID,
      requestId: "c7-mcp-request",
      sessionId: MCP_SESSION_ID,
      projectContext: snapshot,
    });
    expect(mcpResult).toMatchObject({
      status: "success",
      output: {
        proposal: {
          id: MCP_PROPOSAL_ID,
          sessionId: MCP_SESSION_ID,
          projectId: PROJECT_ID,
          baseProjectRevision: project.project.revision,
          status: "draft",
        },
      },
    });

    const agent = new AgentToolRegistry([
      createC5ProposalAgentTool(shared, C5_CREATE_EDIT_PROPOSAL_TOOL_ID),
    ]);
    const agentResult = await agent.execute(
      {
        id: "c7-agent-call",
        toolId: C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
        arguments: proposalInput,
      },
      {
        sessionId: AGENT_SESSION_ID,
        context: snapshot,
        makeId: () => "c7-agent-request",
      },
    );
    expect(agentResult).toMatchObject({
      status: "success",
      output: {
        proposal: {
          id: AGENT_PROPOSAL_ID,
          sessionId: AGENT_SESSION_ID,
          projectId: PROJECT_ID,
          baseProjectRevision: project.project.revision,
          status: "draft",
        },
      },
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[1]).toMatchObject({
      transport: "mcp",
      projectId: PROJECT_ID,
      requestId: "c7-mcp-request",
      sessionId: MCP_SESSION_ID,
    });
    expect(handler.mock.calls[1]?.[1]).toMatchObject({
      transport: "agent",
      projectId: PROJECT_ID,
      requestId: "c7-agent-request",
      sessionId: AGENT_SESSION_ID,
    });

    expect(sessions.require(MCP_SESSION_ID).operationAudit).toEqual([
      expect.objectContaining({
        source: "local-mcp",
        action: "proposal-created",
        outcome: "success",
        proposalId: MCP_PROPOSAL_ID,
        toolId: C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
        requestId: "c7-mcp-request",
      }),
    ]);
    expect(sessions.require(AGENT_SESSION_ID).operationAudit).toEqual([
      expect.objectContaining({
        source: "builtin-agent",
        action: "proposal-created",
        outcome: "success",
        proposalId: AGENT_PROPOSAL_ID,
        toolId: C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
        requestId: "c7-agent-request",
      }),
    ]);
  });

  it("keeps strict Proposal input validation identical before the shared handler can persist authority", async () => {
    const sessions = createSessions();
    const [registered] = createC5SharedProposalTools({
      sessions: sessions.store,
      now: () => NOW,
      makeId: () => MCP_PROPOSAL_ID,
    });
    if (!registered) throw new Error("create_edit_proposal was not registered");
    const originalHandler = registered.handler;
    const handler = vi.fn(originalHandler);
    const shared = new SharedToolRegistry([{ ...registered, handler }]);
    const contextService = new AgentContextService({ load: async () => project });
    const snapshot = await contextService.build(PROJECT_ID, {});
    const invalid = { ...proposalInput, expectedRevision: 999 };

    await expect(
      shared.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID, invalid, {
        transport: "mcp",
        projectId: PROJECT_ID,
        requestId: "c7-invalid-mcp",
        sessionId: MCP_SESSION_ID,
        projectContext: snapshot,
      }),
    ).resolves.toMatchObject({ status: "error", error: { code: "invalid_tool_arguments" } });

    const agent = new AgentToolRegistry([
      createC5ProposalAgentTool(shared, C5_CREATE_EDIT_PROPOSAL_TOOL_ID),
    ]);
    await expect(
      agent.execute(
        {
          id: "c7-invalid-agent-call",
          toolId: C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
          arguments: invalid,
        },
        {
          sessionId: AGENT_SESSION_ID,
          context: snapshot,
          makeId: () => "c7-invalid-agent",
        },
      ),
    ).resolves.toMatchObject({ status: "error" });

    expect(handler).not.toHaveBeenCalled();
  });
});
