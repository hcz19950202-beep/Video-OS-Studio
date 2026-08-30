"use client";

import {useState} from "react";
import {createOperationId,parseProjectResponse,publishProjectIfActive} from "@/lib/client/project-mutations";
import type {AssetPreset,AssetRegistry} from "@/lib/assets/schema";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useProjectStore} from "@/store/project-store";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const AssetLibraryPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{t}=useStudioPreferences();
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const[presets,setPresets]=useState<AssetPreset[]>([]);
  const[name,setName]=useState(t("assets.defaultName"));
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const refresh=async()=>{const response=await fetch("/api/presets",{cache:"no-store"});const data=await response.json() as AssetRegistry&{error?:string};if(!response.ok)throw new Error(data.error||"Unable to load preset library");setPresets(data.presets);};
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError(null);try{await action();}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const saveSelected=()=>run(async()=>{if(!selectedClipId)throw new Error("Select a Motion clip first.");const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/presets`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clipId:selectedClipId,name})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Unable to save preset");await refresh();});
  const patch=(preset:AssetPreset,update:{favorite?:boolean;status?:"draft"|"production-ready"})=>run(async()=>{const response=await fetch(`/api/presets/${encodeURIComponent(preset.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(update)});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Unable to update preset");await refresh();});
  const apply=(preset:AssetPreset)=>run(async()=>{const projectId=project.project.id;const frame=usePlayerStore.getState().currentFrame;const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/presets/${encodeURIComponent(preset.id)}/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedRevision:project.project.revision,operationId:createOperationId("preset"),startFrame:frame})});const data=await parseProjectResponse<{project:Project}>(response);publishProjectIfActive(projectId,data.project,()=>useProjectStore.getState().project,onProjectChange);});

  return <details className="studio-tool-panel" open><summary><span><small>LIBRARY</small><strong>{t("assets.title")}</strong></span><em>⌄</em></summary><div className="studio-tool-body"><div className="preset-save"><input value={name} onChange={event=>setName(event.target.value)}/><button className="button small" disabled={busy||!selectedClipId||!name.trim()} onClick={()=>void saveSelected()}>{t("assets.saveSelected")}</button></div><button className="text-button tool-refresh" disabled={busy} onClick={()=>void run(refresh)}>{t("assets.refresh")}</button><div className="preset-list">{presets.map(preset=><div className="preset-card" key={preset.id}><div><strong>{preset.favorite?"★ ":""}{preset.name}</strong><small>{preset.engine} · {preset.effectId}</small><em>{preset.status}</em></div><div><button onClick={()=>void apply(preset)}>{t("assets.use")}</button><button onClick={()=>void patch(preset,{favorite:!preset.favorite})}>{preset.favorite?t("assets.unstar"):t("assets.star")}</button><button disabled={preset.status==="production-ready"} onClick={()=>void patch(preset,{status:"production-ready"})}>{t("assets.promote")}</button></div></div>)}</div><p className="hint">{t("assets.hint")}</p>{error?<p className="render-error">{error}</p>:null}</div></details>;
};
