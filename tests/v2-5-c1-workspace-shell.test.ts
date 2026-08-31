import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {applyWorkspacePreset,parseWorkspaceLayout,serializeWorkspaceLayout,updateWorkspaceLayout} from "@/lib/studio/workspace-layout";

describe("V2.5 C1 agent-native workspace shell",()=>{
  it("persists timeline collapse without breaking legacy layout migration",()=>{
    const legacy=JSON.stringify({version:1,preset:"edit",leftWidth:310,inspectorWidth:330,timelineHeight:320,leftCollapsed:false,inspectorCollapsed:false});
    expect(parseWorkspaceLayout(legacy)).toMatchObject({leftWidth:310,inspectorWidth:330,timelineHeight:320,timelineCollapsed:false});
    const collapsed=updateWorkspaceLayout(parseWorkspaceLayout(legacy),{timelineCollapsed:true});
    expect(parseWorkspaceLayout(serializeWorkspaceLayout(collapsed)).timelineCollapsed).toBe(true);
    expect(applyWorkspacePreset("edit").timelineCollapsed).toBe(false);
  });

  it("composes Agent Viewer Context and Timeline as first-class workspace regions",()=>{
    const shell=readFileSync(resolve(process.cwd(),"components/studio/ResizableWorkspaceShell.tsx"),"utf8");
    expect(shell).toContain('data-workspace-region="agent"');
    expect(shell).toContain('data-workspace-region="viewer"');
    expect(shell).toContain('data-workspace-region="context"');
    expect(shell).toContain('data-workspace-region="timeline"');
    expect(shell).toContain("AgentNativeLeftPanel");
    expect(shell).toContain("AgentNativeContextDock");
    expect(shell).toContain("AgentNativeCommandStrip");
  });

  it("keeps the legacy editing tool rail reachable inside the dedicated Agent surface",()=>{
    const left=readFileSync(resolve(process.cwd(),"components/studio/AgentNativeLeftPanel.tsx"),"utf8");
    expect(left).toContain('AgentNativeSurface="agent"|"tools"');
    expect(left).toContain("legacyRail");
    expect(left).toContain("legacyContent");
    expect(left).toContain("AgentWorkspacePanel");
    expect(left).not.toContain("useState<AgentNativeSurface>");
  });

  it("provides the frozen Context Dock tab contract without moving project runtime ownership",()=>{
    const dock=readFileSync(resolve(process.cwd(),"components/studio/AgentNativeContextDock.tsx"),"utf8");
    for(const tab of ["inspector","assets","transcript","mission","qa","history"])expect(dock).toContain(`id:\"${tab}\"`);
    expect(dock).toContain("ProductionMissionPanel");
    expect(dock).toContain("useProjectStore");
    expect(dock).toContain("onTabChange");
    expect(dock).not.toContain("useWorkspaceProjectRuntime");
  });

  it("routes top-level Undo and Redo through the existing durable timeline history boundary",()=>{
    const commands=readFileSync(resolve(process.cwd(),"components/studio/AgentNativeCommandStrip.tsx"),"utf8");
    expect(commands).toContain("useTimelineProjectActions");
    expect(commands).toContain("void undo()");
    expect(commands).toContain("void redo()");
    expect(commands).toContain("resetWorkspace");
    expect(commands).toContain("toggleTimeline");
  });

  it("provides direct Projects and Versions History entries without duplicating Project runtime",()=>{
    const commands=readFileSync(resolve(process.cwd(),"components/studio/AgentNativeCommandStrip.tsx"),"utf8");
    const shell=readFileSync(resolve(process.cwd(),"components/studio/ResizableWorkspaceShell.tsx"),"utf8");
    const workspace=readFileSync(resolve(process.cwd(),"components/studio/StudioWorkspaceV21.tsx"),"utf8");
    expect(commands).toContain('data-testid="open-projects"');
    expect(commands).toContain('data-testid="open-history"');
    expect(shell).toContain('setLeftSurface("tools")');
    expect(shell).toContain('setContextTab("history")');
    expect(workspace).toContain('onOpenProjects={()=>activateTool("project")}');
    expect(commands).not.toContain("useWorkspaceProjectRuntime");
    expect(shell).not.toContain("useWorkspaceProjectRuntime");
  });
});
