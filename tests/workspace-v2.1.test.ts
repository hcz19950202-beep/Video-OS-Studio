import {describe,expect,it} from "vitest";
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
});
