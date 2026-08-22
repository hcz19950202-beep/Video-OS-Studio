import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";

export type ProjectApiError={
  code?:string;
  error?:string;
  message?:string;
  action?:string;
  retryable?:boolean;
  details?:Record<string,unknown>;
  requestId?:string;
};

export class ProjectRequestError extends Error{
  constructor(
    message:string,
    readonly status:number,
    readonly code?:string,
    readonly action?:string,
    readonly retryable=true,
    readonly details?:Record<string,unknown>,
    readonly requestId?:string,
  ){super(message);this.name="ProjectRequestError";}
}

export const createOperationId=(prefix="op")=>`${prefix}-${crypto.randomUUID()}`;

export const parseProjectResponse=async<T>(response:Response):Promise<T>=>{
  const payload=(await response.json()) as T&ProjectApiError;
  if(!response.ok)throw new ProjectRequestError(payload.message||payload.error||`Request failed with status ${response.status}`,response.status,payload.code,payload.action,payload.retryable??true,payload.details,payload.requestId);
  return payload;
};

export const postProjectCommand=async(base:Project,command:ProjectCommand,commandId=createOperationId("cmd"))=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(base.project.id)}/commands`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({expectedRevision:base.project.revision,commandId,command}),
  });
  return parseProjectResponse<{project:Project;operationId:string;appliedRevision:number;alreadyApplied:boolean}>(response);
};

export const reloadProject=async(projectId:string)=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}`,{cache:"no-store"});
  return parseProjectResponse<{project:Project}>(response);
};
