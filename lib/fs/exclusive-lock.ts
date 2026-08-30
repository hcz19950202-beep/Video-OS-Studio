import {randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {mkdir,open,readFile,rm,stat} from "node:fs/promises";
import {dirname} from "node:path";
import {promisify} from "node:util";

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const contention=(code:string|undefined)=>code==="EEXIST"||code==="EPERM"||code==="EACCES"||code==="EBUSY";
const execFileAsync=promisify(execFile);

type LockRecord={token:string;pid:number;createdAt:number};

const parseLockRecord=(text:string):LockRecord|null=>{
  try{
    const value=JSON.parse(text) as Partial<LockRecord>;
    if(typeof value.token!=="string"||!Number.isInteger(value.pid)||typeof value.createdAt!=="number")return null;
    return{token:value.token,pid:value.pid!,createdAt:value.createdAt};
  }catch{return null;}
};

export const isExclusiveLockProcessAlive=async(pid:number)=>{
  if(!Number.isInteger(pid)||pid<=0)return false;
  if(pid===process.pid)return true;
  if(process.platform==="win32"){
    try{
      const{stdout}=await execFileAsync("tasklist.exe",["/FI",`PID eq ${pid}`,"/FO","CSV","/NH"],{windowsHide:true,timeout:1_000,maxBuffer:1024*1024});
      return stdout.split(/\r?\n/u).some(line=>line.includes(`"${pid}"`));
    }catch{return false;}
  }
  try{process.kill(pid,0);return true;}
  catch(error){return(error as NodeJS.ErrnoException).code==="EPERM";}
};

export type ExclusiveFileLockOptions={staleAfterMs?:number;maxBackoffMs?:number};

export const withExclusiveFileLock=async<T>(
  lockPath:string,
  work:()=>Promise<T>,
  options:ExclusiveFileLockOptions={},
):Promise<T>=>{
  const staleAfterMs=Math.max(1,options.staleAfterMs??30_000);
  const maxBackoffMs=Math.max(10,options.maxBackoffMs??100);
  const token=randomUUID();
  const record:LockRecord={token,pid:process.pid,createdAt:Date.now()};
  let handle:Awaited<ReturnType<typeof open>>|undefined;
  let attempt=0;

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
          if((existing&&!(await isExclusiveLockProcessAlive(existing.pid)))||!existing)await rm(lockPath,{force:true});
        }
      }catch(lockError){
        const lockCode=(lockError as NodeJS.ErrnoException).code;
        if(lockCode!=="ENOENT"&&!contention(lockCode))throw lockError;
      }
      const base=Math.min(maxBackoffMs,5*2**Math.min(attempt,5));
      attempt+=1;
      await sleep(base+Math.floor(Math.random()*Math.min(10,base)));
    }
  }

  try{return await work();}
  finally{
    await handle.close();
    try{
      const current=parseLockRecord(await readFile(lockPath,"utf8"));
      if(current?.token===token)await rm(lockPath,{force:true});
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
  }
};
