"use client";

import {createContext,useContext,useLayoutEffect,useMemo,useSyncExternalStore} from "react";
import {translateStudio,type StudioLocale,type StudioMessageKey,type StudioTheme} from "@/lib/i18n/studio";

type StudioPreferencesValue={
  locale:StudioLocale;
  theme:StudioTheme;
  timelineHeight:number;
  setLocale:(locale:StudioLocale)=>void;
  toggleLocale:()=>void;
  setTheme:(theme:StudioTheme)=>void;
  toggleTheme:()=>void;
  setTimelineHeight:(height:number)=>void;
  t:(key:StudioMessageKey,variables?:Record<string,string|number>)=>string;
};

const StudioPreferencesContext=createContext<StudioPreferencesValue|null>(null);
const LOCALE_KEY="video-os-studio-locale";
const THEME_KEY="video-os-studio-theme";
const TIMELINE_HEIGHT_KEY="video-os-studio-timeline-height";
const PREFERENCES_EVENT="video-os-studio-preferences";
const DEFAULT_TIMELINE_HEIGHT=235;

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

const readTimelineHeight=()=>{
  if(typeof window==="undefined")return DEFAULT_TIMELINE_HEIGHT;
  const parsed=Number(window.localStorage.getItem(TIMELINE_HEIGHT_KEY));
  return Number.isFinite(parsed)?Math.max(180,Math.min(520,parsed)):DEFAULT_TIMELINE_HEIGHT;
};

const getServerLocale=():StudioLocale=>"zh-CN";
const getServerTheme=():StudioTheme=>"dark";
const getServerTimelineHeight=()=>DEFAULT_TIMELINE_HEIGHT;

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

export const StudioPreferencesProvider=({children}:{children:React.ReactNode})=>{
  const locale=useSyncExternalStore(subscribePreferences,readLocale,getServerLocale);
  const theme=useSyncExternalStore(subscribePreferences,readTheme,getServerTheme);
  const timelineHeight=useSyncExternalStore(subscribePreferences,readTimelineHeight,getServerTimelineHeight);

  useLayoutEffect(()=>{
    document.documentElement.dataset.studioTheme=theme;
    document.documentElement.lang=locale;
  },[locale,theme]);

  const value=useMemo<StudioPreferencesValue>(()=>({
    locale,
    theme,
    timelineHeight,
    setLocale:next=>persistPreference(LOCALE_KEY,next),
    toggleLocale:()=>persistPreference(LOCALE_KEY,locale==="zh-CN"?"en-US":"zh-CN"),
    setTheme:next=>persistPreference(THEME_KEY,next),
    toggleTheme:()=>persistPreference(THEME_KEY,theme==="dark"?"light":"dark"),
    setTimelineHeight:height=>persistPreference(TIMELINE_HEIGHT_KEY,String(Math.round(Math.max(180,Math.min(520,height))))),
    t:(key,variables)=>translateStudio(locale,key,variables),
  }),[locale,theme,timelineHeight]);

  return <StudioPreferencesContext.Provider value={value}>{children}</StudioPreferencesContext.Provider>;
};

export const useStudioPreferences=()=>{
  const value=useContext(StudioPreferencesContext);
  if(!value)throw new Error("useStudioPreferences must be used inside StudioPreferencesProvider");
  return value;
};
