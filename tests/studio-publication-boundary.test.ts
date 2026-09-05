import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

describe("V2.4.2 Studio Project publication boundary",()=>{
  it("routes every async child Project publisher through the active-Project guard",async()=>{
    const source=await readFile(join(process.cwd(),"components","studio","StudioWorkspaceV21.tsx"),"utf8");

    expect(source).toContain('import {publishProjectIfActive} from "@/lib/client/project-mutations";');
    expect(source).toContain("const publishProjectChange=useCallback");
    expect(source).toContain("()=>useProjectStore.getState().project");
    expect(source).not.toContain("onProjectChange={setProject}");

    const childPublisherBindings=source.match(/onProjectChange=\{[^}]+\}/g)??[];
    expect(childPublisherBindings.length).toBeGreaterThan(0);
    expect(new Set(childPublisherBindings)).toEqual(new Set(["onProjectChange={publishProjectChange}"]));

    expect(source).toContain("<CreativeAssetLibrary/>");
    expect(source).not.toMatch(/<CreativeAssetLibrary[^>]*onProjectChange=/);
  });
});
