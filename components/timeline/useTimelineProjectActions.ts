"use client";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";

export const useTimelineProjectActions=(project:Project)=>{const setProject=useProjectStore(state=>state.setProject);const pushHistory=useHistoryStore(state=>state.push);const takeUndo=useHistoryStore(state=>state.takeUndo);const takeRedo=useHistoryStore(state=>state.takeRedo);
  const postCommand=async(command:ProjectCommand,label:string,{record=true}:{record?:boolean}={})=>{const before=useProjectStore.getState().project??project;const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/commands`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});const payload=await response.json() as{project?:Project;error?:string};if(!response.ok||!payload.project)throw new Error(payload.error||label);setProject(payload.project);if(record)pushHistory({projectId:project.project.id,label,before,after:payload.project});return payload.project;};
  const postTransaction=async(transaction:ProjectCommandTransaction,label:string)=>{const before=useProjectStore.getState().project??project;const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/transactions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(transaction)});const payload=await response.json() as{project?:Project;error?:string};if(!response.ok||!payload.project)throw new Error(payload.error||label);setProject(payload.project);pushHistory({projectId:project.project.id,label,before,after:payload.project});return payload.project;};
  const undo=async(labelPrefix="Undo")=>{const entry=takeUndo(project.project.id);if(!entry)return;try{await postCommand({type:"restore-project-snapshot",snapshot:entry.before},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){takeRedo(project.project.id);throw error;}};
  const redo=async(labelPrefix="Redo")=>{const entry=takeRedo(project.project.id);if(!entry)return;try{await postCommand({type:"restore-project-snapshot",snapshot:entry.after},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){takeUndo(project.project.id);throw error;}};
  return{postCommand,postTransaction,undo,redo};};
