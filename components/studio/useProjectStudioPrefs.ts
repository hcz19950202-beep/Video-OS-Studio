"use client";

import {useCallback,useMemo,useSyncExternalStore} from "react";
import {DEFAULT_SAFE_AREA_PROFILE,normalizeSafeArea,safeAreaProfileById,type SafeAreaInsets,type SafeAreaProfileId} from "@/lib/canvas/safe-area";

export type ProjectStudioPrefs={safeAreaProfileId:SafeAreaProfileId;customSafeArea:SafeAreaInsets};
const defaults:ProjectStudioPrefs={safeAreaProfileId:DEFAULT_SAFE_AREA_PROFILE.id,customSafeArea:{...DEFAULT_SAFE_AREA_PROFILE.insets}};
const DEFAULT_SNAPSHOT=JSON.stringify(defaults);
const CHANGE_EVENT="video-os:project-studio-prefs-change";
const keyFor=(projectId:string)=>`video-os:project-studio-prefs:${projectId}`;

const parseSnapshot=(raw:string):ProjectStudioPrefs=>{
  try{
    const parsed=JSON.parse(raw) as Partial<ProjectStudioPrefs>;
    const requested=(parsed.safeAreaProfileId??defaults.safeAreaProfileId) as SafeAreaProfileId;
    const resolved=safeAreaProfileById(requested,parsed.customSafeArea??defaults.customSafeArea);
    return{safeAreaProfileId:resolved.id,customSafeArea:normalizeSafeArea(parsed.customSafeArea??defaults.customSafeArea)};
  }catch{return defaults;}
};

export const useProjectStudioPrefs=(projectId:string)=>{
  const getSnapshot=useCallback(()=>{try{return window.localStorage.getItem(keyFor(projectId))??DEFAULT_SNAPSHOT;}catch{return DEFAULT_SNAPSHOT;}},[projectId]);
  const subscribe=useCallback((notify:()=>void)=>{
    const onStorage=(event:StorageEvent)=>{if(event.key===keyFor(projectId))notify();};
    const onChange=(event:Event)=>{const detail=(event as CustomEvent<{projectId?:string}>).detail;if(!detail?.projectId||detail.projectId===projectId)notify();};
    window.addEventListener("storage",onStorage);window.addEventListener(CHANGE_EVENT,onChange);
    return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener(CHANGE_EVENT,onChange);};
  },[projectId]);
  const snapshot=useSyncExternalStore(subscribe,getSnapshot,()=>DEFAULT_SNAPSHOT);
  const prefs=useMemo(()=>parseSnapshot(snapshot),[snapshot]);
  const persist=(next:ProjectStudioPrefs)=>{try{window.localStorage.setItem(keyFor(projectId),JSON.stringify(next));window.dispatchEvent(new CustomEvent(CHANGE_EVENT,{detail:{projectId}}));}catch{/* preference persistence is best-effort */}};
  const setSafeAreaProfileId=(safeAreaProfileId:SafeAreaProfileId)=>persist({...prefs,safeAreaProfileId});
  const setCustomSafeArea=(customSafeArea:SafeAreaInsets)=>persist({...prefs,customSafeArea:normalizeSafeArea(customSafeArea)});
  const safeArea=useMemo(()=>safeAreaProfileById(prefs.safeAreaProfileId,prefs.customSafeArea),[prefs.customSafeArea,prefs.safeAreaProfileId]);
  return{prefs,safeArea,setSafeAreaProfileId,setCustomSafeArea};
};
