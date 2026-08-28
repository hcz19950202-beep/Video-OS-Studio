import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

describe("H4 local-first contracts",()=>{
  it("binds normal npm entrypoints to loopback and makes remote listening explicit",async()=>{
    const pkg=JSON.parse(await readFile(join(process.cwd(),"package.json"),"utf8")) as {scripts:Record<string,string>};
    expect(pkg.scripts.dev).toContain("--hostname 127.0.0.1");
    expect(pkg.scripts.start).toContain("--hostname 127.0.0.1");
    expect(pkg.scripts["dev:remote"]).toContain("--hostname 0.0.0.0");
    expect(pkg.scripts["start:remote"]).toContain("--hostname 0.0.0.0");
  });

  it("does not derive render asset origins from the request Host",async()=>{
    const source=await readFile(join(process.cwd(),"app","api","projects","[projectId]","renders","route.ts"),"utf8");
    expect(source).toContain("resolveTrustedAssetBaseUrl");
    expect(source).not.toContain("new URL(request.url).origin");
  });

  it("keeps the streaming asset route on GET/HEAD without adding an H4 auth wrapper",async()=>{
    const source=await readFile(join(process.cwd(),"app","api","projects","[projectId]","assets","[assetId]","route.ts"),"utf8");
    expect(source).toContain("export const GET=serve");
    expect(source).toContain("export const HEAD=serve");
    expect(source).toContain("createStreamingFileResponse");
  });
});
