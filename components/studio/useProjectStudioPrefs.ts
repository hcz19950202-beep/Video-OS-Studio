"use client";

import {useEffect,useMemo,useState} from "react";
import {DEFAULT_SAFE_AREA_PROFILE,normalizeSafeArea,safeAreaProfileById,type SafeAreaInsets,type SafeAreaProfileId} from "@/lib/canvas/safe-area";

export type ProjectStudioPrefs={safeAreaProfileId:SafeAreaProfileId;customSafeArea:SafeAreaInsets};
const defaults:ProjectStudioPrefs={safeAreaProfileId:DEFAULT_SAFE_AREA_PROFILE.id,customSafeArea:{...DEFAULT_SAFE_AREA_PROFILE.insets}};
const keyFor=(projectId:string)=>`video-os:project-studio-prefs:${projectId}`;

export const useProjectStudioPrefs=(projectId:string)=>{
  const[prefs,setPrefs]=useState<ProjectStudioPrefs>(defaults);
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(keyFor(projectId));
      if(!raw){setPrefs(defaults);return;}
      const parsed=JSON.parse(raw) as Partial<ProjectStudioPrefs>;
      const id=(parsed.safeAreaProfileId??defaults.safeAreaProfileId) as SafeAreaProfileId;
      const custom=normalizeSafeArea(parsed.customSafeArea??defaults.customSafeArea);
      setPrefs({safeAreaProfileId:id,customSafeArea:custom});
    }catch{setPrefs(defaults);}
  },[projectId]);
  const persist=(next:ProjectStudioPrefs)=>{setPrefs(next);try{window.localStorage.setItem(keyFor(projectId),JSON.stringify(next));}catch{/* preference persistence is best-effort */}};
  const setSafeAreaProfileId=(safeAreaProfileId:SafeAreaProfileId)=>persist({...prefs,safeAreaProfileId});
  const setCustomSafeArea=(customSafeArea:SafeAreaInsets)=>persist({...prefs,customSafeArea:normalizeSafeArea(customSafeArea)});
  const safeArea=useMemo(()=>safeAreaProfileById(prefs.safeAreaProfileId,prefs.customSafeArea),[prefs.customSafeArea,prefs.safeAreaProfileId]);
  return{prefs,safeArea,setSafeAreaProfileId,setCustomSafeArea};
};
