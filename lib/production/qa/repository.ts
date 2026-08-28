import {join} from "node:path";
import type {FileSystemAdapter} from "@/adapters/contracts";
import {QAReportIdSchema,QAReportSchema,type QAReport} from "@/lib/production/qa/schema";
import {QAReportNotFoundError} from "@/lib/production/qa/errors";
import {ProjectIdSchema} from "@/schemas/project";

const serialize=(report:QAReport)=>JSON.stringify(QAReportSchema.parse(report),null,2)+"\n";
const parse=(text:string)=>QAReportSchema.parse(JSON.parse(text));

export class QAReportRepository{
  private readonly createChains=new Map<string,Promise<void>>();

  constructor(private readonly fs:FileSystemAdapter,readonly dataRoot:string){}

  private reportDir(projectId:string){return join(this.dataRoot,"projects",ProjectIdSchema.parse(projectId),"production","qa");}
  private reportPath(projectId:string,reportId:string){return join(this.reportDir(projectId),`${QAReportIdSchema.parse(reportId)}.json`);}
  private reportLockPath(projectId:string,reportId:string){return `${this.reportPath(projectId,reportId)}.lock`;}

  private async withCreateChain<T>(path:string,work:()=>Promise<T>):Promise<T>{
    const previous=this.createChains.get(path)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{release=resolve;});
    this.createChains.set(path,current);
    await previous.catch(()=>undefined);
    try{return await work();}
    finally{
      release();
      if(this.createChains.get(path)===current)this.createChains.delete(path);
    }
  }

  private async withDurableLock<T>(projectId:string,reportId:string,work:()=>Promise<T>):Promise<T>{
    if(this.fs.withExclusiveLock)return this.fs.withExclusiveLock(this.reportLockPath(projectId,reportId),work);
    return work();
  }

  async create(reportInput:QAReport):Promise<QAReport>{
    const report=QAReportSchema.parse(reportInput);
    const path=this.reportPath(report.projectId,report.id);
    return this.withCreateChain(path,()=>this.withDurableLock(report.projectId,report.id,async()=>{
      await this.fs.ensureDir(this.reportDir(report.projectId));
      if(await this.fs.exists(path))throw new Error(`QA report ${report.id} already exists.`);
      await this.fs.writeTextAtomic(path,serialize(report));
      return report;
    }));
  }

  async load(projectIdInput:string,reportIdInput:string):Promise<QAReport|null>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const reportId=QAReportIdSchema.parse(reportIdInput);
    const path=this.reportPath(projectId,reportId);
    if(!(await this.fs.exists(path)))return null;
    const report=parse(await this.fs.readText(path));
    if(report.projectId!==projectId||report.id!==reportId)throw new Error("QA report identity does not match its repository path.");
    return report;
  }

  async require(projectId:string,reportId:string):Promise<QAReport>{
    const report=await this.load(projectId,reportId);
    if(!report)throw new QAReportNotFoundError(reportId);
    return report;
  }

  async list(projectIdInput:string):Promise<QAReport[]>{
    const projectId=ProjectIdSchema.parse(projectIdInput);
    const dir=this.reportDir(projectId);
    const files=await this.fs.listFiles(dir);
    const reports:QAReport[]=[];
    for(const name of files){
      const match=/^([0-9a-f-]{36})\.json$/i.exec(name);
      if(!match)continue;
      try{
        const report=await this.load(projectId,match[1]);
        if(report)reports.push(report);
      }catch{
        // An invalid report must not poison unrelated QA history.
      }
    }
    return reports.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
  }

  async latest(projectId:string,missionId?:string):Promise<QAReport|null>{
    const reports=await this.list(projectId);
    return reports.find(report=>!missionId||report.missionId===missionId)??null;
  }
}
