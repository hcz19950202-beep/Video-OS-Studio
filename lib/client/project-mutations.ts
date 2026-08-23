import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {ApiRequestError,parseJsonResponse,type ApiErrorPayload} from "@/lib/client/api";

export type ProjectApiError=ApiErrorPayload;
export {ApiRequestError as ProjectRequestError};

export const createOperationId=(prefix="op")=>`${prefix}-${crypto.randomUUID()}`;

export const parseProjectResponse=<T,>(response:Response):Promise<T>=>parseJsonResponse<T>(response);

export const postProjectCommand=async(base:Project,command:ProjectCommand,commandId=createOperationId("cmd"))=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(base.project.id)}/commands`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({expectedRevision:base.project.revision,commandId,command}),
  });
  return parseProjectResponse<{project:Project;operationId:string;appliedRevision:number;alreadyApplied:boolean}>(response);
};

export const postProjectTransaction=async(base:Project,transaction:Omit<ProjectCommandTransaction,"id">,transactionId=createOperationId("tx"))=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(base.project.id)}/transactions`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({expectedRevision:base.project.revision,transactionId,transaction}),
  });
  return parseProjectResponse<{project:Project;operationId:string;appliedRevision:number;alreadyApplied:boolean}>(response);
};

export const reloadProject=async(projectId:string)=>{
  const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}`,{cache:"no-store"});
  return parseProjectResponse<{project:Project}>(response);
};
