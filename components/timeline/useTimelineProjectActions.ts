"use client";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {ProjectRequestError,postProjectCommand,postProjectTransaction,reloadProject} from "@/lib/client/project-mutations";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";

export const useTimelineProjectActions=(project:Project)=>{const setProject=useProjectStore(state=>state.setProject);const pushHistory=useHistoryStore(state=>state.push);const takeUndo=useHistoryStore(state=>state.takeUndo);const takeRedo=useHistoryStore(state=>state.takeRedo);
  const postCommand=async(command:ProjectCommand,label:string,{record=true}:{record?:boolean}={})=>{const before=useProjectStore.getState().project??project;try{const response=await postProjectCommand(before,command);setProject(response.project);if(record)pushHistory({projectId:project.project.id,label,before,after:response.project});return response.project;}catch(error){if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){const latest=await reloadProject(project.project.id);setProject(latest.project);}throw error;}};
  const postTransaction=async(transaction:ProjectCommandTransaction,label:string)=>{const before=useProjectStore.getState().project??project;try{const response=await postProjectTransaction(before,{label:transaction.label,commands:transaction.commands},transaction.id);setProject(response.project);pushHistory({projectId:project.project.id,label,before,after:response.project});return response.project;}catch(error){if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){const latest=await reloadProject(project.project.id);setProject(latest.project);}throw error;}};
  const undo=async(labelPrefix="Undo")=>{const entry=takeUndo(project.project.id);if(!entry)return;try{await postCommand({type:"restore-project-snapshot",snapshot:entry.before},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){takeRedo(project.project.id);throw error;}};
  const redo=async(labelPrefix="Redo")=>{const entry=takeRedo(project.project.id);if(!entry)return;try{await postCommand({type:"restore-project-snapshot",snapshot:entry.after},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){takeUndo(project.project.id);throw error;}};
  return{postCommand,postTransaction,undo,redo};};
