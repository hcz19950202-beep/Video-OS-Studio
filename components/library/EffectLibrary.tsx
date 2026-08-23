"use client";

import {useMemo,useState} from "react";
import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";
import {EFFECT_REGISTRY} from "@/shared/effects/registry";
import {evaluateEffectCompatibility} from "@/shared/effects/capabilities";
import {usePlayerStore} from "@/store/player-store";
import {VideoUsePanel} from "@/components/video-use/VideoUsePanel";
import {VisualPlannerPanel} from "@/components/planner/VisualPlannerPanel";
import {AssetLibraryPanel} from "@/components/assets/AssetLibraryPanel";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {translateEffectName} from "@/lib/i18n/studio";
import {HyperFramesLibrary} from "./HyperFramesLibrary";

type LibraryMode="sidebar"|"catalog";

export const EffectLibrary=({project,onCommand,onProjectChange,mode="sidebar"}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>;onProjectChange:(project:Project)=>void;mode?:LibraryMode})=>{
  const{locale,t}=useStudioPreferences();
  const[query,setQuery]=useState("");
  const[category,setCategory]=useState("all");
  const categories=useMemo(()=>["all",...new Set(EFFECT_REGISTRY.map(effect=>effect.category))],[]);
  const filtered=useMemo(()=>EFFECT_REGISTRY.filter(effect=>{
    const q=query.trim().toLowerCase();
    const categoryMatch=category==="all"||effect.category===category;
    const textMatch=!q||`${effect.name} ${effect.id} ${effect.category} ${translateEffectName(locale,effect.id,effect.name)}`.toLowerCase().includes(q);
    return categoryMatch&&textMatch;
  }),[category,locale,query]);

  const categoryLabel=(value:string)=>{
    const key=`library.category.${value}` as const;
    const known=["number","text","data","brand","utility","process","map"];
    return value==="all"?t("library.all"):known.includes(value)?t(key as "library.category.number"):value;
  };

  const addEffect=(effect:typeof EFFECT_REGISTRY[number],clipId:string)=>{
    const compatibility=evaluateEffectCompatibility(effect.id,project.canvas.width,project.canvas.height);
    if(compatibility.status==="unsupported"){window.alert(compatibility.message);return;}
    const frame=usePlayerStore.getState().currentFrame;
    const duration=Math.min(effect.defaultDurationInFrames,Math.max(1,project.canvas.durationInFrames-frame));
    void onCommand({type:"add-clip",trackId:"motion-main",clip:{id:clipId,type:"motion",engine:"remotion",effectId:effect.id,props:effect.defaults,startFrame:frame,durationInFrames:duration,enabled:true,layer:10}},`${translateEffectName(locale,effect.id,effect.name)} · ${t("status.effectAdded")}`);
  };

  return <div className={`effect-library effect-library-${mode}`}>
    <div className="effect-library-head"><div><small>{t("library.remotion")}</small><h2>{t("library.title")}</h2></div><span>{filtered.length}</span></div>
    <div className="effect-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("library.search")}/></div>
    <div className="effect-filters">{categories.map(value=><button key={value} className={category===value?"active":""} onClick={()=>setCategory(value)}>{categoryLabel(value)}</button>)}</div>
    <div className={`effect-list ${mode==="catalog"?"catalog-grid":""}`}>{filtered.length?filtered.map(effect=>{const compatibility=evaluateEffectCompatibility(effect.id,project.canvas.width,project.canvas.height);return <button className={`effect-card compatibility-${compatibility.status}`} key={effect.id} onClick={()=>{const clipId=`motion-${effect.id}-${window.crypto.randomUUID()}`;addEffect(effect,clipId);}} title={compatibility.message} disabled={compatibility.status==="unsupported"}><div className="effect-thumb"><img alt="" src={effect.thumbnail}/><span>＋</span></div><span><strong>{translateEffectName(locale,effect.id,effect.name)}</strong><small>{categoryLabel(effect.category)} · {effect.defaultDurationInFrames}f</small><small>{effect.capability.layoutMode.toUpperCase()} · {compatibility.status.toUpperCase()} · {compatibility.family}</small></span></button>}):<p className="effect-empty">{t("library.empty")}</p>}</div>
    <HyperFramesLibrary project={project} onProjectChange={onProjectChange} mode={mode}/>
    {mode==="sidebar"?<div className="studio-tool-stack"><VideoUsePanel project={project} onProjectChange={onProjectChange}/><VisualPlannerPanel project={project} onProjectChange={onProjectChange}/><AssetLibraryPanel project={project} onProjectChange={onProjectChange}/></div>:null}
  </div>;
};
