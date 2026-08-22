import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

describe("H1 Timeline mutation boundary",()=>{
  it("routes Timeline commands and transactions through revision-safe client helpers",()=>{
    const source=readFileSync(resolve(process.cwd(),"components/timeline/useTimelineProjectActions.ts"),"utf8");
    expect(source).toContain("postProjectCommand");
    expect(source).toContain("postProjectTransaction");
    expect(source).not.toContain("body:JSON.stringify(command)");
    expect(source).not.toContain("body:JSON.stringify(transaction)");
  });

  it("keeps active Inspector and Scene transaction callers inside the same envelope",()=>{
    for(const file of ["components/inspector/EffectInspector.tsx","components/scenes/ScenePanel.tsx"]){
      const source=readFileSync(resolve(process.cwd(),file),"utf8");
      expect(source).toContain("postProjectTransaction");
      expect(source).not.toContain("body:JSON.stringify(transaction)");
    }
  });
});
