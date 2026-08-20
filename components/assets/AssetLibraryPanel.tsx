"use client";
import {useState} from "react";
import type {AssetPreset,AssetRegistry} from "@/lib/assets/schema";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useSelectionStore} from "@/store/selection-store";

export const AssetLibraryPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const selectedClipId=useSelectionStore((state)=>state.selectedClipId);
  const frame=usePlayerStore((state)=>state.currentFrame);
  const[presets,setPresets]=useState<AssetPreset[]>([]);
  const[name,setName]=useState("My Preset");
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);

  const refresh=async()=>{
    const response=await fetch("/api/presets",{cache:"no-store"});
    const data=await response.json() as AssetRegistry&{error?:string};
    if(!response.ok)throw new Error(data.error||"Unable to load preset library");
    setPresets(data.presets);
  };
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError(null);try{await action();}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const saveSelected=()=>run(async()=>{if(!selectedClipId)throw new Error("Select a Motion clip first.");const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/presets`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clipId:selectedClipId,name})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Unable to save preset");await refresh();});
  const patch=(preset:AssetPreset,update:{favorite?:boolean;status?:"draft"|"production-ready"})=>run(async()=>{const response=await fetch(`/api/presets/${encodeURIComponent(preset.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(update)});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Unable to update preset");await refresh();});
  const apply=(preset:AssetPreset)=>run(async()=>{const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/presets/${encodeURIComponent(preset.id)}/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({startFrame:frame})});const data=await response.json() as {project?:Project;error?:string};if(!response.ok||!data.project)throw new Error(data.error||"Unable to apply preset");onProjectChange(data.project);});

  return <div className="asset-library-panel">
    <div className="panel-heading"><h2>My Assets</h2><button className="text-button" disabled={busy} onClick={()=>void run(refresh)}>Refresh</button></div>
    <div className="preset-save"><input value={name} onChange={(event)=>setName(event.target.value)}/><button className="button small" disabled={busy||!selectedClipId||!name.trim()} onClick={()=>void saveSelected()}>Save selected</button></div>
    <div className="preset-list">{presets.map((preset)=><div className="preset-card" key={preset.id}><div><strong>{preset.favorite?"★ ":""}{preset.name}</strong><small>{preset.engine} · {preset.effectId}</small><em>{preset.status}</em></div><div><button onClick={()=>void apply(preset)}>Use</button><button onClick={()=>void patch(preset,{favorite:!preset.favorite})}>{preset.favorite?"Unstar":"Star"}</button><button disabled={preset.status==="production-ready"} onClick={()=>void patch(preset,{status:"production-ready"})}>Promote</button></div></div>)}</div>
    <p className="hint">Presets live under VIDEO_OS_DATA_ROOT and survive code updates. Production-ready presets also get a promoted manifest for later code-library review.</p>
    {error?<p className="render-error">{error}</p>:null}
  </div>;
};
