"use client";

import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import {ProjectRequestError,postProjectTransaction,publishProjectIfActive,reloadProject} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import {ContextInspector} from "./ContextInspector";
import {InspectorRegistryShell} from "./InspectorRegistryShell";

export const EffectInspector=({project,onCommand}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>})=>{
  const setProject=useProjectStore(state=>state.setProject);
  const publish=(projectId:string,candidate:Project)=>publishProjectIfActive(projectId,candidate,()=>useProjectStore.getState().project,setProject);
  const onTransaction=async(transaction:ProjectCommandTransaction,message:string)=>{
    const base=useProjectStore.getState().project??project;
    try{
      const response=await postProjectTransaction(base,{label:transaction.label,commands:transaction.commands},transaction.id);
      publish(base.project.id,response.project);
    }catch(error){
      if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){
        const latest=await reloadProject(base.project.id);
        publish(base.project.id,latest.project);
      }
      throw error instanceof Error?error:new Error(`${message}: project transaction failed`);
    }
  };
  return <InspectorRegistryShell project={project}><ContextInspector project={project} onCommand={onCommand} onTransaction={onTransaction}/></InspectorRegistryShell>;
};
