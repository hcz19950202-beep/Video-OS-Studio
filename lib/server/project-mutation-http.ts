import {randomUUID} from "node:crypto";
import {ZodError} from "zod";
import {ProjectMutationInvariantError,ProjectOperationIdReuseError,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import type {ProjectMutationErrorBody} from "@/lib/project/mutation-contract";

export const projectMutationErrorResponse=(error:unknown,action:string)=>{
  const requestId=randomUUID();
  if(error instanceof ProjectRevisionConflictError){
    const body:ProjectMutationErrorBody={code:error.code,message:error.message,retryable:true,details:{expectedRevision:error.expectedRevision,currentRevision:error.currentRevision},requestId,action};
    return Response.json(body,{status:409});
  }
  if(error instanceof ProjectOperationIdReuseError){
    const body:ProjectMutationErrorBody={code:error.code,message:error.message,retryable:false,details:{operationId:error.operationId},requestId,action:"Generate a new operation ID for a different edit."};
    return Response.json(body,{status:409});
  }
  if(error instanceof ZodError){
    const body:ProjectMutationErrorBody={code:"INVALID_MUTATION_REQUEST",message:"The project mutation request is invalid.",retryable:false,details:{issues:error.issues.map(issue=>({path:issue.path.join("."),message:issue.message}))},requestId,action};
    return Response.json(body,{status:400});
  }
  if(error instanceof ProjectMutationInvariantError){
    const body:ProjectMutationErrorBody={code:error.code,message:error.message,retryable:false,requestId,action};
    return Response.json(body,{status:422});
  }
  if(error instanceof Error){
    const body:ProjectMutationErrorBody={code:"PROJECT_MUTATION_REJECTED",message:error.message,retryable:true,requestId,action};
    return Response.json(body,{status:422});
  }
  const body:ProjectMutationErrorBody={code:"INTERNAL_ERROR",message:"The project mutation failed unexpectedly.",retryable:true,requestId,action};
  return Response.json(body,{status:500});
};
