import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {applyWorkspacePreset,availableViewerWidth,normalizeWorkspaceLayout,parseWorkspaceLayout,serializeWorkspaceLayout,updateWorkspaceLayout,WORKSPACE_LIMITS} from "@/lib/studio/workspace-layout";

describe("V2.1 workspace layout",()=>{
  it("provides official Edit AI Script and Motion presets without touching project state",()=>{
    expect(applyWorkspacePreset("edit")).toMatchObject({preset:"edit",leftCollapsed:false,inspectorCollapsed:false});
    expect(applyWorkspacePreset("ai")).toMatchObject({preset:"ai",leftCollapsed:false,inspectorCollapsed:true});
    expect(applyWorkspacePreset("script")).toMatchObject({preset:"script",leftWidth:440,inspectorCollapsed:true});
    expect(applyWorkspacePreset("motion")).toMatchObject({preset:"motion",timelineHeight:360});
  });

  it("clamps user-resized panels to safe bounds",()=>{
    const layout=normalizeWorkspaceLayout({preset:"edit",leftWidth:10,inspectorWidth:9999,timelineHeight:10});
    expect(layout.leftWidth).toBe(WORKSPACE_LIMITS.leftMin);
    expect(layout.inspectorWidth).toBe(WORKSPACE_LIMITS.inspectorMax);
    expect(layout.timelineHeight).toBe(WORKSPACE_LIMITS.timelineMin);
    const updated=updateWorkspaceLayout(layout,{timelineHeight:900});
    expect(updated.timelineHeight).toBe(WORKSPACE_LIMITS.timelineMax);
  });

  it("persists and safely migrates local workspace preferences",()=>{
    const source=updateWorkspaceLayout(applyWorkspacePreset("motion"),{leftWidth:350,inspectorCollapsed:true});
    expect(parseWorkspaceLayout(serializeWorkspaceLayout(source))).toEqual(source);
    expect(parseWorkspaceLayout("not-json")).toEqual(applyWorkspacePreset("edit"));
    expect(parseWorkspaceLayout(JSON.stringify({preset:"script",leftWidth:9999}))).toMatchObject({preset:"script",leftWidth:WORKSPACE_LIMITS.leftMax});
  });

  it("always reserves a usable universal viewer region",()=>{
    const layout=applyWorkspacePreset("edit");
    expect(availableViewerWidth(1440,layout)).toBe(772);
    expect(availableViewerWidth(600,layout)).toBe(WORKSPACE_LIMITS.viewerMin);
    expect(availableViewerWidth(1000,{...layout,leftCollapsed:true,inspectorCollapsed:true})).toBe(952);
  });

  it("keeps long content panels constrained and scrollable inside the upper workspace",()=>{
    const css=readFileSync(resolve(process.cwd(),"app/v21-layout.css"),"utf8");
    expect(css).toContain(".v21-content-panel-inner");
    expect(css).toContain("height: 100%");
    expect(css).toContain(".v21-content-scroll");
    expect(css).toContain("flex: 1");
    expect(css).toContain("min-height: 0");
    expect(css).toContain("overflow: auto");
  });

  it("provides a light-theme surface for the V2.1 shell without coupling to Project Brand",()=>{
    const css=readFileSync(resolve(process.cwd(),"app/v21-layout.css"),"utf8");
    expect(css).toContain(':root[data-studio-theme="light"] .v21-workspace');
    expect(css).toContain("background: var(--panel)");
    expect(css).toContain("background: var(--bg-deep)");
  });

  it("keeps canvas resize handles reachable beneath the floating toolbar",()=>{
    const css=readFileSync(resolve(process.cwd(),"app/v21-layout.css"),"utf8");
    expect(css).toContain(".canvas-floating-toolbar");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain(".canvas-floating-toolbar button");
    expect(css).toContain("pointer-events: auto");
  });

  it("keeps canvas rotate controls visible at the canvas boundary",()=>{
    const css=readFileSync(resolve(process.cwd(),"app/v21-layout.css"),"utf8");
    expect(css).toContain(".canvas-overlay");
    expect(css).toContain("overflow: visible");
  });

  it("keeps the inspector scrollable above the timeline region",()=>{
    const css=readFileSync(resolve(process.cwd(),"app/v21-layout.css"),"utf8");
    expect(css).toContain(".v21-inspector-panel");
    expect(css).toContain("overflow: auto");
  });

  it("exposes a normal-user B-roll placement action for imported visual assets",()=>{
    const source=readFileSync(resolve(process.cwd(),"components/studio/StudioWorkspaceV21.tsx"),"utf8");
    expect(source).toContain("Add B-roll");
    expect(source).toContain('trackId:"broll-main"');
    expect(source).toContain('type:"broll"');
  });
});
