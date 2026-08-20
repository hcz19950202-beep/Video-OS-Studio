"use client";

import {Player,type PlayerRef} from "@remotion/player";
import {useEffect,useMemo,useRef,useState} from "react";
import {MasterComposition} from "@/remotion/MasterComposition";
import type {Project} from "@/schemas/project";
import {clampFrame} from "@/lib/timeline/frames";
import {usePlayerStore} from "@/store/player-store";
import {RenderControls} from "@/components/render/RenderControls";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {formatStudioTime} from "@/lib/studio/metrics";

type FitSize={width:number;height:number};

const fitInside=(availableWidth:number,availableHeight:number,canvasWidth:number,canvasHeight:number):FitSize=>{
  const ratio=canvasWidth/canvasHeight;
  const safeWidth=Math.max(160,availableWidth-44);
  const safeHeight=Math.max(160,availableHeight-44);
  if(safeWidth/safeHeight>ratio)return{width:Math.round(safeHeight*ratio),height:Math.round(safeHeight)};
  return{width:Math.round(safeWidth),height:Math.round(safeWidth/ratio)};
};

export const StudioPreview=({project}:{project:Project})=>{
  const{t}=useStudioPreferences();
  const playerRef=useRef<PlayerRef>(null);
  const viewportRef=useRef<HTMLDivElement>(null);
  const currentFrame=usePlayerStore(state=>state.currentFrame);
  const setCurrentFrame=usePlayerStore(state=>state.setCurrentFrame);
  const seekFrame=usePlayerStore(state=>state.seekFrame);
  const seekVersion=usePlayerStore(state=>state.seekVersion);
  const[zoom,setZoom]=useState<"fit"|"100">("fit");
  const[showSafeZone,setShowSafeZone]=useState(false);
  const[fitSize,setFitSize]=useState<FitSize|null>(null);

  useEffect(()=>{
    const timer=window.setInterval(()=>setCurrentFrame(playerRef.current?.getCurrentFrame()??0),100);
    return()=>window.clearInterval(timer);
  },[setCurrentFrame]);

  useEffect(()=>{
    if(seekVersion>0)playerRef.current?.seekTo(clampFrame(seekFrame,project.canvas.durationInFrames));
  },[project.canvas.durationInFrames,seekFrame,seekVersion]);

  useEffect(()=>{
    const viewport=viewportRef.current;
    if(!viewport)return;
    const observer=new ResizeObserver(entries=>{
      const rect=entries[0]?.contentRect;
      if(!rect)return;
      setFitSize(fitInside(rect.width,rect.height,project.canvas.width,project.canvas.height));
    });
    observer.observe(viewport);
    return()=>observer.disconnect();
  },[project.canvas.height,project.canvas.width]);

  const assetUrls=useMemo(()=>Object.fromEntries(project.assets.map(asset=>[asset.id,`/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`])),[project.assets,project.project.id]);
  const ratio=`${project.canvas.width} / ${project.canvas.height}`;
  const end=Math.max(0,project.canvas.durationInFrames-1);
  const key=`${project.project.id}-${project.canvas.durationInFrames}-${project.canvas.width}x${project.canvas.height}`;
  const fitStyle=zoom==="fit"&&fitSize?{width:`${fitSize.width}px`,height:`${fitSize.height}px`}:{width:`${project.canvas.width}px`,height:`${project.canvas.height}px`};

  return <div className="player-workspace">
    <div className="player-toolbar"><div className="time-readout"><strong>{formatStudioTime(currentFrame,project.canvas.fps)}</strong><span>/ {formatStudioTime(end,project.canvas.fps)} · {t("preview.frame")} {currentFrame}/{end}</span></div><div className="segmented compact preview-view-controls"><button className={zoom==="fit"?"active":""} onClick={()=>setZoom("fit")}>{t("preview.fit")}</button><button className={zoom==="100"?"active":""} onClick={()=>setZoom("100")}>{t("preview.actual")}</button><button className={showSafeZone?"active":""} onClick={()=>setShowSafeZone(value=>!value)}>{t("preview.safe")}</button></div></div>
    <RenderControls projectId={project.project.id}/>
    <div ref={viewportRef} className={`player-scroll ${zoom==="100"?"native-size":""}`}>
      <div className="stage-matte" style={zoom==="fit"&&fitSize?{width:`${fitSize.width+36}px`,height:`${fitSize.height+36}px`}:undefined}>
        <div className="stage-corner top-left"/><div className="stage-corner top-right"/><div className="stage-corner bottom-left"/><div className="stage-corner bottom-right"/>
        <div className="player-shell" style={{aspectRatio:ratio,...fitStyle}}><Player key={key} ref={playerRef} component={MasterComposition} inputProps={{project,assetUrls,renderMode:"preview"}} durationInFrames={project.canvas.durationInFrames} compositionWidth={project.canvas.width} compositionHeight={project.canvas.height} fps={project.canvas.fps} controls style={{width:"100%",height:"100%"}}/>{showSafeZone?<div className="safe-zone" aria-hidden="true"><div/></div>:null}</div>
      </div>
    </div>
  </div>;
};
