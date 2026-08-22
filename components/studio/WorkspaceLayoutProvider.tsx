"use client";

import {createContext,useContext,useMemo,useSyncExternalStore} from "react";
import {applyWorkspacePreset,parseWorkspaceLayout,serializeWorkspaceLayout,updateWorkspaceLayout,type WorkspaceLayout,type WorkspacePreset} from "@/lib/studio/workspace-layout";

type WorkspaceLayoutContextValue={
  layout:WorkspaceLayout;
  setLayout:(patch:Partial<Omit<WorkspaceLayout,"version">>)=>void;
  setPreset:(preset:WorkspacePreset)=>void;
  toggleLeft:()=>void;
  toggleInspector:()=>void;
  resetWorkspace:()=>void;
};

const STORAGE_KEY="video-os-v2.1-workspace-layout";
const CHANGE_EVENT="video-os-v2.1-workspace-layout-change";
const Context=createContext<WorkspaceLayoutContextValue|null>(null);

const serverSnapshot=()=>serializeWorkspaceLayout(applyWorkspacePreset("edit"));
const clientSnapshot=()=>typeof window==="undefined"?serverSnapshot():window.localStorage.getItem(STORAGE_KEY)??serverSnapshot();
const subscribe=(notify:()=>void)=>{window.addEventListener("storage",notify);window.addEventListener(CHANGE_EVENT,notify);return()=>{window.removeEventListener("storage",notify);window.removeEventListener(CHANGE_EVENT,notify);};};
const persist=(layout:WorkspaceLayout)=>{window.localStorage.setItem(STORAGE_KEY,serializeWorkspaceLayout(layout));window.dispatchEvent(new Event(CHANGE_EVENT));};

export const WorkspaceLayoutProvider=({children}:{children:React.ReactNode})=>{
  const snapshot=useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);
  const layout=parseWorkspaceLayout(snapshot);
  const value=useMemo<WorkspaceLayoutContextValue>(()=>({
    layout,
    setLayout:patch=>persist(updateWorkspaceLayout(layout,patch)),
    setPreset:preset=>persist(applyWorkspacePreset(preset)),
    toggleLeft:()=>persist(updateWorkspaceLayout(layout,{leftCollapsed:!layout.leftCollapsed})),
    toggleInspector:()=>persist(updateWorkspaceLayout(layout,{inspectorCollapsed:!layout.inspectorCollapsed})),
    resetWorkspace:()=>persist(applyWorkspacePreset(layout.preset)),
  }),[layout]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useWorkspaceLayout=()=>{
  const value=useContext(Context);
  if(!value)throw new Error("useWorkspaceLayout must be used inside WorkspaceLayoutProvider");
  return value;
};
