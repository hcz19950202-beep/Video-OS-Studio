"use client";

import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {translateStudio,type StudioLocale,type StudioMessageKey,type StudioTheme} from "@/lib/i18n/studio";

type StudioPreferencesValue={
  locale:StudioLocale;
  theme:StudioTheme;
  setLocale:(locale:StudioLocale)=>void;
  toggleLocale:()=>void;
  setTheme:(theme:StudioTheme)=>void;
  toggleTheme:()=>void;
  t:(key:StudioMessageKey,variables?:Record<string,string|number>)=>string;
};

const StudioPreferencesContext=createContext<StudioPreferencesValue|null>(null);
const LOCALE_KEY="video-os-studio-locale";
const THEME_KEY="video-os-studio-theme";

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

export const StudioPreferencesProvider=({children}:{children:React.ReactNode})=>{
  const[locale,setLocaleState]=useState<StudioLocale>(readLocale);
  const[theme,setThemeState]=useState<StudioTheme>(readTheme);

  useEffect(()=>{
    document.documentElement.dataset.studioTheme=theme;
    document.documentElement.lang=locale;
    window.localStorage.setItem(LOCALE_KEY,locale);
    window.localStorage.setItem(THEME_KEY,theme);
  },[locale,theme]);

  const value=useMemo<StudioPreferencesValue>(()=>({
    locale,
    theme,
    setLocale:(next)=>setLocaleState(next),
    toggleLocale:()=>setLocaleState(current=>current==="zh-CN"?"en-US":"zh-CN"),
    setTheme:(next)=>setThemeState(next),
    toggleTheme:()=>setThemeState(current=>current==="dark"?"light":"dark"),
    t:(key,variables)=>translateStudio(locale,key,variables)
  }),[locale,theme]);

  return <StudioPreferencesContext.Provider value={value}>{children}</StudioPreferencesContext.Provider>;
};

export const useStudioPreferences=()=>{
  const value=useContext(StudioPreferencesContext);
  if(!value)throw new Error("useStudioPreferences must be used inside StudioPreferencesProvider");
  return value;
};
