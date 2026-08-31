import {create} from "zustand";
import type {ContextSelectionTarget} from "@/lib/ai/context-selection";

export type ScriptSelectionRange={startWordId:string;endWordId:string};

type SelectionState={
  selectedClipIds:string[];
  selectedClipId:string|null;
  selectedSceneId:string|null;
  selectedScriptRange:ScriptSelectionRange|null;
  selectedContextTarget:ContextSelectionTarget|null;
  contextSelectionMode:boolean;
  contextSelectionVersion:number;
  selectClip:(clipId:string|null)=>void;
  selectClips:(clipIds:string[])=>void;
  toggleClip:(clipId:string)=>void;
  selectScene:(sceneId:string|null)=>void;
  selectScriptRange:(range:ScriptSelectionRange|null)=>void;
  selectContextTarget:(target:ContextSelectionTarget|null)=>void;
  setContextSelectionMode:(active:boolean)=>void;
  toggleContextSelectionMode:()=>void;
  clearSelection:()=>void;
};

const unique=(ids:string[])=>[...new Set(ids.filter(Boolean))];
const clipTarget=(clipId:string):ContextSelectionTarget=>({kind:"clip",label:`Clip ${clipId}`,target:{clipId}});
const sceneTarget=(sceneId:string):ContextSelectionTarget=>({kind:"scene",label:`Scene ${sceneId}`,target:{sceneId}});
const scriptTarget=(range:ScriptSelectionRange):ContextSelectionTarget=>({kind:"transcript-range",label:"Transcript selection",target:range});

export const useSelectionStore=create<SelectionState>((set)=>({
  selectedClipIds:[],
  selectedClipId:null,
  selectedSceneId:null,
  selectedScriptRange:null,
  selectedContextTarget:null,
  contextSelectionMode:false,
  contextSelectionVersion:0,
  selectClip:(clipId)=>set(state=>({
    selectedClipIds:clipId?[clipId]:[],
    selectedClipId:clipId,
    selectedSceneId:state.selectedSceneId,
    selectedScriptRange:null,
    selectedContextTarget:clipId?clipTarget(clipId):null,
    contextSelectionVersion:state.contextSelectionVersion+1,
  })),
  selectClips:(clipIds)=>set(state=>{
    const ids=unique(clipIds);
    return{
      selectedClipIds:ids,
      selectedClipId:ids[0]??null,
      selectedSceneId:state.selectedSceneId,
      selectedScriptRange:null,
      selectedContextTarget:ids[0]?clipTarget(ids[0]):null,
      contextSelectionVersion:state.contextSelectionVersion+1,
    };
  }),
  toggleClip:(clipId)=>set((state)=>{
    const exists=state.selectedClipIds.includes(clipId);
    const ids=exists?state.selectedClipIds.filter(id=>id!==clipId):unique([...state.selectedClipIds,clipId]);
    return{
      selectedClipIds:ids,
      selectedClipId:ids[0]??null,
      selectedSceneId:state.selectedSceneId,
      selectedScriptRange:null,
      selectedContextTarget:ids[0]?clipTarget(ids[0]):null,
      contextSelectionVersion:state.contextSelectionVersion+1,
    };
  }),
  selectScene:(sceneId)=>set(state=>{
    const sameScene=sceneId!==null&&sceneId===state.selectedSceneId;
    return{
      selectedClipIds:sameScene?state.selectedClipIds:[],
      selectedClipId:sameScene?state.selectedClipId:null,
      selectedSceneId:sceneId,
      selectedScriptRange:null,
      selectedContextTarget:sceneId?sceneTarget(sceneId):null,
      contextSelectionVersion:state.contextSelectionVersion+1,
    };
  }),
  selectScriptRange:(range)=>set(state=>({
    selectedClipIds:[],
    selectedClipId:null,
    selectedSceneId:null,
    selectedScriptRange:range,
    selectedContextTarget:range?scriptTarget(range):null,
    contextSelectionVersion:state.contextSelectionVersion+1,
  })),
  selectContextTarget:(target)=>set(state=>({selectedContextTarget:target,contextSelectionVersion:state.contextSelectionVersion+1})),
  setContextSelectionMode:(active)=>set({contextSelectionMode:active}),
  toggleContextSelectionMode:()=>set(state=>({contextSelectionMode:!state.contextSelectionMode})),
  clearSelection:()=>set(state=>({
    selectedClipIds:[],
    selectedClipId:null,
    selectedSceneId:null,
    selectedScriptRange:null,
    selectedContextTarget:null,
    contextSelectionVersion:state.contextSelectionVersion+1,
  })),
}));
