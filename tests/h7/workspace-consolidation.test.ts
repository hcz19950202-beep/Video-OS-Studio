import {readFile} from "node:fs/promises";
import {describe,expect,it} from "vitest";

const source=async(path:string)=>readFile(new URL(`../../${path}`,import.meta.url),"utf8");

describe("H7 workspace consolidation",()=>{
  it("keeps network and mutation orchestration out of StudioWorkspaceV21",async()=>{
    const workspace=await source("components/studio/StudioWorkspaceV21.tsx");
    expect(workspace).toContain("useWorkspaceProjectRuntime");
    expect(workspace).not.toContain("fetch(");
    expect(workspace).not.toContain("requestJson");
    expect(workspace).not.toContain("mutationChainRef");
    expect(workspace).not.toContain("postProjectCommand");
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
});
