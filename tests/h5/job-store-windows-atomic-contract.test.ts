import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

describe("H5 JobStore Windows atomic persistence contract",()=>{
  it("routes JobStore and Node filesystem atomic replacement through the shared retry helper",async()=>{
    const root=process.cwd();
    const jobStore=await readFile(join(root,"lib/jobs/store.ts"),"utf8");
    const filesystem=await readFile(join(root,"adapters/filesystem.ts"),"utf8");

    expect(jobStore).toContain('import {replaceFileAtomically} from "@/lib/fs/atomic-replace"');
    expect(jobStore).toContain("await replaceFileAtomically(temp,path)");
    expect(filesystem).toContain('import {replaceFileAtomically} from "@/lib/fs/atomic-replace"');
    expect(filesystem).toContain("await replaceFileAtomically(tempPath,path)");
  });
});
