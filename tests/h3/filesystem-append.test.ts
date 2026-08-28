import {mkdtemp,readdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H3c Node filesystem append",()=>{
  it("durably appends text without replacing prior content",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h3c-append-"));
    roots.push(root);
    const fs=new NodeFileSystemAdapter();
    const path=join(root,"operations.jsonl");

    await fs.appendText(path,"one\n");
    await fs.appendText(path,"two\n");

    await expect(fs.readText(path)).resolves.toBe("one\ntwo\n");
  });

  it("serializes append and atomic rewrite operations through one path write chain",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h3c-chain-"));
    roots.push(root);
    const fs=new NodeFileSystemAdapter();
    const path=join(root,"operations.jsonl");

    const first=fs.appendText(path,"before\n");
    const compact=fs.writeTextAtomic(path,"compacted\n");
    const last=fs.appendText(path,"after\n");
    await Promise.all([first,compact,last]);

    await expect(fs.readText(path)).resolves.toBe("compacted\nafter\n");
    expect((await readdir(root)).filter(name=>name.includes(".tmp"))).toEqual([]);
  });
});
