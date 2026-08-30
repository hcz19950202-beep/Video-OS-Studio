import {mkdtemp,readFile,rm,utimes,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {withExclusiveFileLock} from "@/lib/fs/exclusive-lock";

const roots:string[]=[];
const createRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-lock-"));roots.push(root);return root;};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("ownership-safe exclusive file lock",()=>{
  it("does not steal a live owner's lock after the stale age threshold",async()=>{
    const lockPath=join(await createRoot(),"mission.lock");
    const order:string[]=[];
    const first=withExclusiveFileLock(lockPath,async()=>{order.push("first-enter");await sleep(60);order.push("first-exit");},{staleAfterMs:5,maxBackoffMs:10});
    await sleep(15);
    const second=withExclusiveFileLock(lockPath,async()=>{order.push("second-enter");},{staleAfterMs:5,maxBackoffMs:10});
    await Promise.all([first,second]);
    expect(order).toEqual(["first-enter","first-exit","second-enter"]);
  });

  it("does not delete a replacement lock owned by another token",async()=>{
    const lockPath=join(await createRoot(),"replace.lock");
    const replacement={token:"replacement-token",pid:process.pid,createdAt:Date.now()};
    await withExclusiveFileLock(lockPath,async()=>{
      await rm(lockPath,{force:true});
      await writeFile(lockPath,JSON.stringify(replacement)+"\n","utf8");
    });
    expect(JSON.parse(await readFile(lockPath,"utf8"))).toEqual(replacement);
  });

  it("recovers an old lock whose owner process is gone",async()=>{
    const lockPath=join(await createRoot(),"stale.lock");
    await writeFile(lockPath,JSON.stringify({token:"dead-token",pid:2_147_483_647,createdAt:1})+"\n","utf8");
    const old=new Date(Date.now()-60_000);
    await utimes(lockPath,old,old);
    let entered=false;
    await withExclusiveFileLock(lockPath,async()=>{entered=true;},{staleAfterMs:5,maxBackoffMs:10});
    expect(entered).toBe(true);
  });
});
