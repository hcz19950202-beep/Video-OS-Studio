import {existsSync} from "node:fs";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {cleanupExclusiveLocksForProcessExit,withExclusiveFileLock} from "@/lib/fs/exclusive-lock";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const makeRoot=async()=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-v2-5-c7-lock-exit-"));
  roots.push(root);
  return root;
};

describe("V2.5 C7 exclusive-lock process-exit cleanup",()=>{
  it("removes a currently owned token lock even while the lock work is still active",async()=>{
    const root=await makeRoot();
    const lockPath=join(root,".runtime-owner.lock");

    await withExclusiveFileLock(lockPath,async()=>{
      expect(existsSync(lockPath)).toBe(true);
      cleanupExclusiveLocksForProcessExit();
      expect(existsSync(lockPath)).toBe(false);
    });

    expect(existsSync(lockPath)).toBe(false);
  });

  it("does not remove a lock whose ownership token changed before process-exit cleanup",async()=>{
    const root=await makeRoot();
    const lockPath=join(root,"project.json.lock");
    const foreign={token:"foreign-owner-token",pid:999_999,processStartedAt:1,createdAt:Date.now()};

    await withExclusiveFileLock(lockPath,async()=>{
      await writeFile(lockPath,`${JSON.stringify(foreign)}\n`,"utf8");
      cleanupExclusiveLocksForProcessExit();
      expect(existsSync(lockPath)).toBe(true);
      expect(JSON.parse(await readFile(lockPath,"utf8"))).toMatchObject(foreign);
    });

    expect(existsSync(lockPath)).toBe(true);
  });
});
