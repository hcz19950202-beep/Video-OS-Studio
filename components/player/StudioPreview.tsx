"use client";

import {Player,type PlayerRef} from "@remotion/player";
import {useEffect,useMemo,useRef,useState} from "react";
import {MasterComposition} from "@/remotion/MasterComposition";
import type {ProjectCommand} from "@/lib/project/commands";
import {ProjectRequestError,postProjectCommand,reloadProject} from "@/lib/client/project-mutations";
import {DEFAULT_MOTION_TRANSFORM} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {clampFrame} from "@/lib/timeline/frames";
import {usePlayerStore} from "@/store/player-store";
import {useProjectStore} from "@/store/project-store";
import {useHistoryStore} from "@/store/history-store";
import {RenderControls} from "@/components/render/RenderControls";
import {CanvasOverlay,type CanvasPreviewDraft} from "@/components/canvas/CanvasOverlay";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {formatStudioTime} from "@/lib/studio/metrics";
import {SAFE_AREA_PROFILES,safeAreaCss,type SafeAreaInsets,type SafeAreaProfileId} from "@/lib/canvas/safe-area";
import {useProjectStudioPrefs} from "@/components/studio/useProjectStudioPrefs";

type FitSize={width:number;height:number};
const fitInside=(availableWidth:number,availableHeight:number,canvasWidth:number,canvasHeight:number):FitSize=>{const ratio=canvasWidth/canvasHeight;const safeWidth=Math.max(160,availableWidth-44);const safeHeight=Math.max(160,availableHeight-44);if(safeWidth/safeHeight>ratio)return{width:Math.round(safeHeight*ratio),height:Math.round(safeHeight)};return{width:Math.round(safeWidth),height:Math.round(safeWidth/ratio)};};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const withCanvasDraft=(project:Project,draft:CanvasPreviewDraft|null):Project=>{if(!draft)return project;let found=false;const tracks=project.tracks.map(track=>({...track,clips:track.clips.map(clip=>{if(clip.id!==draft.clipId||!(clip.type==="video"||clip.type==="motion"||clip.type==="broll"))return clip;found=true;const current={...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})};const layout={...current,x:draft.transform.x,y:draft.transform.y,anchor:draft.transform.anchor,rotation:draft.transform.rotation};return clip.type==="motion"&&draft.linkedStyleId?{...clip,transform:layout}:{...clip,transform:{...layout,scale:draft.transform.scale,opacity:draft.transform.opacity}};})}));if(!found)return project;const linkedStyles=draft.linkedStyleId?project.linkedStyles.map(style=>{if(style.id!==draft.linkedStyleId)return style;const root=record(style.properties);const transform=record(root.transform);return{...style,properties:{...root,transform:{...transform,scale:draft.transform.scale,opacity:draft.transform.opacity}}};}):project.linkedStyles;return{...project,tracks,linkedStyles};};

