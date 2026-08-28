import {describe,expect,it} from "vitest";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

describe("V2.3.1 H5 export UI contract",()=>{
  it("renders the resolved profile dimensions rather than assuming Project Canvas dimensions",async()=>{
    const source=await readFile(resolve(process.cwd(),"components/render/RenderControls.tsx"),"utf8");
    expect(source).toContain("{resolved.width}×{resolved.height}");
    expect(source).toContain("resolveExportProfile(project,profile)");
  });
});
