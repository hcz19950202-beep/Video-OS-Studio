import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {canExecutionModeAutoRunRisk} from "@/lib/ai/execution-mode";

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("V2.5 C2 unified Agent conversation",()=>{
  it("makes Conversation the primary Agent entry and moves legacy modes behind Advanced detail",()=>{
    const left=source("components/studio/AgentNativeLeftPanel.tsx");
    const workspace=source("components/studio/AIWorkspacePanel.tsx");
    expect(left).toContain("AIWorkspacePanel");
    expect(workspace).toContain('data-testid="unified-ai-workspace"');
    expect(workspace).toContain('data-testid="agent-advanced-disclosure"');
    expect(workspace).toContain("AdvancedView");
    expect(workspace).toContain("AgentWorkspacePanel");
    expect(workspace).toContain("ProductionMissionPanel");
    expect(workspace).toContain("WorkflowPanel");
    expect(workspace).toContain("VisualPlannerPanel");
    expect(workspace).not.toContain('role="tablist"');
    expect(workspace).not.toContain('useState<"mission"|"agent"|"composer"|"workflow">');
  });

  it("decomposes conversation presentation without moving orchestration or Apply ownership",()=>{
    const surface=source("components/studio/AgentConversationSurface.tsx");
    const panel=source("components/studio/AgentWorkspacePanel.tsx");
    for(const piece of ["AgentSessionSelector","AgentConversationMessages","AgentToolActivity","AgentProposalItem","AgentErrorState","AgentComposer"]){
      expect(surface).toContain(piece);
    }
    expect(surface).toContain('data-testid="unified-agent-conversation"');
    expect(panel).toContain("runAgentTurn");
    expect(panel).toContain("applyAgentProposal");
    expect(panel).toContain("expectedRevision:proposal.baseProjectRevision");
    expect(panel).toContain("pushHistory");
    expect(surface).not.toContain("applyAgentProposal");
  });

  it("derives Mission and QA cards from Production Workspace rather than duplicating durable truth",()=>{
    const cards=source("components/studio/AgentConversationProductionCards.tsx");
    expect(cards).toContain("listProductionMissions");
    expect(cards).toContain("getProductionWorkspace");
    expect(cards).toContain("ProductionWorkspaceSnapshot");
    expect(cards).toContain("workspace.qa.state");
    expect(cards).toContain("workspace.stale.qa");
    expect(cards).not.toContain("createProductionMission");
    expect(cards).not.toContain("updateProductionMission");
    expect(cards).not.toContain("cancelProductionMission");
  });

  it("keeps Execution Mode as policy intent and never auto-authorizes R2 R3 or R4",()=>{
    for(const mode of ["review-first","apply-safe-edits","plan-only"] as const){
      expect(canExecutionModeAutoRunRisk(mode,"R0")).toBe(true);
      expect(canExecutionModeAutoRunRisk(mode,"R1")).toBe(true);
      expect(canExecutionModeAutoRunRisk(mode,"R2")).toBe(false);
      expect(canExecutionModeAutoRunRisk(mode,"R3")).toBe(false);
      expect(canExecutionModeAutoRunRisk(mode,"R4")).toBe(false);
    }
    const sessionSchema=source("lib/ai/session/schema.ts");
    expect(sessionSchema).not.toContain("AgentExecutionMode");
  });

  it("carries execution policy through client API service and runner with a safe default",()=>{
    const client=source("lib/client/agent.ts");
    const route=source("app/api/projects/[projectId]/agent/sessions/[sessionId]/turns/route.ts");
    const service=source("lib/ai/service.ts");
    const runner=source("lib/ai/runner.ts");
    expect(client).toContain("DEFAULT_AGENT_EXECUTION_MODE");
    expect(route).toContain("AgentExecutionModeSchema");
    expect(route).toContain("executionMode:input.executionMode");
    expect(service).toContain("input.executionMode??DEFAULT_AGENT_EXECUTION_MODE");
    expect(runner).toContain("describeAgentExecutionMode");
    expect(runner).toContain('input.executionMode==="plan-only"');
    expect(runner).toContain("execution_mode_blocked");
  });
});
