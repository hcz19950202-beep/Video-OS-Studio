import {requestJson} from "@/lib/client/api";
import type {CreateJobInput,JobArtifact,JobRecord} from "@/lib/jobs/schema";

export type JobQuery={projectId?:string;limit?:number};
export type JobDetails={job:JobRecord;artifacts:JobArtifact[]};

export const listJobs=async(query:JobQuery={}):Promise<JobRecord[]>=>{
  const params=new URLSearchParams();
  if(query.projectId)params.set("projectId",query.projectId);
  if(query.limit!==undefined)params.set("limit",String(query.limit));
  const suffix=params.size?`?${params.toString()}`:"";
  const payload=await requestJson<{jobs:JobRecord[]}>(`/api/jobs${suffix}`,{cache:"no-store"});
  return payload.jobs;
};

export const createJob=async(input:CreateJobInput):Promise<JobRecord>=>{
  const payload=await requestJson<{job:JobRecord}>("/api/jobs",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.job;
};

export const getJob=async(jobId:string):Promise<JobDetails>=>requestJson<JobDetails>(`/api/jobs/${encodeURIComponent(jobId)}`,{cache:"no-store"});

export const cancelJob=async(jobId:string):Promise<JobRecord>=>{
  const payload=await requestJson<{job:JobRecord}>(`/api/jobs/${encodeURIComponent(jobId)}`,{method:"DELETE"});
  return payload.job;
};

export const retryJob=async(jobId:string):Promise<JobRecord>=>{
  const payload=await requestJson<{job:JobRecord}>(`/api/jobs/${encodeURIComponent(jobId)}/retry`,{method:"POST"});
  return payload.job;
};
