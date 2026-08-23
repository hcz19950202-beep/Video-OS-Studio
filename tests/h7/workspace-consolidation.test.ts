import {readFile} from "node:fs/promises";
import {describe,expect,it} from "vitest";

const source=async(path:string)=>readFile(new URL(`../../${path}`,import.meta.url),"utf8");

describe("H7 workspace consolidation",()=>{
  it("keeps network, mutation orchestration, and live frame subscriptions out of StudioWorkspaceV21",async()=>{
    const workspace=await source("components/studio/StudioWorkspaceV21.tsx");
    expect(workspace).toContain("useWorkspaceProjectRuntime");
    expect(workspace).not.toContain("fetch(");
    expect(workspace).not.toContain("requestJson");
    expect(workspace).not.toContain("mutationChainRef");
    expect(workspace).not.toContain("postProjectCommand");
    expect(workspace).not.toContain("usePlayerStore(state=>state.currentFrame)");
    expect(workspace).toContain("usePlayerStore.getState().currentFrame");
  });

  it("routes workspace project/media work through typed H7 clients while preserving H1 commands",async()=>{
    const runtime=await source("components/studio/useWorkspaceProjectRuntime.ts");
    expect(runtime).toContain("listRecentProjects");
    expect(runtime).toContain("createStudioProject");
    expect(runtime).toContain("loadStudioProject");
    expect(runtime).toContain("importProjectMedia");
    expect(runtime).toContain("postProjectCommand");
    expect(runtime).toContain("PROJECT_REVISION_CONFLICT");
    expect(runtime).toContain("mutationChainRef");
  });

  it("keeps consolidated UI surfaces off ad-hoc fetch calls",async()=>{
    const paths=[
      "components/planner/VisualPlannerPanel.tsx",
      "components/render/RenderControls.tsx",
      "components/video-use/VideoUsePanel.tsx",
      "components/library/HyperFramesLibrary.tsx",
    ];
    for(const path of paths)expect(await source(path),path).not.toContain("fetch(");
  });
});
