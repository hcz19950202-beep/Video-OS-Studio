import {createHash} from "node:crypto";
import type {CreateJobInput,JobArtifact,JobRecord} from "@/lib/jobs/schema";
import type {ProjectRepository} from "@/lib/project/repository";
import type {WorkflowJobRuntimePort} from "@/lib/workflows/runner";
import type {WorkflowStageExecutor,WorkflowStageRegistry} from "@/lib/workflows/registry";
import type {WorkflowArtifactReference} from "@/lib/workflows/schema";

export const W4_FINAL_RENDER_EXECUTOR_KEY="w4.final-render";

export type W4WorkflowJobRuntime=WorkflowJobRuntimePort&{
  create:(input:CreateJobInput)=>Promise<JobRecord>;
  getArtifacts:(jobId:string)=>Promise<JobArtifact[]>;
};

type Dependencies={
  repository:Pick<ProjectRepository,"load">;
  jobs:W4WorkflowJobRuntime;
  fallbackAssetBaseUrl:string;
};

const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const mapArtifact=(stageId:string,jobId:string,artifact:JobArtifact,index:number):WorkflowArtifactReference=>({
  id:`wf-${stageId}-${jobId}-${artifact.id}-${index}`,
  stageId,
  kind:artifact.kind==="render"?"final-render":"other",
  createdAt:new Date().toISOString(),
  jobId,
  relativePath:artifact.relativePath,
  digest:artifact.relativePath?digest({relativePath:artifact.relativePath,sizeBytes:artifact.sizeBytes}):undefined,
});

const renderJobForAttempt=async(deps:Dependencies,previousJobIds:string[],input:CreateJobInput)=>{
  const prior=previousJobIds.at(-1);
  if(prior){
    const job=await deps.jobs.get(prior);
    if(job){
      if(["queued","preparing","running"].includes(job.status))return job;
      if(["failed","cancelled","interrupted"].includes(job.status)){
        if(job.error?.retryable===false)throw Object.assign(new Error(job.error.message),{code:job.error.code,retryable:false});
        return deps.jobs.retry(prior);
      }
      // A completed render belongs to an older Stage attempt. W3 keeps historical
      // jobIds for audit when downstream work is invalidated, so a new Stage
      // attempt must create a fresh render instead of silently reusing stale MP4.
    }
  }
  return deps.jobs.create(input);
};

const finalRenderExecutor=(deps:Dependencies):WorkflowStageExecutor=>({
  start:async context=>{
    const project=await deps.repository.load(context.run.projectId);
    const assetBaseUrl=context.run.assetBaseUrl??deps.fallbackAssetBaseUrl;
    const job=await renderJobForAttempt(deps,context.previousJobIds,{type:"render-final",projectId:project.project.id,input:{assetBaseUrl}});
    return{kind:"job",jobId:job.id};
  },
  reconcileJob:async(context,job)=>{
    const project=await deps.repository.load(context.run.projectId);
    const sourceProjectRevision=typeof job.output?.sourceProjectRevision==="number"?job.output.sourceProjectRevision:context.execution.baseProjectRevision;
    if(sourceProjectRevision!==undefined&&project.project.revision!==sourceProjectRevision){
      throw Object.assign(new Error(`Project changed from revision ${sourceProjectRevision} to ${project.project.revision} while Final Render was running. The completed MP4 is stale and must be rendered again.`),{
        code:"WORKFLOW_RENDER_STALE",
        retryable:true,
        details:{sourceProjectRevision,currentProjectRevision:project.project.revision,jobId:job.id},
      });
    }
    const artifacts=(await deps.jobs.getArtifacts(job.id)).map((artifact,index)=>mapArtifact(context.stage.id,job.id,artifact,index));
    return{artifacts,outputDigest:digest({outputRelativePath:job.output?.outputRelativePath,mode:job.output?.mode,profile:job.output?.profile,sourceProjectRevision,assetBaseUrl:context.run.assetBaseUrl??deps.fallbackAssetBaseUrl})};
  },
});

export const registerW4WorkflowStages=(registry:WorkflowStageRegistry,deps:Dependencies)=>{
  if(!registry.has(W4_FINAL_RENDER_EXECUTOR_KEY))registry.register(W4_FINAL_RENDER_EXECUTOR_KEY,finalRenderExecutor(deps));
  return registry;
};
