"use client";

import {useState} from "react";
import type {AssetPreset,AssetRegistry} from "@/lib/assets/schema";
import type {ProjectCommand} from "@/lib/project/commands";
import type {MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type Props={
  project:Project;
  clipId:string;
  effectId:string;
  engine:"remotion"|"hyperframes";
  onCommand:(command:ProjectCommand,message:string)=>Promise<void>;
};

export const EffectPresetControls=({project,clipId,effectId,engine,onCommand}:Props)=>{
  const{t}=useStudioPreferences();
  const[presets,setPresets]=useState<AssetPreset[]>([]);
  const[selectedPresetId,setSelectedPresetId]=useState("");
  const[name,setName]=useState("");
  const[busy,setBusy]=useState(false);
  const[loaded,setLoaded]=useState(false);
  const[error,setError]=useState<string|null>(null);

  const refresh=async()=>{
    setBusy(true);setError(null);
    try{
      const response=await fetch("/api/presets",{cache:"no-store"});
      const data=await response.json() as AssetRegistry&{error?:string};
      if(!response.ok)throw new Error(data.error||"Unable to load presets");
      const matching=data.presets.filter(preset=>preset.engine===engine&&preset.effectId===effectId);
      setPresets(matching);
      setLoaded(true);
      if(!selectedPresetId&&matching[0])setSelectedPresetId(matching[0].id);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const saveCurrent=async()=>{
    const presetName=name.trim();
    if(!presetName)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/presets`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clipId,name:presetName})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||"Unable to save preset");
      setName("");
      await refresh();
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));setBusy(false);}
  };

  const applySelected=async()=>{
    const preset=presets.find(item=>item.id===selectedPresetId);
    if(!preset||preset.engine!=="remotion")return;
    setBusy(true);setError(null);
    try{
      await onCommand({type:"update-motion-props",clipId,props:preset.props},t("preset.applied"));
      if(preset.transform)await onCommand({type:"update-motion-transform",clipId,transform:preset.transform as MotionTransform},t("preset.applied"));
      await onCommand({type:"update-clip-timing",clipId,durationInFrames:Math.min(preset.durationInFrames,project.canvas.durationInFrames)},t("preset.applied"));
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  return <section className="inspector-section inspector-preset-section">
    <div className="inspector-section-title"><strong>{t("preset.title")}</strong><small>PRESET</small></div>
    {!loaded?<button className="preset-load-button" disabled={busy} onClick={()=>void refresh()}>{t("preset.load")}</button>:<>
      <select className="preset-select" value={selectedPresetId} onChange={event=>setSelectedPresetId(event.target.value)}>
        <option value="">{t("preset.none")}</option>
        {presets.map(preset=><option key={preset.id} value={preset.id}>{preset.favorite?"★ ":""}{preset.name}</option>)}
      </select>
      <button className="preset-apply-button" disabled={busy||!selectedPresetId||engine!=="remotion"} onClick={()=>void applySelected()}>{t("preset.apply")}</button>
    </>}
    <div className="preset-save-row"><input value={name} onChange={event=>setName(event.target.value)} placeholder={t("preset.namePlaceholder")}/><button disabled={busy||!name.trim()} onClick={()=>void saveCurrent()}>{t("preset.saveCurrent")}</button></div>
    {error?<p className="render-error">{error}</p>:null}
  </section>;
};
