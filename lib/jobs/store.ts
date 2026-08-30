import {randomUUID} from "node:crypto";
import {access,appendFile,copyFile,mkdir,open,readFile,readdir,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {replaceFileAtomically} from "@/lib/fs/atomic-replace";
import {withWindowsTransientRetry} from "@/lib/fs/atomic-replace";
import {JobArtifactsSchema,JobIdSchema,JobRecordSchema,type JobArtifact,type JobRecord} from "@/lib/jobs/schema";
import {RuntimeOwnerStore} from "@/lib/runtime/runtime-owner";

export type JobLogStream="stdout"|"stderr";
export type JobLogTail={text:string;totalBytes:number};
const parseJson=<T>(text:string,parser:(value:unknown)=>T)=>parser(JSON.parse(text));

export class FileJobStore{
  readonly jobsRoot:string;
  readonly runtimeOwner:RuntimeOwnerStore;
  private readonly pathChains=new Map<string,Promise<void>>();
  constructor(dataRoot:string,runtimeOwner=new RuntimeOwnerStore(dataRoot)){
    this.jobsRoot=join(dataRoot,"jobs");
    this.runtimeOwner=runtimeOwner;
  }

  private dir(jobId:string){return join(this.jobsRoot,JobIdSchema.parse(jobId));}
  private path(jobId:string,name:"job.json"|"stdout.log"|"stderr.log"|"artifacts.json"){return join(this.dir(jobId),name);}
  private backupPath(jobId:string,name:"job.json"|"artifacts.json"){return join(this.dir(jobId),name.replace(".json",".backup.json"));}

  private async withPathLock<T>(path:string,fn:()=>Promise<T>):Promise<T>{
    const previous=this.pathChains.get(path)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.pathChains.set(path,current);
    await previous.catch(()=>undefined);
    try{
      return await fn();
    }finally{
      release();
      if(this.pathChains.get(path)===current)this.pathChains.delete(path);
    }
  }

  private async atomicWriteUnlocked(path:string,content:string,backupPath?:string){
    await mkdir(dirname(path),{recursive:true});
    if(backupPath){
      try{
        await access(path);
        await mkdir(dirname(backupPath),{recursive:true});
        await withWindowsTransientRetry(()=>copyFile(path,backupPath));
      }catch(error){
        if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
      }
    }
    const temp=`${path}.${randomUUID()}.tmp`;
    try{
      await writeFile(temp,content,"utf8");
      await replaceFileAtomically(temp,path);
    }finally{await rm(temp,{force:true});}
  }

  private async atomicWrite(path:string,content:string,backupPath?:string){
    await this.withPathLock(path,()=>this.atomicWriteUnlocked(path,content,backupPath));
  }

  private async loadJobUnderPathLock(jobId:string):Promise<JobRecord|null>{
    const path=this.path(jobId,"job.json");
    const backupPath=this.backupPath(jobId,"job.json");
    try{
      await access(path);
      try{return parseJson(await readFile(path,"utf8"),value=>JobRecordSchema.parse(value));}
      catch(primaryError){
        if(!(await this.exists(backupPath)))throw primaryError;
        try{
          const recovered=parseJson(await readFile(backupPath,"utf8"),value=>JobRecordSchema.parse(value));
          await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2));
          return recovered;
        }catch{throw primaryError;}
      }
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    if(!(await this.exists(backupPath)))return null;
    const recovered=parseJson(await readFile(backupPath,"utf8"),value=>JobRecordSchema.parse(value));
    await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2));
    return recovered;
  }

  private async exists(path:string){
    try{await access(path);return true;}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return false;throw error;}
  }

  private async loadArtifactsUnderPathLock(jobId:string):Promise<JobArtifact[]>{
    const path=this.path(jobId,"artifacts.json");
    const backupPath=this.backupPath(jobId,"artifacts.json");
    try{
      await access(path);
      try{return parseJson(await readFile(path,"utf8"),value=>JobArtifactsSchema.parse(value));}
      catch(primaryError){
        if(!(await this.exists(backupPath)))throw primaryError;
        try{
          const recovered=parseJson(await readFile(backupPath,"utf8"),value=>JobArtifactsSchema.parse(value));
          await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2)+"\n");
          return recovered;
        }catch{throw primaryError;}
      }
    }catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    if(!(await this.exists(backupPath)))return[];
    const recovered=parseJson(await readFile(backupPath,"utf8"),value=>JobArtifactsSchema.parse(value));
    await this.atomicWriteUnlocked(path,JSON.stringify(recovered,null,2)+"\n");
    return recovered;
  }

  async ensure(){await mkdir(this.jobsRoot,{recursive:true});}

  async create(record:JobRecord){
    const parsed=JobRecordSchema.parse(record);
    await mkdir(this.dir(parsed.id),{recursive:false});
    await Promise.all([
      this.atomicWrite(this.path(parsed.id,"job.json"),JSON.stringify(parsed,null,2)),
      this.withPathLock(this.path(parsed.id,"stdout.log"),()=>writeFile(this.path(parsed.id,"stdout.log"),"","utf8")),
      this.withPathLock(this.path(parsed.id,"stderr.log"),()=>writeFile(this.path(parsed.id,"stderr.log"),"","utf8")),
      this.atomicWrite(this.path(parsed.id,"artifacts.json"),"[]\n"),
    ]);
    return parsed;
  }

  async get(jobId:string):Promise<JobRecord|null>{
    const path=this.path(jobId,"job.json");
    return this.withPathLock(path,()=>this.loadJobUnderPathLock(jobId));
  }

  async save(record:JobRecord){
    const parsed=JobRecordSchema.parse(record);
    await this.atomicWrite(this.path(parsed.id,"job.json"),JSON.stringify(parsed,null,2),this.backupPath(parsed.id,"job.json"));
    return parsed;
  }

  async list():Promise<JobRecord[]>{
    await this.ensure();
    const entries=await readdir(this.jobsRoot,{withFileTypes:true});
    const jobs=await Promise.all(entries.filter(entry=>entry.isDirectory()).map(async entry=>{try{return await this.get(entry.name);}catch{return null;}}));
    return jobs.filter((job):job is JobRecord=>job!==null).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  }

  async appendLog(jobId:string,stream:JobLogStream,chunk:string){if(chunk){const path=this.path(jobId,stream==="stdout"?"stdout.log":"stderr.log");await this.withPathLock(path,()=>appendFile(path,chunk,"utf8"));}}
  async readLog(jobId:string,stream:JobLogStream){
    const path=this.path(jobId,stream==="stdout"?"stdout.log":"stderr.log");
    return this.withPathLock(path,async()=>{
      try{return await readFile(path,"utf8");}
      catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return "";throw error;}
    });
  }
  async readLogTail(jobId:string,stream:JobLogStream,tailBytes:number):Promise<JobLogTail>{
    const path=this.path(jobId,stream==="stdout"?"stdout.log":"stderr.log");
    return this.withPathLock(path,async()=>{
      let handle:Awaited<ReturnType<typeof open>>|undefined;
      try{
        handle=await open(path,"r");
        const totalBytes=(await handle.stat()).size;
        const readBytes=Math.min(totalBytes,Math.max(0,Math.round(tailBytes)));
        if(readBytes===0)return{text:"",totalBytes};
        const buffer=Buffer.allocUnsafe(readBytes);
        const{bytesRead}=await handle.read(buffer,0,readBytes,totalBytes-readBytes);
        return{text:buffer.subarray(0,bytesRead).toString("utf8"),totalBytes};
      }catch(error){
        if((error as NodeJS.ErrnoException).code==="ENOENT")return{text:"",totalBytes:0};
        throw error;
      }finally{await handle?.close();}
    });
  }
  async getArtifacts(jobId:string):Promise<JobArtifact[]>{
    const path=this.path(jobId,"artifacts.json");
    return this.withPathLock(path,()=>this.loadArtifactsUnderPathLock(jobId));
  }
  async saveArtifacts(jobId:string,artifacts:JobArtifact[]){const parsed=JobArtifactsSchema.parse(artifacts);await this.atomicWrite(this.path(jobId,"artifacts.json"),JSON.stringify(parsed,null,2)+"\n",this.backupPath(jobId,"artifacts.json"));return parsed;}
}
