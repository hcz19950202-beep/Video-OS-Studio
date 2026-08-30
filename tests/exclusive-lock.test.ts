import {mkdtemp,readFile,rm,utimes,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {ExclusiveFileLockTimeoutError,withExclusiveFileLock} from "@/lib/fs/exclusive-lock";
import {currentProcessIdentity} from "@/lib/process/process-identity";

const roots:string[]=[];
const createRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-lock-"));roots.push(root);return root;};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("ownership-safe exclusive file lock",()=>{
  it("does not steal a live owner's lock after the stale age threshold",async()=>{
    const lockPath=join(await createRoot(),"mission.lock");
    const order:string[]=[];
    const first=withExclusiveFileLock(lockPath,async()=>{order.push("first-enter");await sleep(60);order.push("first-exit");},{staleAfterMs:5,maxBackoffMs:10,maxWaitMs:500});
    await sleep(15);
    const second=withExclusiveFileLock(lockPath,async()=>{order.push("second-enter");},{staleAfterMs:5,maxBackoffMs:10,maxWaitMs:500});
    await Promise.all([first,second]);
    expect(order).toEqual(["first-enter","first-exit","second-enter"]);
  });

  it("does not delete a replacement lock owned by another token",async()=>{
    const lockPath=join(await createRoot(),"replace.lock");
    const processIdentity=currentProcessIdentity();
    const replacement={token:"replacement-token",pid:process.pid,processStartedAt:processIdentity.startedAt,createdAt:Date.now()};
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
    await withExclusiveFileLock(lockPath,async()=>{entered=true;},{staleAfterMs:5,maxBackoffMs:10,maxWaitMs:500});
    expect(entered).toBe(true);
  });

  it("recovers a stale lock when the PID was reused by a different process identity",async()=>{
    const lockPath=join(await createRoot(),"pid-reuse.lock");
    await writeFile(lockPath,JSON.stringify({token:"old-process",pid:process.pid,processStartedAt:1,createdAt:1})+"\n","utf8");
    const old=new Date(Date.now()-60_000);
    await utimes(lockPath,old,old);
    let entered=false;
    await withExclusiveFileLock(lockPath,async()=>{entered=true;},{staleAfterMs:5,maxBackoffMs:10,maxWaitMs:500});
    expect(entered).toBe(true);
  });

  it("times out instead of waiting forever for a genuinely live owner",async()=>{
    const lockPath=join(await createRoot(),"timeout.lock");
    const identity=currentProcessIdentity();
    await writeFile(lockPath,JSON.stringify({token:"live-owner",pid:identity.pid,processStartedAt:identity.startedAt,createdAt:1})+"\n","utf8");
    const old=new Date(Date.now()-60_000);
    await utimes(lockPath,old,old);
    await expect(withExclusiveFileLock(lockPath,async()=>undefined,{staleAfterMs:5,maxBackoffMs:10,maxWaitMs:30})).rejects.toBeInstanceOf(ExclusiveFileLockTimeoutError);
  });

  it("retries transient Windows release deletion errors before giving up ownership",async()=>{
    const lockPath=join(await createRoot(),"release-retry.lock");
    let attempts=0;
    const removeFile:typeof rm=async(path,options)=>{
      attempts+=1;
      if(attempts<3){
        const error=new Error("simulated Windows scanner contention") as NodeJS.ErrnoException;
        error.code="EPERM";
        throw error;
      }
      await rm(path,options);
    };
    await withExclusiveFileLock(lockPath,async()=>undefined,{platform:"win32",removeFile,maxWaitMs:500});
    expect(attempts).toBe(3);
    await expect(readFile(lockPath,"utf8")).rejects.toMatchObject({code:"ENOENT"});
  });
});
