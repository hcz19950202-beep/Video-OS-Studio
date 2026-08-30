"use client";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {ProjectRequestError,postProjectCommand,postProjectTransaction,publishProjectIfActive,reloadProject} from "@/lib/client/project-mutations";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";

export const runHistoryAction=async(action:()=>Promise<void>):Promise<boolean>=>{
  try{await action();return true;}
  catch(error){
    if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT")return false;
    throw error;
  }
};

export const useTimelineProjectActions=(project:Project)=>{const setProject=useProjectStore(state=>state.setProject);const pushHistory=useHistoryStore(state=>state.push);const takeUndo=useHistoryStore(state=>state.takeUndo);const takeRedo=useHistoryStore(state=>state.takeRedo);const rollbackUndo=useHistoryStore(state=>state.rollbackUndo);const rollbackRedo=useHistoryStore(state=>state.rollbackRedo);
  const publish=(projectId:string,candidate:Project)=>publishProjectIfActive(projectId,candidate,()=>useProjectStore.getState().project,setProject);
  const postCommand=async(command:ProjectCommand,label:string,{record=true}:{record?:boolean}={})=>{const before=useProjectStore.getState().project??project;try{const response=await postProjectCommand(before,command);publish(before.project.id,response.project);if(record)pushHistory({projectId:project.project.id,label,before,after:response.project});return response.project;}catch(error){if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){const latest=await reloadProject(before.project.id);publish(before.project.id,latest.project);}throw error;}};
  const postTransaction=async(transaction:ProjectCommandTransaction,label:string)=>{const before=useProjectStore.getState().project??project;try{const response=await postProjectTransaction(before,{label:transaction.label,commands:transaction.commands},transaction.id);publish(before.project.id,response.project);pushHistory({projectId:project.project.id,label,before,after:response.project});return response.project;}catch(error){if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){const latest=await reloadProject(before.project.id);publish(before.project.id,latest.project);}throw error;}};
  const undo=async(labelPrefix="Undo")=>{const current=useProjectStore.getState().project??project;const entry=takeUndo(current.project.id,current.project.revision);if(!entry)return;return runHistoryAction(async()=>{try{await postCommand({type:"restore-project-snapshot",snapshot:entry.before},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){rollbackUndo(current.project.id,entry,current.project.revision);throw error;}});};
  const redo=async(labelPrefix="Redo")=>{const current=useProjectStore.getState().project??project;const entry=takeRedo(current.project.id,current.project.revision);if(!entry)return;return runHistoryAction(async()=>{try{await postCommand({type:"restore-project-snapshot",snapshot:entry.after},`${labelPrefix}: ${entry.label}`,{record:false});}catch(error){rollbackRedo(current.project.id,entry,current.project.revision);throw error;}});};
  return{postCommand,postTransaction,undo,redo};};
