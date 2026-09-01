"use client";

import {useEffect} from "react";
import {loadStudioProject} from "@/lib/client/projects";
import {useProjectStore} from "@/store/project-store";
import {useWorkspaceHandoffStore} from "@/store/workspace-handoff-store";

export const CampaignMissionHandoffController=({projectId,missionId}:{projectId:string;missionId:string})=>{
  useEffect(()=>{
    let active=true;
    useWorkspaceHandoffStore.getState().setPreferredMissionId(missionId);
    void loadStudioProject(projectId).then(project=>{
      if(active)useProjectStore.getState().setProject(project);
    }).catch(()=>{
      if(active)useWorkspaceHandoffStore.getState().setPreferredMissionId(null);
    });
    return()=>{active=false;};
  },[missionId,projectId]);
  return null;
};
