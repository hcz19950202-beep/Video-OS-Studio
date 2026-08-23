import {requestJson} from "@/lib/client/api";
import {createOperationId} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";

export type MediaImportReport={
  kind?:"video"|"audio"|"image"|"subtitle";
  normalized?:boolean;
  assetId?:string;
  workingFileName?:string;
  originalRelativePath?:string;
  workingRelativePath?:string;
};

export type MediaImportResult={project:Project;import?:MediaImportReport};

export const importProjectMedia=async(base:Project,file:File,operationId=createOperationId("media")):Promise<MediaImportResult>=>{
  const params=new URLSearchParams({
    fileName:file.name,
    expectedRevision:String(base.project.revision),
    operationId,
  });
  return requestJson<MediaImportResult>(`/api/projects/${encodeURIComponent(base.project.id)}/media?${params.toString()}`,{
    method:"POST",
    headers:{"Content-Type":file.type||"application/octet-stream"},
    body:file,
  });
};
