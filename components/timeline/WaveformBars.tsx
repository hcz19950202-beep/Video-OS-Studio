"use client";

import {useEffect,useState} from "react";
import {createWaveformCacheKey,loadCachedWaveform} from "@/lib/timeline/waveform-cache";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

const POINTS=160;
type LoadedPeaks={key:string;peaks:number[]}|null;

export const WaveformBars=({project,clip}:{project:Project;clip:Extract<Clip,{type:"video"|"audio"}>})=>{
  const[loaded,setLoaded]=useState<LoadedPeaks>(null);
  const projectId=project.project.id;
  const assetId=clip.assetId;
  const asset=project.assets.find(item=>item.id===assetId);
  const cacheKey=!asset||asset.hasAudio===false?null:createWaveformCacheKey({projectId,assetId,points:POINTS,relativePath:asset.relativePath,durationInFrames:asset.durationInFrames,hasAudio:asset.hasAudio});

  useEffect(()=>{
    if(!cacheKey)return;
    let alive=true;
    void loadCachedWaveform(cacheKey,async()=>{
      const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/waveform?points=${POINTS}`);
      if(!response.ok)throw new Error(`Waveform request failed: ${response.status}`);
      const data=(await response.json()) as {peaks?:number[]};
      return Array.isArray(data.peaks)?data.peaks:[];
    }).then(peaks=>{if(alive)setLoaded({key:cacheKey,peaks});}).catch(()=>{});
    return()=>{alive=false;};
  },[assetId,cacheKey,projectId]);

  const peaks=loaded?.key===cacheKey?loaded.peaks:[];
  if(!peaks.length)return null;
  const total=Math.max(1,asset?.durationInFrames??clip.sourceStartFrame+clip.durationInFrames);
  const from=Math.max(0,Math.floor(clip.sourceStartFrame/total*peaks.length));
  const to=Math.min(peaks.length,Math.max(from+1,Math.ceil((clip.sourceStartFrame+clip.durationInFrames)/total*peaks.length)));
  return <div className="timeline-waveform">{peaks.slice(from,to).map((peak,index)=><i key={index} style={{height:`${Math.max(8,peak*100)}%`}}/>)}</div>;
};
