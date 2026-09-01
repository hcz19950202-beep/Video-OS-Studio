import type {FileSystemAdapter} from "@/adapters/contracts";
import {ProjectHistoryAttributionSchema,ProjectHistoryOriginSchema,type ProjectHistoryAttribution,type ProjectHistoryOrigin} from "@/lib/project/history-attribution-schema";
import type {ProjectRepository} from "@/lib/project/repository";

const serialize=(entry:ProjectHistoryAttribution)=>`${JSON.stringify(ProjectHistoryAttributionSchema.parse(entry))}\n`;

export class ProjectHistoryAttributionRepository{
  constructor(
    private readonly fs:FileSystemAdapter,
    private readonly projects:Pick<ProjectRepository,"resolveProjectFile">,
    private readonly now:()=>string=()=>new Date().toISOString(),
  ){}

  private path(projectId:string){return this.projects.resolveProjectFile(projectId,"history-attribution.jsonl");}

  private async read(projectId:string):Promise<ProjectHistoryAttribution[]>{
    const path=this.path(projectId);
    if(!(await this.fs.exists(path)))return[];
    const text=await this.fs.readText(path);
    if(!text.trim())return[];
    const entries:ProjectHistoryAttribution[]=[];
    for(const line of text.split(/\r?\n/u)){
      if(!line.trim())continue;
      entries.push(ProjectHistoryAttributionSchema.parse(JSON.parse(line)));
    }
    return entries;
  }

  async list(projectId:string):Promise<ProjectHistoryAttribution[]>{
    const latest=new Map<string,ProjectHistoryAttribution>();
    for(const entry of await this.read(projectId))if(!latest.has(entry.operationId))latest.set(entry.operationId,entry);
    return[...latest.values()];
  }

  async record(projectId:string,operationId:string,originInput:ProjectHistoryOrigin):Promise<ProjectHistoryAttribution>{
    const origin=ProjectHistoryOriginSchema.parse(originInput);
    const work=async()=>{
      const existing=(await this.list(projectId)).find(entry=>entry.operationId===operationId);
      if(existing)return existing;
      const entry=ProjectHistoryAttributionSchema.parse({operationId,origin,recordedAt:this.now()});
      await this.fs.appendText(this.path(projectId),serialize(entry));
      return entry;
    };
    return this.fs.withExclusiveLock?this.fs.withExclusiveLock(`${this.path(projectId)}.lock`,work):work();
  }
}