export const StudioPreview=({project}:{project:Project})=>{
  const{locale,t}=useStudioPreferences();const playerRef=useRef<PlayerRef>(null);const viewportRef=useRef<HTMLDivElement>(null);const setProject=useProjectStore(state=>state.setProject);const pushHistory=useHistoryStore(state=>state.push);
  const currentFrame=usePlayerStore(state=>state.currentFrame);const setCurrentFrame=usePlayerStore(state=>state.setCurrentFrame);const setPlaying=usePlayerStore(state=>state.setPlaying);const seekFrame=usePlayerStore(state=>state.seekFrame);const seekVersion=usePlayerStore(state=>state.seekVersion);
  const{prefs,safeArea,setSafeAreaProfileId,setCustomSafeArea}=useProjectStudioPrefs(project.project.id);
  const[zoom,setZoom]=useState<"fit"|"100">("fit");const[showSafeZone,setShowSafeZone]=useState(false);const[canvasEdit,setCanvasEdit]=useState(false);const[canvasDraft,setCanvasDraft]=useState<CanvasPreviewDraft|null>(null);const[fitSize,setFitSize]=useState<FitSize|null>(null);const[canvasError,setCanvasError]=useState<string|null>(null);

  useEffect(()=>{const timer=window.setInterval(()=>{const player=playerRef.current;setCurrentFrame(player?.getCurrentFrame()??0);setPlaying(player?.isPlaying()??false);},100);return()=>window.clearInterval(timer);},[setCurrentFrame,setPlaying]);
  useEffect(()=>{if(seekVersion>0)playerRef.current?.seekTo(clampFrame(seekFrame,project.canvas.durationInFrames));},[project.canvas.durationInFrames,seekFrame,seekVersion]);
  useEffect(()=>{const toggle=()=>{const player=playerRef.current;if(!player)return;if(player.isPlaying())player.pause();else player.play();};window.addEventListener("video-os-toggle-playback",toggle);return()=>window.removeEventListener("video-os-toggle-playback",toggle);},[]);
  useEffect(()=>{const viewport=viewportRef.current;if(!viewport)return;const observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect)setFitSize(fitInside(rect.width,rect.height,project.canvas.width,project.canvas.height));});observer.observe(viewport);return()=>observer.disconnect();},[project.canvas.height,project.canvas.width]);

  const persistCanvasCommand=async(command:ProjectCommand,message:string)=>{
    setCanvasError(null);
    const before=useProjectStore.getState().project??project;
    try{
      const payload=await postProjectCommand(before,command);
      setProject(payload.project);
      if(before.project.id===payload.project.project.id&&before.project.revision!==payload.project.project.revision)pushHistory({projectId:project.project.id,label:message,before,after:payload.project});
    }catch(error){
      if(error instanceof ProjectRequestError&&error.code==="PROJECT_REVISION_CONFLICT"){
        const latest=await reloadProject(project.project.id);
        setProject(latest.project);
      }
      throw error;
    }
  };
  const previewProject=useMemo(()=>withCanvasDraft(project,canvasDraft),[canvasDraft,project]);
  const assetUrls=useMemo(()=>Object.fromEntries(project.assets.map(asset=>[asset.id,`/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`])),[project.assets,project.project.id]);const ratio=`${project.canvas.width} / ${project.canvas.height}`;const end=Math.max(0,project.canvas.durationInFrames-1);const key=`${project.project.id}-${project.canvas.durationInFrames}-${project.canvas.width}x${project.canvas.height}`;const fitStyle=zoom==="fit"&&fitSize?{width:`${fitSize.width}px`,height:`${fitSize.height}px`}:{width:`${project.canvas.width}px`,height:`${project.canvas.height}px`};
  const updateCustom=(side:keyof SafeAreaInsets,value:number)=>setCustomSafeArea({...prefs.customSafeArea,[side]:Math.max(0,Math.min(.45,value/100))});

  return <div className="player-workspace">
    <div className="player-toolbar"><div className="time-readout"><strong>{formatStudioTime(currentFrame,project.canvas.fps)}</strong><span>/ {formatStudioTime(end,project.canvas.fps)} · {t("preview.frame")} {currentFrame}/{end}</span></div><div className="segmented compact preview-view-controls"><button className={canvasEdit?"active":""} onClick={()=>setCanvasEdit(value=>{const next=!value;if(!next)setCanvasDraft(null);return next;})}>{locale==="zh-CN"?"画布编辑":"Canvas"}</button><button className={zoom==="fit"?"active":""} onClick={()=>setZoom("fit")}>{t("preview.fit")}</button><button className={zoom==="100"?"active":""} onClick={()=>setZoom("100")}>{t("preview.actual")}</button><button className={showSafeZone?"active":""} onClick={()=>setShowSafeZone(value=>!value)}>{t("preview.safe")}</button></div></div>
    {canvasError?<div className="canvas-command-error" role="alert"><span>{canvasError}</span><button type="button" onClick={()=>setCanvasError(null)} aria-label={locale==="zh-CN"?"关闭错误":"Dismiss error"}>×</button></div>:null}
    <div className="safe-area-toolbar"><label><span>{locale==="zh-CN"?"安全区":"Safe Area"}</span><select value={prefs.safeAreaProfileId} onChange={event=>{setSafeAreaProfileId(event.target.value as SafeAreaProfileId);setShowSafeZone(true);}}>{SAFE_AREA_PROFILES.map(profile=><option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>{prefs.safeAreaProfileId==="custom"?<div className="safe-area-custom">{(["top","right","bottom","left"] as const).map(side=><label key={side}><span>{side}</span><input type="number" min={0} max={45} step={1} value={Math.round(prefs.customSafeArea[side]*100)} onChange={event=>updateCustom(side,Number(event.target.value)||0)}/><em>%</em></label>)}</div>:<small>{Object.entries(safeArea.insets).map(([side,value])=>`${side} ${Math.round(value*100)}%`).join(" · ")}</small>}</div>
    <RenderControls projectId={project.project.id}/>
    <div ref={viewportRef} className={`player-scroll ${zoom==="100"?"native-size":""}`}><div className="stage-matte" style={zoom==="fit"&&fitSize?{width:`${fitSize.width+36}px`,height:`${fitSize.height+36}px`}:undefined}><div className="stage-corner top-left"/><div className="stage-corner top-right"/><div className="stage-corner bottom-left"/><div className="stage-corner bottom-right"/><div className={`player-shell ${canvasEdit?"canvas-editing":""}`} style={{aspectRatio:ratio,...fitStyle}}><Player key={key} ref={playerRef} component={MasterComposition} inputProps={{project:previewProject,assetUrls,renderMode:"preview"}} durationInFrames={project.canvas.durationInFrames} compositionWidth={project.canvas.width} compositionHeight={project.canvas.height} fps={project.canvas.fps} controls={!canvasEdit} style={{width:"100%",height:"100%"}}/>{canvasEdit?<CanvasOverlay project={project} onCommand={persistCanvasCommand} onDraftChange={setCanvasDraft} onError={error=>setCanvasError(error.message)}/>:null}{showSafeZone?<div className="safe-zone" style={{position:"absolute",...safeAreaCss(safeArea.insets)}} aria-hidden="true"><div/></div>:null}</div></div></div>
  </div>;
};
