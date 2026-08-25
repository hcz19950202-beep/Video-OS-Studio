import {randomUUID} from "node:crypto";
import {mkdir,open,readdir,readFile,rename,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";

const lockSleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const lockContention=(code:string|undefined)=>code==="EEXIST"||code==="EPERM"||code==="EACCES";
const ownerTempFile=(name:string)=>name.startsWith(".runtime-owner.json.")&&name.endsWith(".tmp");

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

  async ensure(){await mkdir(this.dataRoot,{recursive:true});}

  private async cleanupTempFiles(){
    const entries=await readdir(this.dataRoot,{withFileTypes:true});
    await Promise.all(entries.filter(entry=>entry.isFile()&&ownerTempFile(entry.name)).map(entry=>rm(join(this.dataRoot,entry.name),{force:true})));
  }

  private async readOwnerForClaim():Promise<RuntimeOwner|null>{
    try{return parseRuntimeOwner(JSON.parse(await readFile(this.runtimeOwnerPath,"utf8")));}
    catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      if(code==="ENOENT"||error instanceof SyntaxError||error instanceof Error&&error.message.startsWith("Runtime owner"))return null;
      throw error;
    }
  }

  private async withLock<T>(fn:()=>Promise<T>):Promise<T>{
    await this.ensure();
    let handle:Awaited<ReturnType<typeof open>>|undefined;
    for(;;){
      try{handle=await open(this.runtimeLockPath,"wx");break;}
      catch(error){
        const code=(error as NodeJS.ErrnoException).code;
        if(!lockContention(code))throw error;
        try{
          const existing=await open(this.runtimeLockPath,"r");
          try{if(Date.now()-(await existing.stat()).mtimeMs>30_000)await rm(this.runtimeLockPath,{force:true});}
          finally{await existing.close();}
        }catch(lockError){
          const lockCode=(lockError as NodeJS.ErrnoException).code;
          if(lockCode!=="ENOENT"&&!lockContention(lockCode))throw lockError;
        }
        await lockSleep(5);
      }
    }
    try{return await fn();}
    finally{
      await handle.close();
      await rm(this.runtimeLockPath,{force:true});
    }
  }

  private async atomicWrite(owner:RuntimeOwner){
    await mkdir(dirname(this.runtimeOwnerPath),{recursive:true});
    const tempPath=`${this.runtimeOwnerPath}.${randomUUID()}.tmp`;
    try{
      await writeFile(tempPath,JSON.stringify(owner,null,2)+"\n","utf8");
      await rename(tempPath,this.runtimeOwnerPath);
    }finally{await rm(tempPath,{force:true});}
  }

  private nextRuntimeEpoch(previous:RuntimeOwner|null){
    const processStartedAt=Math.max(1,Math.floor(Date.now()-process.uptime()*1000));
    return previous?Math.max(processStartedAt,previous.runtimeEpoch+1):processStartedAt;
  }

  async claimRuntimeOwner(ownerPid=process.ppid):Promise<RuntimeOwnerClaim>{
    if(!Number.isInteger(ownerPid)||ownerPid<0)throw new Error("Runtime owner pid is invalid.");
    return this.withLock(async()=>{
      await this.cleanupTempFiles();
      const previous=await this.readOwnerForClaim();
      const sameRuntime=previous?.ownerPid===ownerPid;
      const runtimeEpoch=sameRuntime?previous.runtimeEpoch:this.nextRuntimeEpoch(previous);
      const runtimeId=sameRuntime?previous.runtimeId:randomUUID();
      const owner:RuntimeOwner={
        runtimeId,
        runtimeEpoch,
        runtimeStartedAt:runtimeEpoch,
        ownerPid,
        pid:process.pid,
        updatedAt:new Date().toISOString(),
        ...(sameRuntime?{
          previousRuntimeId:previous.previousRuntimeId,
          previousRuntimeEpoch:previous.previousRuntimeEpoch,
          previousRuntimeStartedAt:previous.previousRuntimeStartedAt,
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
    try{return parseRuntimeOwner(JSON.parse(await readFile(this.runtimeOwnerPath,"utf8")));}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
  }

  async getRuntimeEpoch():Promise<number|null>{return (await this.getRuntimeOwner())?.runtimeEpoch??null;}

  async isCurrentRuntime(runtimeId:string):Promise<boolean>{return (await this.getRuntimeOwner())?.runtimeId===runtimeId;}

  async isPreviousRuntime(runtimeId:string):Promise<boolean>{return (await this.getRuntimeOwner())?.previousRuntimeId===runtimeId;}
}
