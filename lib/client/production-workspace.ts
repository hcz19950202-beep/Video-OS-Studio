import {requestJson} from "@/lib/client/api";
import type {CreateProductionMissionInput,ProductionMission,UpdateProductionMissionDetailsInput} from "@/lib/production/mission/schema";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";

type CreateMissionBody=Omit<CreateProductionMissionInput,"projectId">;
const projectBase=(projectId:string)=>`/api/projects/${encodeURIComponent(projectId)}/missions`;
const missionBase=(projectId:string,missionId:string)=>`${projectBase(projectId)}/${encodeURIComponent(missionId)}`;
const jsonHeaders={"content-type":"application/json"};

export const listProductionMissions=async(projectId:string)=>{
  const response=await requestJson<{missions:ProductionMission[]}>(projectBase(projectId));
  return response.missions;
};

export const createProductionMission=async(projectId:string,input:CreateMissionBody)=>{
  const response=await requestJson<{mission:ProductionMission}>(projectBase(projectId),{method:"POST",headers:jsonHeaders,body:JSON.stringify(input)});
  return response.mission;
};

export const getProductionWorkspace=async(projectId:string,missionId:string)=>{
  const response=await requestJson<{workspace:ProductionWorkspaceSnapshot}>(missionBase(projectId,missionId));
  return response.workspace;
};

export const updateProductionMission=async(projectId:string,missionId:string,input:UpdateProductionMissionDetailsInput)=>{
  const response=await requestJson<{workspace:ProductionWorkspaceSnapshot}>(missionBase(projectId,missionId),{method:"PATCH",headers:jsonHeaders,body:JSON.stringify(input)});
  return response.workspace;
};

export const cancelProductionMission=async(projectId:string,missionId:string)=>{
  const response=await requestJson<{workspace:ProductionWorkspaceSnapshot}>(missionBase(projectId,missionId),{method:"DELETE"});
  return response.workspace;
};
