import {describe,expect,it} from "vitest";
import {normalizeWorkspaceLayout,patchWorkspaceLayout,workspacePresetLayout} from "@/lib/studio/workspace-layout";

describe("V2.1 workspace layout",()=>{
  it("provides distinct official workspace presets",()=>{
    expect(workspacePresetLayout("edit")).toMatchObject({preset:"edit",leftPanelWidth:300,inspectorCollapsed:false});
    expect(workspacePresetLayout("ai")).toMatchObject({preset:"ai",leftPanelWidth:390,inspectorCollapsed:true});
    expect(workspacePresetLayout("script")).toMatchObject({preset:"script",leftPanelWidth:460,timelineHeight:220});
    expect(workspacePresetLayout("motion")).toMatchObject({preset:"motion",inspectorWidth:360,timelineHeight:360});
  });

  it("clamps persisted dimensions to safe desktop bounds",()=>{
    expect(normalizeWorkspaceLayout({leftPanelWidth:12,inspectorWidth:999,timelineHeight:9999})).toMatchObject({leftPanelWidth:240,inspectorWidth:440,timelineHeight:520});
  });

  it("patches UI layout without changing the selected preset unless requested",()=>{
    const script=workspacePresetLayout("script");
    expect(patchWorkspaceLayout(script,{leftPanelWidth:400,leftCollapsed:true})).toMatchObject({preset:"script",leftPanelWidth:400,leftCollapsed:true});
  });
});
