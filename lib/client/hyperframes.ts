import {requestJson} from "@/lib/client/api";
import type {Project} from "@/schemas/project";

export type AddHyperFramesEffectInput={
  expectedRevision:number;
  operationId:string;
  effectId:string;
  props:Record<string,unknown>;
  startFrame:number;
  durationInFrames:number;
};

export const addHyperFramesEffect=async(projectId:string,input:AddHyperFramesEffectInput):Promise<Project>=>{
  const payload=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(projectId)}/hyperframes`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.project;
};
