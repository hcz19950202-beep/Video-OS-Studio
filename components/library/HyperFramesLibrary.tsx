"use client";

import {useState} from "react";
import type {Project} from "@/schemas/project";
import {HYPERFRAMES_EFFECTS} from "@/shared/hyperframes/registry";
import {usePlayerStore} from "@/store/player-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {translateEffectName} from "@/lib/i18n/studio";

type LibraryMode="sidebar"|"catalog";

export const HyperFramesLibrary=({project,onProjectChange,mode="sidebar"}:{project:Project;onProjectChange:(project:Project)=>void;mode?:LibraryMode})=>{
  const frame=usePlayerStore(state=>state.currentFrame);
  const{locale,t}=useStudioPreferences();
  const[busy,setBusy]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);

  const add=async(effect:typeof HYPERFRAMES_EFFECTS[number])=>{
    setBusy(effect.id);setError(null);
    try{
      const duration=Math.min(effect.defaultDurationInFrames,Math.max(1,project.canvas.durationInFrames-frame));
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/hyperframes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({effectId:effect.id,props:effect.defaults,startFrame:frame,durationInFrames:duration})});
      const data=await response.json() as {project?:Project;error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||"HyperFrames render failed");
      onProjectChange(data.project);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(null);}
  };

  return <div className={`hyperframes-library hyperframes-${mode}`}>
    <div className="effect-library-head compact"><div><small>{t("library.hyperframes")}</small><h2>{t("library.transparent")}</h2></div><span>HF</span></div>
    <div className={`effect-list ${mode==="catalog"?"catalog-grid":""}`}>{HYPERFRAMES_EFFECTS.map(effect=><button className="effect-card" key={effect.id} disabled={Boolean(busy)} onClick={()=>void add(effect)}><div className="effect-thumb"><img alt="" src={effect.thumbnail}/><span>{busy===effect.id?"…":"＋"}</span></div><span><strong>{busy===effect.id?t("library.rendering"):translateEffectName(locale,effect.id,effect.name)}</strong><small>{effect.category} · {t("library.transparent")}</small></span></button>)}</div>
    {error?<p className="render-error">{error}</p>:null}
  </div>;
};
