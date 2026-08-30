import {randomUUID} from "node:crypto";
import {mkdir,open,readFile,rm,stat} from "node:fs/promises";
import {dirname} from "node:path";
import {withWindowsTransientRetry} from "@/lib/fs/atomic-replace";
import {currentProcessIdentity,isProcessAlive,isProcessIdentityAlive} from "@/lib/process/process-identity";

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const contention=(code:string|undefined)=>code==="EEXIST"||code==="EPERM"||code==="EACCES"||code==="EBUSY";

type LockRecord={token:string;pid:number;processStartedAt?:number;createdAt:number};

const parseLockRecord=(text:string):LockRecord|null=>{
  try{
    const value=JSON.parse(text) as Partial<LockRecord>;
    if(typeof value.token!=="string"||!Number.isInteger(value.pid)||typeof value.createdAt!=="number")return null;
    if(value.processStartedAt!==undefined&&typeof value.processStartedAt!=="number")return null;
    return{token:value.token,pid:value.pid!,processStartedAt:value.processStartedAt,createdAt:value.createdAt};
  }catch{return null;}
};

// Compatibility export for callers that only have legacy PID ownership metadata.
export const isExclusiveLockProcessAlive=isProcessAlive;

export class ExclusiveFileLockTimeoutError extends Error{
  readonly code="EXCLUSIVE_FILE_LOCK_TIMEOUT";
  constructor(readonly lockPath:string,readonly maxWaitMs:number){
    super(`Timed out waiting for exclusive file lock after ${maxWaitMs}ms.`);
    this.name="ExclusiveFileLockTimeoutError";
  }
}

export type ExclusiveFileLockOptions={
  staleAfterMs?:number;
  maxBackoffMs?:number;
  maxWaitMs?:number;
  platform?:NodeJS.Platform;
  removeFile?:typeof rm;
};

const sameObservedOwner=(expected:LockRecord,current:LockRecord|null)=>current!==null&&current.token===expected.token&&current.pid===expected.pid&&current.processStartedAt===expected.processStartedAt;

export const withExclusiveFileLock=async<T>(
  lockPath:string,
  work:()=>Promise<T>,
  options:ExclusiveFileLockOptions={},
):Promise<T>=>{
  const staleAfterMs=Math.max(1,options.staleAfterMs??30_000);
  const maxBackoffMs=Math.max(10,options.maxBackoffMs??100);
  const maxWaitMs=Math.max(1,options.maxWaitMs??60_000);
  const platform=options.platform??process.platform;
  const removeFile=options.removeFile??rm;
  const token=randomUUID();
  const processIdentity=currentProcessIdentity();
  const record:LockRecord={token,pid:processIdentity.pid,processStartedAt:processIdentity.startedAt,createdAt:Date.now()};
  let handle:Awaited<ReturnType<typeof open>>|undefined;
  let attempt=0;
  const startedWaitingAt=Date.now();

  const removeOwnedLock=async(expected:LockRecord)=>{
    let current:LockRecord|null;
    try{current=parseLockRecord(await readFile(lockPath,"utf8"));}
    catch(error){
      if((error as NodeJS.ErrnoException).code==="ENOENT")return;
      throw error;
    }
    if(!sameObservedOwner(expected,current))return;
    await withWindowsTransientRetry(()=>removeFile(lockPath,{force:true}),{platform,maxAttempts:10,initialDelayMs:10,maxDelayMs:100});
  };

  const removeStillInvalidLegacyLock=async()=>{
    let currentText:string;
    try{currentText=await readFile(lockPath,"utf8");}
    catch(error){
      if((error as NodeJS.ErrnoException).code==="ENOENT")return;
      throw error;
    }
    if(parseLockRecord(currentText)!==null)return;
    await withWindowsTransientRetry(()=>removeFile(lockPath,{force:true}),{platform,maxAttempts:10,initialDelayMs:10,maxDelayMs:100});
  };

  await mkdir(dirname(lockPath),{recursive:true});
  for(;;){
    try{
      handle=await open(lockPath,"wx");
      await handle.writeFile(JSON.stringify(record)+"\n","utf8");
      await handle.sync();
      break;
    }catch(error){
      await handle?.close().catch(()=>undefined);handle=undefined;
      const code=(error as NodeJS.ErrnoException).code;
      if(!contention(code))throw error;
      try{
        const info=await stat(lockPath);
        if(Date.now()-info.mtimeMs>staleAfterMs){
          const existing=parseLockRecord(await readFile(lockPath,"utf8"));
          if(existing){
            const alive=await isProcessIdentityAlive({pid:existing.pid,startedAt:existing.processStartedAt});
            if(!alive)await removeOwnedLock(existing);
          }else{
            await removeStillInvalidLegacyLock();
          }
        }
      }catch(lockError){
        const lockCode=(lockError as NodeJS.ErrnoException).code;
        if(lockCode!=="ENOENT"&&!contention(lockCode))throw lockError;
      }
      if(Date.now()-startedWaitingAt>=maxWaitMs)throw new ExclusiveFileLockTimeoutError(lockPath,maxWaitMs);
      const base=Math.min(maxBackoffMs,5*2**Math.min(attempt,5));
      attempt+=1;
      await sleep(base+Math.floor(Math.random()*Math.min(10,base)));
    }
  }

  try{return await work();}
  finally{
    let closeError:unknown;
    try{await handle.close();}
    catch(error){closeError=error;}
    let cleanupError:unknown;
    try{await removeOwnedLock(record);}
    catch(error){cleanupError=error;}
    if(cleanupError)throw cleanupError;
    if(closeError)throw closeError;
  }
};
