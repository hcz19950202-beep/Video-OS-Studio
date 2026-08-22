import {randomUUID} from "node:crypto";
import {appendFile,mkdir,readFile,readdir,rename,rm,writeFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {JobArtifactsSchema,JobIdSchema,JobRecordSchema,type JobArtifact,type JobRecord} from "@/lib/jobs/schema";

export type JobLogStream="stdout"|"stderr";
const parseJson=<T>(text:string,parser:(value:unknown)=>T)=>parser(JSON.parse(text));

export class FileJobStore{
  readonly jobsRoot:string;
  private readonly pathChains=new Map<string,Promise<void>>();
  constructor(dataRoot:string){this.jobsRoot=join(dataRoot,"jobs");}

  private dir(jobId:string){return join(this.jobsRoot,JobIdSchema.parse(jobId));}
  private path(jobId:string,name:"job.json"|"stdout.log"|"stderr.log"|"artifacts.json"){return join(this.dir(jobId),name);}

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

  private async atomicWrite(path:string,content:string){
    await this.withPathLock(path,async()=>{
      const temp=`${path}.${randomUUID()}.tmp`;
      try{
        await mkdir(dirname(path),{recursive:true});
        await writeFile(temp,content,"utf8");
        await rename(temp,path);
      }finally{await rm(temp,{force:true});}
    });
  }

  async ensure(){await mkdir(this.jobsRoot,{recursive:true});}

  async claimRuntimeOwner(ownerPid=process.ppid){
    if(process.env.NEXT_PHASE==="phase-production-build")return false;
    const ownerPath=join(this.jobsRoot,".runtime-owner.json");
    let previousOwnerPid:number|undefined;
    try{
      const parsed=JSON.parse(await readFile(ownerPath,"utf8")) as {ownerPid?:unknown;pid?:unknown};
      if(typeof parsed.ownerPid==="number")previousOwnerPid=parsed.ownerPid;
      else if(typeof parsed.pid==="number")previousOwnerPid=parsed.pid;
    }catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    const sameProcess=previousOwnerPid===ownerPid;
    await mkdir(this.jobsRoot,{recursive:true});
    await writeFile(ownerPath,JSON.stringify({pid:process.pid,ownerPid,updatedAt:new Date().toISOString()},null,2)+"\n","utf8");
    return sameProcess;
  }

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
    return this.withPathLock(path,async()=>{
      try{return parseJson(await readFile(path,"utf8"),value=>JobRecordSchema.parse(value));}
      catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
    });
  }

  async save(record:JobRecord){
    const parsed=JobRecordSchema.parse(record);
    await this.atomicWrite(this.path(parsed.id,"job.json"),JSON.stringify(parsed,null,2));
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
  async getArtifacts(jobId:string):Promise<JobArtifact[]>{
    const path=this.path(jobId,"artifacts.json");
    return this.withPathLock(path,async()=>{
      try{return parseJson(await readFile(path,"utf8"),value=>JobArtifactsSchema.parse(value));}
      catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
    });
  }
  async saveArtifacts(jobId:string,artifacts:JobArtifact[]){const parsed=JobArtifactsSchema.parse(artifacts);await this.atomicWrite(this.path(jobId,"artifacts.json"),JSON.stringify(parsed,null,2));return parsed;}
}
