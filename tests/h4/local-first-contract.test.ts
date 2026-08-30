import {readFile,readdir} from "node:fs/promises";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const collectTypeScriptFiles=async(dir:string):Promise<string[]>=>{
  const entries=await readdir(dir,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>{
    const path=join(dir,entry.name);
    if(entry.isDirectory())return collectTypeScriptFiles(path);
    return entry.isFile()&&/\.tsx?$/u.test(entry.name)?[path]:[];
  }));
  return nested.flat();
};

describe("H4 local-first contracts",()=>{
  it("binds normal npm entrypoints to loopback and makes remote listening explicit",async()=>{
    const pkg=JSON.parse(await readFile(join(process.cwd(),"package.json"),"utf8")) as {scripts:Record<string,string>};
    expect(pkg.scripts.dev).toContain("--hostname 127.0.0.1");
    expect(pkg.scripts.start).toContain("--hostname 127.0.0.1");
    expect(pkg.scripts["dev:remote"]).toContain("--hostname 0.0.0.0");
    expect(pkg.scripts["start:remote"]).toContain("--hostname 0.0.0.0");
  });

  it("does not derive durable asset origins from the request Host anywhere in app/api",async()=>{
    const files=await collectTypeScriptFiles(join(process.cwd(),"app","api"));
    const offenders:string[]=[];
    for(const path of files){
      const source=await readFile(path,"utf8");
      if(source.includes("new URL(request.url).origin"))offenders.push(path);
    }
    expect(offenders).toEqual([]);
    for(const path of [
      join(process.cwd(),"app","api","jobs","route.ts"),
      join(process.cwd(),"app","api","workflows","route.ts"),
      join(process.cwd(),"app","api","workflows","[workflowId]","route.ts"),
      join(process.cwd(),"app","api","projects","[projectId]","renders","route.ts"),
    ])expect(await readFile(path,"utf8")).toContain("resolveTrustedAssetBaseUrl");
  });

  it("keeps the streaming asset route on GET/HEAD without adding an H4 auth wrapper",async()=>{
    const source=await readFile(join(process.cwd(),"app","api","projects","[projectId]","assets","[assetId]","route.ts"),"utf8");
    expect(source).toContain("export const GET=serve");
    expect(source).toContain("export const HEAD=serve");
    expect(source).toContain("createStreamingFileResponse");
  });
});
