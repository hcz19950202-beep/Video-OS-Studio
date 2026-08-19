import React from "react";
import {AbsoluteFill,OffthreadVideo,Sequence,useCurrentFrame} from "remotion";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {EFFECTS_BY_ID} from "@/shared/effects/registry";
import {CaptionOverlay} from "@/components/captions/CaptionOverlay";

export type MasterCompositionProps={project:Project;assetUrls?:Record<string,string>;renderMode?:"preview"|"final"|"overlay"};
type VideoClip=Extract<Clip,{type:"video"}>;type MotionClip=Extract<Clip,{type:"motion"}>;type CaptionClip=Extract<Clip,{type:"caption"}>;

export const MasterComposition:React.FC<MasterCompositionProps>=({project,assetUrls={},renderMode="preview"})=>{
  const frame=useCurrentFrame();
  const visible=project.tracks.filter((track)=>!track.hidden);
  const videos=visible.flatMap((track)=>track.clips).filter((clip):clip is VideoClip=>clip.type==="video"&&clip.enabled);
  const motions=visible.flatMap((track)=>track.clips).filter((clip):clip is MotionClip=>clip.type==="motion"&&clip.enabled);
  const captions=visible.flatMap((track)=>track.clips).filter((clip):clip is CaptionClip=>clip.type==="caption"&&clip.enabled);
  const overlay=renderMode==="overlay";
  return <AbsoluteFill style={{backgroundColor:overlay?undefined:"#080b0f",color:"#f5f7fa",fontFamily:"Arial, sans-serif"}}>
    {!overlay&&videos.map((clip)=>{const src=assetUrls[clip.assetId];return src?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><OffthreadVideo src={src} startFrom={clip.sourceStartFrame} volume={clip.volume} style={{width:"100%",height:"100%",objectFit:"contain"}}/></Sequence>:null;})}
    {motions.sort((a,b)=>a.layer-b.layer).map((clip)=>{if(clip.engine==="hyperframes"){const src=clip.assetId?assetUrls[clip.assetId]:undefined;return src?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><AbsoluteFill><OffthreadVideo src={src} transparent volume={0} style={{width:"100%",height:"100%",objectFit:"contain"}}/></AbsoluteFill></Sequence>:null;}const effect=EFFECTS_BY_ID[clip.effectId];if(!effect)return null;const Effect=effect.component;const parsed=effect.schema.safeParse(clip.props);return parsed.success?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><AbsoluteFill><Effect props={parsed.data}/></AbsoluteFill></Sequence>:null;})}
    {!overlay&&videos.length===0&&renderMode==="preview"?<AbsoluteFill style={{justifyContent:"center",alignItems:"center",padding:80}}><div style={{width:"100%"}}><div style={{color:"#ffc400",fontSize:34,fontWeight:800,letterSpacing:3}}>VIDEO OS STUDIO</div><div style={{fontSize:76,fontWeight:900,marginTop:28}}>{project.project.name}</div></div></AbsoluteFill>:null}
    {captions.map((caption)=><Sequence key={caption.id} from={caption.startFrame} durationInFrames={caption.durationInFrames}><AbsoluteFill><CaptionOverlay caption={caption}/></AbsoluteFill></Sequence>)}
    {renderMode==="preview"?<div style={{position:"absolute",right:24,bottom:18,fontSize:20,padding:"8px 12px",borderRadius:8,background:"rgba(0,0,0,.55)",opacity:.72}}>{project.canvas.width}×{project.canvas.height} · {project.canvas.fps} fps · f{frame}</div>:null}
  </AbsoluteFill>;
};
