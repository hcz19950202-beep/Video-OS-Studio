import {randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {access,copyFile,mkdir,readdir,readFile,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {promisify} from "node:util";
import {replaceFileAtomically} from "@/lib/fs/atomic-replace";
import {withWindowsTransientRetry} from "@/lib/fs/atomic-replace";
import {withExclusiveFileLock} from "@/lib/fs/exclusive-lock";

const ownerTempFile=(name:string)=>name.startsWith(".runtime-owner.json.")&&name.endsWith(".tmp");
const execFileAsync=promisify(execFile);

export type RuntimeOwner={
  runtimeId:string;
  runtimeEpoch:number;
  runtimeStartedAt:number;
  ownerPid:number;
  pid:number;
  updatedAt:string;
  previousRuntimeId?:string;
  previousRuntimeEpoch?:number;
  previousRuntimeStartedAt?:number;
};

export type RuntimeOwnerClaim=RuntimeOwner&{isNewRuntime:boolean};

const isObject=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
const requiredNumber=(value:unknown,name:string)=>{
  if(typeof value!=="number"||!Number.isFinite(value))throw new Error(`Runtime owner field ${name} is invalid.`);
  return value;
};
const requiredString=(value:unknown,name:string)=>{
  if(typeof value!=="string"||value.length===0)throw new Error(`Runtime owner field ${name} is invalid.`);
  return value;
};

const parseRuntimeOwner=(value:unknown):RuntimeOwner=>{
  if(!isObject(value))throw new Error("Runtime owner metadata is invalid.");
  const owner={
    runtimeId:requiredString(value.runtimeId,"runtimeId"),
    runtimeEpoch:requiredNumber(value.runtimeEpoch,"runtimeEpoch"),
    runtimeStartedAt:requiredNumber(value.runtimeStartedAt,"runtimeStartedAt"),
    ownerPid:requiredNumber(value.ownerPid,"ownerPid"),
    pid:requiredNumber(value.pid,"pid"),
    updatedAt:requiredString(value.updatedAt,"updatedAt"),
    previousRuntimeId:typeof value.previousRuntimeId==="string"?value.previousRuntimeId:undefined,
    previousRuntimeEpoch:typeof value.previousRuntimeEpoch==="number"?value.previousRuntimeEpoch:undefined,
    previousRuntimeStartedAt:typeof value.previousRuntimeStartedAt==="number"?value.previousRuntimeStartedAt:undefined,
  } satisfies RuntimeOwner;
  return owner;
};

export class RuntimeOwnerStore{
  readonly runtimeOwnerPath:string;
  readonly runtimeLockPath:string;

  constructor(readonly dataRoot:string){
    this.runtimeOwnerPath=join(dataRoot,".runtime-owner.json");
    this.runtimeLockPath=join(dataRoot,".runtime-owner.lock");
  }

  private backupPath(){return join(this.dataRoot,".runtime-owner.backup.json");}

  async ensure(){await mkdir(this.dataRoot,{recursive:true});}

  private async cleanupTempFiles(){
    const entries=await readdir(this.dataRoot,{withFileTypes:true});
    await Promise.all(entries.filter(entry=>entry.isFile()&&ownerTempFile(entry.name)).map(entry=>rm(join(this.dataRoot,entry.name),{force:true})));
  }

  private async readOwnerForClaim():Promise<RuntimeOwner|null>{
    try{return parseRuntimeOwner(JSON.parse(await readFile(this.runtimeOwnerPath,"utf8")));}
    catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      const invalidOwner=error instanceof SyntaxError||error instanceof Error&&error.message.startsWith("Runtime owner");
      if(code!=="ENOENT"&&!invalidOwner)throw error;
      try{
        const recovered=parseRuntimeOwner(JSON.parse(await readFile(this.backupPath(),"utf8")));
        await this.atomicWrite(recovered,false);
        return recovered;
      }catch(backupError){
        const backupCode=(backupError as NodeJS.ErrnoException).code;
        const invalidBackup=backupError instanceof SyntaxError||backupError instanceof Error&&backupError.message.startsWith("Runtime owner");
        if(backupCode==="ENOENT"||invalidBackup)return null;
        throw backupError;
      }
    }
  }

  private async withLock<T>(fn:()=>Promise<T>):Promise<T>{
    await this.ensure();
    return withExclusiveFileLock(this.runtimeLockPath,fn);
  }

  private async atomicWrite(owner:RuntimeOwner,preserveBackup=true){
    await mkdir(dirname(this.runtimeOwnerPath),{recursive:true});
    if(preserveBackup){
      try{
        await access(this.runtimeOwnerPath);
        await mkdir(dirname(this.backupPath()),{recursive:true});
        await withWindowsTransientRetry(()=>copyFile(this.runtimeOwnerPath,this.backupPath()));
      }catch(error){
        if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
      }
    }
    const tempPath=`${this.runtimeOwnerPath}.${randomUUID()}.tmp`;
    try{
      await writeFile(tempPath,JSON.stringify(owner,null,2)+"\n","utf8");
      await replaceFileAtomically(tempPath,this.runtimeOwnerPath);
    }finally{await rm(tempPath,{force:true});}
  }

  private nextRuntimeEpoch(previous:RuntimeOwner|null){
    const processStartedAt=Math.max(1,Math.floor(Date.now()-process.uptime()*1000));
    return previous?Math.max(processStartedAt,previous.runtimeEpoch+1):processStartedAt;
  }

  async isProcessAlive(pid:number){
    if(!Number.isInteger(pid)||pid<=0)return false;
    if(process.platform==="win32"){
      try{
        const{stdout}=await execFileAsync("tasklist.exe",["/FI",`PID eq ${pid}`,"/FO","CSV","/NH"],{windowsHide:true,timeout:2_000,maxBuffer:1024*1024});
        return stdout.split(/\r?\n/u).some(line=>line.includes(`"${pid}"`));
      }catch{return false;}
    }
    try{process.kill(pid,0);return true;}
    catch(error){return(error as NodeJS.ErrnoException).code==="EPERM";}
  }

  private async previousOwnerIsAlive(previous:RuntimeOwner|null){return previous?this.isProcessAlive(previous.ownerPid):false;}

  async claimRuntimeOwner(ownerPid=process.ppid):Promise<RuntimeOwnerClaim>{
    if(!Number.isInteger(ownerPid)||ownerPid<0)throw new Error("Runtime owner pid is invalid.");
    return this.withLock(async()=>{
      await this.cleanupTempFiles();
      const previous=await this.readOwnerForClaim();
      const sameRuntime=previous?.ownerPid===ownerPid||await this.previousOwnerIsAlive(previous);
      const runtimeEpoch=sameRuntime?previous!.runtimeEpoch:this.nextRuntimeEpoch(previous);
      const runtimeId=sameRuntime?previous!.runtimeId:randomUUID();
      const owner:RuntimeOwner={
        runtimeId,
        runtimeEpoch,
        runtimeStartedAt:runtimeEpoch,
        ownerPid,
        pid:process.pid,
        updatedAt:new Date().toISOString(),
        ...(sameRuntime?{
          previousRuntimeId:previous!.previousRuntimeId,
          previousRuntimeEpoch:previous!.previousRuntimeEpoch,
          previousRuntimeStartedAt:previous!.previousRuntimeStartedAt,
        }:previous?{
          previousRuntimeId:previous.runtimeId,
          previousRuntimeEpoch:previous.runtimeEpoch,
          previousRuntimeStartedAt:previous.runtimeStartedAt,
        }:{}),
      };
      await this.atomicWrite(owner);
      return{...owner,isNewRuntime:!sameRuntime};
    });
  }

  async getRuntimeOwner():Promise<RuntimeOwner|null>{
    return this.withLock(()=>this.readOwnerForClaim());
  }

  async getRuntimeEpoch():Promise<number|null>{return (await this.getRuntimeOwner())?.runtimeEpoch??null;}

  async isCurrentRuntime(runtimeId:string):Promise<boolean>{return (await this.getRuntimeOwner())?.runtimeId===runtimeId;}

  async isPreviousRuntime(runtimeId:string):Promise<boolean>{return (await this.getRuntimeOwner())?.previousRuntimeId===runtimeId;}
}
