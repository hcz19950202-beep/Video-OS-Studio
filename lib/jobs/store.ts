import {randomUUID} from "node:crypto";
import {appendFile,mkdir,readFile,readdir,rename,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {JobArtifactsSchema,JobIdSchema,JobRecordSchema,type JobArtifact,type JobRecord} from "@/lib/jobs/schema";

export type JobLogStream="stdout"|"stderr";

const parseJson=<T>(text:string,parser:(value:unknown)=>T)=>parser(JSON.parse(text));

export class FileJobStore{
  readonly jobsRoot:string;
  constructor(dataRoot:string){this.jobsRoot=join(dataRoot,"jobs");}

  private dir(jobId:string){return join(this.jobsRoot,JobIdSchema.parse(jobId));}
  private path(jobId:string,name:"job.json"|"stdout.log"|"stderr.log"|"artifacts.json"){return join(this.dir(jobId),name);}
  private async atomicWrite(path:string,content:string){
    await mkdir(join(path,".."),{recursive:true}).catch(()=>undefined);
    const temp=`${path}.${randomUUID()}.tmp`;
    await writeFile(temp,content,"utf8");
    await rename(temp,path);
  }

  async ensure(){await mkdir(this.jobsRoot,{recursive:true});}

  async create(record:JobRecord){
    const parsed=JobRecordSchema.parse(record);
    await mkdir(this.dir(parsed.id),{recursive:false});
    await Promise.all([
      this.atomicWrite(this.path(parsed.id,"job.json"),JSON.stringify(parsed,null,2)),
      writeFile(this.path(parsed.id,"stdout.log"),"","utf8"),
      writeFile(this.path(parsed.id,"stderr.log"),"","utf8"),
      this.atomicWrite(this.path(parsed.id,"artifacts.json"),"[]\n"),
    ]);
    return parsed;
  }

  async get(jobId:string):Promise<JobRecord|null>{
    try{return parseJson(await readFile(this.path(jobId,"job.json"),"utf8"),value=>JobRecordSchema.parse(value));}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
  }

  async save(record:JobRecord){
    const parsed=JobRecordSchema.parse(record);
    await this.atomicWrite(this.path(parsed.id,"job.json"),JSON.stringify(parsed,null,2));
    return parsed;
  }

  async list():Promise<JobRecord[]>{
    await this.ensure();
    const entries=await readdir(this.jobsRoot,{withFileTypes:true});
    const jobs=await Promise.all(entries.filter(entry=>entry.isDirectory()).map(async entry=>{
      try{return await this.get(entry.name);}catch{return null;}
    }));
    return jobs.filter((job):job is JobRecord=>job!==null).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  }

  async appendLog(jobId:string,stream:JobLogStream,chunk:string){
    if(!chunk)return;
    await appendFile(this.path(jobId,stream==="stdout"?"stdout.log":"stderr.log"),chunk,"utf8");
  }

  async readLog(jobId:string,stream:JobLogStream){
    try{return await readFile(this.path(jobId,stream==="stdout"?"stdout.log":"stderr.log"),"utf8");}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return "";throw error;}
  }

  async getArtifacts(jobId:string):Promise<JobArtifact[]>{
    try{return parseJson(await readFile(this.path(jobId,"artifacts.json"),"utf8"),value=>JobArtifactsSchema.parse(value));}
    catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
  }

  async saveArtifacts(jobId:string,artifacts:JobArtifact[]){
    const parsed=JobArtifactsSchema.parse(artifacts);
    await this.atomicWrite(this.path(jobId,"artifacts.json"),JSON.stringify(parsed,null,2));
    return parsed;
  }
}
