import {create} from "zustand";
import type {Project} from "@/schemas/project";

export type HistoryEntry={projectId:string;label:string;before:Project;after:Project};
type StoredHistoryEntry=HistoryEntry&{expectedRevision:number;approxBytes:number};
type HistoryState={
  undoStack:StoredHistoryEntry[];
  redoStack:StoredHistoryEntry[];
  push:(entry:HistoryEntry)=>void;
  takeUndo:(projectId:string,currentRevision:number)=>HistoryEntry|undefined;
  takeRedo:(projectId:string,currentRevision:number)=>HistoryEntry|undefined;
  rollbackUndo:(projectId:string,entry:HistoryEntry,currentRevision:number)=>void;
  rollbackRedo:(projectId:string,entry:HistoryEntry,currentRevision:number)=>void;
  clear:(projectId?:string)=>void;
};

export const MAX_HISTORY_ENTRIES=30;
export const MAX_HISTORY_BYTES=12*1024*1024;
const encoder=new TextEncoder();
const sizeOf=(entry:HistoryEntry)=>encoder.encode(JSON.stringify(entry)).byteLength;
const prune=(entries:StoredHistoryEntry[])=>{
  let kept=entries.slice(-MAX_HISTORY_ENTRIES);
  let bytes=kept.reduce((sum,entry)=>sum+entry.approxBytes,0);
  while(kept.length>1&&bytes>MAX_HISTORY_BYTES){bytes-=kept[0]!.approxBytes;kept=kept.slice(1);}
  if(kept.length===1&&kept[0]!.approxBytes>MAX_HISTORY_BYTES)return[];
  return kept;
};
const latestProjectIndex=(stack:StoredHistoryEntry[],projectId:string)=>{
  for(let index=stack.length-1;index>=0;index--)if(stack[index]!.projectId===projectId)return index;
  return-1;
};
const withoutProject=(stack:StoredHistoryEntry[],projectId:string)=>stack.filter(entry=>entry.projectId!==projectId);
const publicEntry=(entry:StoredHistoryEntry):HistoryEntry=>({projectId:entry.projectId,label:entry.label,before:entry.before,after:entry.after});

export const useHistoryStore=create<HistoryState>((set,get)=>({
  undoStack:[],
  redoStack:[],
  push:(entry)=>{
    const detached=structuredClone(entry) as HistoryEntry;
    const stored:StoredHistoryEntry={...detached,expectedRevision:detached.after.project.revision,approxBytes:sizeOf(detached)};
    set(state=>({undoStack:prune([...state.undoStack,stored]),redoStack:[]}));
  },
  takeUndo:(projectId,currentRevision)=>{
    const state=get();const index=latestProjectIndex(state.undoStack,projectId);if(index<0)return undefined;
    const stored=state.undoStack[index]!;
    if(stored.expectedRevision!==currentRevision){set({undoStack:withoutProject(state.undoStack,projectId),redoStack:withoutProject(state.redoStack,projectId)});return undefined;}
    const moved:StoredHistoryEntry={...stored,expectedRevision:currentRevision+1};
    set({undoStack:state.undoStack.filter((_,i)=>i!==index),redoStack:prune([...state.redoStack,moved])});
    return publicEntry(stored);
  },
  takeRedo:(projectId,currentRevision)=>{
    const state=get();const index=latestProjectIndex(state.redoStack,projectId);if(index<0)return undefined;
    const stored=state.redoStack[index]!;
    if(stored.expectedRevision!==currentRevision){set({undoStack:withoutProject(state.undoStack,projectId),redoStack:withoutProject(state.redoStack,projectId)});return undefined;}
    const moved:StoredHistoryEntry={...stored,expectedRevision:currentRevision+1};
    set({redoStack:state.redoStack.filter((_,i)=>i!==index),undoStack:prune([...state.undoStack,moved])});
    return publicEntry(stored);
  },
  rollbackUndo:(projectId,entry,currentRevision)=>{
    const state=get();const index=state.redoStack.findLastIndex(item=>item.projectId===projectId&&item.before===entry.before&&item.after===entry.after);
    if(index<0)return;
    const stored=state.redoStack[index]!;
    set({redoStack:state.redoStack.filter((_,i)=>i!==index),undoStack:prune([...state.undoStack,{...stored,expectedRevision:currentRevision}])});
  },
  rollbackRedo:(projectId,entry,currentRevision)=>{
    const state=get();const index=state.undoStack.findLastIndex(item=>item.projectId===projectId&&item.before===entry.before&&item.after===entry.after);
    if(index<0)return;
    const stored=state.undoStack[index]!;
    set({undoStack:state.undoStack.filter((_,i)=>i!==index),redoStack:prune([...state.redoStack,{...stored,expectedRevision:currentRevision}])});
  },
  clear:(projectId)=>set(state=>projectId?{undoStack:withoutProject(state.undoStack,projectId),redoStack:withoutProject(state.redoStack,projectId)}:{undoStack:[],redoStack:[]}),
}));
