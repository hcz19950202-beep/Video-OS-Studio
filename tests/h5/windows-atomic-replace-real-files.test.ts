import {mkdtemp,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {replaceFileAtomically} from "@/lib/fs/atomic-replace";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H5 atomic replace real files",()=>{
  it("replaces an existing target without temp residue",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h5-atomic-"));
    roots.push(root);
    const target=join(root,"job.json");
    const temp=join(root,"job.json.test.tmp");
    await writeFile(target,"before","utf8");
    await writeFile(temp,"after","utf8");

    await replaceFileAtomically(temp,target);

    await expect(readFile(target,"utf8")).resolves.toBe("after");
    expect((await readdir(root)).filter(name=>name.endsWith(".tmp"))).toEqual([]);
  });
});
