import type {DurableJobRuntime} from "@/lib/jobs/runtime";
import type {JobRecord,JobStatus} from "@/lib/jobs/schema";
import {ExportProfileSchema,type ExportProfile,type ResolvedExportProfile} from "@/lib/render/profile";

export type RenderMode="final"|"overlay";
export type RenderJob={
  id:string;
  projectId:string;
  mode:RenderMode;
  status:JobStatus;
  stage:string;
  progress:number;
  attempt:number;
  outputRelativePath?:string;
  error?:string;
  profile?:ResolvedExportProfile;
  createdAt:string;
  updatedAt:string;
  startedAt?:string;
  finishedAt?:string;
};

const asObject=(value:unknown):Record<string,unknown>|undefined=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:undefined;
const projectRenderJob=(record:JobRecord|null):RenderJob|null=>{
  if(!record||!record.projectId||!(record.type==="render-final"||record.type==="render-overlay"))return null;
  const output=record.output??{};
  const rawProfile=asObject(output.profile);
  const profile=rawProfile?ExportProfileSchema.safeParse(rawProfile):undefined;
  return{
    id:record.id,
    projectId:record.projectId,
    mode:record.type==="render-overlay"?"overlay":"final",
    status:record.status,
    stage:record.stage,
    progress:record.progress,
    attempt:record.attempt,
    outputRelativePath:typeof output.outputRelativePath==="string"?output.outputRelativePath:undefined,
    error:record.error?.message,
    profile:profile?.success?profile.data as ResolvedExportProfile:undefined,
    createdAt:record.createdAt,
    updatedAt:record.updatedAt,
    startedAt:record.startedAt,
    finishedAt:record.finishedAt,
  };
};

export class RenderJobManager{
  constructor(private readonly jobs:DurableJobRuntime){}

  async create(projectId:string,mode:RenderMode,assetBaseUrl:string,profileInput?:Partial<ExportProfile>){
    const profile=mode==="final"?ExportProfileSchema.partial().parse(profileInput??{}):undefined;
    const record=await this.jobs.create({type:mode==="final"?"render-final":"render-overlay",projectId,input:{assetBaseUrl,...(profile?{profile}:{})}});
    return projectRenderJob(record)!;
  }

  async get(id:string){return projectRenderJob(await this.jobs.get(id));}
  async cancel(id:string){return projectRenderJob(await this.jobs.cancel(id));}
  async retry(id:string){return projectRenderJob(await this.jobs.retry(id));}
}
