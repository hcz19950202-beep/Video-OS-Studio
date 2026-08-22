"use client";

import {createContext,useContext,useLayoutEffect,useMemo,useSyncExternalStore} from "react";
import {translateStudio,type StudioLocale,type StudioMessageKey,type StudioTheme} from "@/lib/i18n/studio";
import {normalizeWorkspaceLayout,patchWorkspaceLayout,workspacePresetLayout,type StudioWorkspaceLayout,type StudioWorkspacePreset} from "@/lib/studio/workspace-layout";

type StudioPreferencesValue={
  locale:StudioLocale;
  theme:StudioTheme;
  timelineHeight:number;
  workspaceLayout:StudioWorkspaceLayout;
  setLocale:(locale:StudioLocale)=>void;
  toggleLocale:()=>void;
  setTheme:(theme:StudioTheme)=>void;
  toggleTheme:()=>void;
  setTimelineHeight:(height:number)=>void;
  setWorkspacePreset:(preset:StudioWorkspacePreset)=>void;
  updateWorkspaceLayout:(patch:Partial<StudioWorkspaceLayout>)=>void;
  resetWorkspaceLayout:()=>void;
  t:(key:StudioMessageKey,variables?:Record<string,string|number>)=>string;
};

const StudioPreferencesContext=createContext<StudioPreferencesValue|null>(null);
const LOCALE_KEY="video-os-studio-locale";
const THEME_KEY="video-os-studio-theme";
const LEGACY_TIMELINE_HEIGHT_KEY="video-os-studio-timeline-height";
const WORKSPACE_LAYOUT_KEY="video-os-studio-workspace-layout-v21";
const PREFERENCES_EVENT="video-os-studio-preferences";

const readLocale=():StudioLocale=>{
  if(typeof window==="undefined")return"zh-CN";
  const value=window.localStorage.getItem(LOCALE_KEY);
  return value==="en-US"||value==="zh-CN"?value:"zh-CN";
};

const readTheme=():StudioTheme=>{
  if(typeof window==="undefined")return"dark";
  const value=window.localStorage.getItem(THEME_KEY);
  return value==="light"||value==="dark"?value:"dark";
};

const readWorkspaceLayout=():StudioWorkspaceLayout=>{
  if(typeof window==="undefined")return workspacePresetLayout("edit");
  const raw=window.localStorage.getItem(WORKSPACE_LAYOUT_KEY);
  if(raw){
    try{return normalizeWorkspaceLayout(JSON.parse(raw) as Partial<StudioWorkspaceLayout>);}catch{/* fall through */}
  }
  const legacyTimeline=Number(window.localStorage.getItem(LEGACY_TIMELINE_HEIGHT_KEY));
  return normalizeWorkspaceLayout(Number.isFinite(legacyTimeline)&&legacyTimeline>0?{timelineHeight:legacyTimeline}:undefined);
};

const getServerLocale=():StudioLocale=>"zh-CN";
const getServerTheme=():StudioTheme=>"dark";
const getServerWorkspaceLayout=()=>workspacePresetLayout("edit");

const subscribePreferences=(notify:()=>void)=>{
  window.addEventListener("storage",notify);
  window.addEventListener(PREFERENCES_EVENT,notify);
  return()=>{
    window.removeEventListener("storage",notify);
    window.removeEventListener(PREFERENCES_EVENT,notify);
  };
};

const persistPreference=(key:string,value:string)=>{
  window.localStorage.setItem(key,value);
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
};

const persistWorkspaceLayout=(layout:StudioWorkspaceLayout)=>persistPreference(WORKSPACE_LAYOUT_KEY,JSON.stringify(normalizeWorkspaceLayout(layout)));

export const StudioPreferencesProvider=({children}:{children:React.ReactNode})=>{
  const locale=useSyncExternalStore(subscribePreferences,readLocale,getServerLocale);
  const theme=useSyncExternalStore(subscribePreferences,readTheme,getServerTheme);
  const workspaceLayout=useSyncExternalStore(subscribePreferences,readWorkspaceLayout,getServerWorkspaceLayout);

  useLayoutEffect(()=>{
    document.documentElement.dataset.studioTheme=theme;
    document.documentElement.lang=locale;
  },[locale,theme]);

  const value=useMemo<StudioPreferencesValue>(()=>({
    locale,
    theme,
    timelineHeight:workspaceLayout.timelineHeight,
    workspaceLayout,
    setLocale:next=>persistPreference(LOCALE_KEY,next),
    toggleLocale:()=>persistPreference(LOCALE_KEY,locale==="zh-CN"?"en-US":"zh-CN"),
    setTheme:next=>persistPreference(THEME_KEY,next),
    toggleTheme:()=>persistPreference(THEME_KEY,theme==="dark"?"light":"dark"),
    setTimelineHeight:height=>persistWorkspaceLayout(patchWorkspaceLayout(workspaceLayout,{timelineHeight:height,timelineCollapsed:false})),
    setWorkspacePreset:preset=>persistWorkspaceLayout(workspacePresetLayout(preset)),
    updateWorkspaceLayout:patch=>persistWorkspaceLayout(patchWorkspaceLayout(workspaceLayout,patch)),
    resetWorkspaceLayout:()=>persistWorkspaceLayout(workspacePresetLayout(workspaceLayout.preset)),
    t:(key,variables)=>translateStudio(locale,key,variables),
  }),[locale,theme,workspaceLayout]);

  return <StudioPreferencesContext.Provider value={value}>{children}</StudioPreferencesContext.Provider>;
};

export const useStudioPreferences=()=>{
  const value=useContext(StudioPreferencesContext);
  if(!value)throw new Error("useStudioPreferences must be used inside StudioPreferencesProvider");
  return value;
};
