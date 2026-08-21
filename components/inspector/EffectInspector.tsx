"use client";

import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import {ContextInspector} from "./ContextInspector";

export const EffectInspector=({project,onCommand}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>})=>{
  const setProject=useProjectStore(state=>state.setProject);
  const onTransaction=async(transaction:ProjectCommandTransaction,_message:string)=>{
    const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/transactions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(transaction)});
    const payload=await response.json() as {project?:Project;error?:string};
    if(!response.ok||!payload.project)throw new Error(payload.error||"Project transaction failed");
    setProject(payload.project);
  };
  return <ContextInspector project={project} onCommand={onCommand} onTransaction={onTransaction}/>;
};
