import {requestJson} from "@/lib/client/api";
import type {VideoUseEdl} from "@/lib/video-use/edl";
import type {Project} from "@/schemas/project";

export type PrepareVideoUseResult={
  project:Project;
  wordCount:number;
  scriptSegmentCount:number;
  text:string;
  packedText:string;
  transcriptRelativePath:string;
  packedTranscriptRelativePath:string;
  alreadyApplied:boolean;
};

export const prepareVideoUse=async(projectId:string,input:{expectedRevision:number;operationId:string}):Promise<PrepareVideoUseResult>=>{
  const payload=await requestJson<{result:PrepareVideoUseResult}>(`/api/projects/${encodeURIComponent(projectId)}/video-use/prepare`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.result;
};

export const applyVideoUseEdl=async(projectId:string,input:{expectedRevision:number;operationId:string;edl:VideoUseEdl}):Promise<Project>=>{
  const payload=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(projectId)}/video-use/apply-edl`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(input),
  });
  return payload.project;
};
