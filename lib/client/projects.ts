import {requestJson} from "@/lib/client/api";
import type {ProjectSummary} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";

export type CreateStudioProjectInput={
  id?:string;
  name:string;
  width?:number;
  height?:number;
  fps?:number;
  scenario?:string;
};

export const listRecentProjects=async():Promise<ProjectSummary[]>=>{
  const payload=await requestJson<{projects:ProjectSummary[]}>("/api/projects",{cache:"no-store"});
  return payload.projects;
};

export const createStudioProject=async(input:CreateStudioProjectInput):Promise<Project>=>{
  const payload=await requestJson<{project:Project}>("/api/projects",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.project;
};

export const loadStudioProject=async(projectId:string):Promise<Project>=>{
  const payload=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(projectId)}`,{cache:"no-store"});
  return payload.project;
};
