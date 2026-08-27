import {create} from "zustand";

export type ScriptSelectionRange={startWordId:string;endWordId:string};

type SelectionState={
  selectedClipIds:string[];
  selectedClipId:string|null;
  selectedSceneId:string|null;
  selectedScriptRange:ScriptSelectionRange|null;
  selectClip:(clipId:string|null)=>void;
  selectClips:(clipIds:string[])=>void;
  toggleClip:(clipId:string)=>void;
  selectScene:(sceneId:string|null)=>void;
  selectScriptRange:(range:ScriptSelectionRange|null)=>void;
  clearSelection:()=>void;
};

const unique=(ids:string[])=>[...new Set(ids.filter(Boolean))];

export const useSelectionStore=create<SelectionState>((set)=>({
  selectedClipIds:[],
  selectedClipId:null,
  selectedSceneId:null,
  selectedScriptRange:null,
  selectClip:(clipId)=>set(state=>({selectedClipIds:clipId?[clipId]:[],selectedClipId:clipId,selectedSceneId:state.selectedSceneId,selectedScriptRange:null})),
  selectClips:(clipIds)=>set(state=>{
    const ids=unique(clipIds);
    return{selectedClipIds:ids,selectedClipId:ids[0]??null,selectedSceneId:state.selectedSceneId,selectedScriptRange:null};
  }),
  toggleClip:(clipId)=>set((state)=>{
    const exists=state.selectedClipIds.includes(clipId);
    const ids=exists?state.selectedClipIds.filter(id=>id!==clipId):unique([...state.selectedClipIds,clipId]);
    return{selectedClipIds:ids,selectedClipId:ids[0]??null,selectedSceneId:state.selectedSceneId,selectedScriptRange:null};
  }),
  selectScene:(sceneId)=>set(state=>{
    const sameScene=sceneId!==null&&sceneId===state.selectedSceneId;
    return{
      selectedClipIds:sameScene?state.selectedClipIds:[],
      selectedClipId:sameScene?state.selectedClipId:null,
      selectedSceneId:sceneId,
      selectedScriptRange:null,
    };
  }),
  selectScriptRange:(range)=>set({selectedClipIds:[],selectedClipId:null,selectedSceneId:null,selectedScriptRange:range}),
  clearSelection:()=>set({selectedClipIds:[],selectedClipId:null,selectedSceneId:null,selectedScriptRange:null}),
}));
