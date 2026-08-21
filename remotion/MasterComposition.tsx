import React from "react";
import {AbsoluteFill,interpolate,OffthreadVideo,Sequence,useCurrentFrame} from "remotion";
import type {CSSProperties} from "react";
import {DEFAULT_MOTION_TRANSFORM,type Clip,type MotionTransform} from "../schemas/clip";
import type {Project} from "../schemas/project";
import {EFFECTS_BY_ID} from "../shared/effects/registry";
import {CaptionOverlay} from "../components/captions/CaptionOverlay";
import {resolveMotionStyle} from "../lib/styles/resolve";

export type MasterCompositionProps={project:Project;assetUrls?:Record<string,string>;renderMode?:"preview"|"final"|"overlay"};
type VideoClip=Extract<Clip,{type:"video"}>;
type MotionClip=Extract<Clip,{type:"motion"}>;
type CaptionClip=Extract<Clip,{type:"caption"}>;
type BrollClip=Extract<Clip,{type:"broll"}>;

const anchorOrigins:Record<MotionTransform["anchor"],string>={"top-left":"0% 0%",top:"50% 0%","top-right":"100% 0%",left:"0% 50%",center:"50% 50%",right:"100% 50%","bottom-left":"0% 100%",bottom:"50% 100%","bottom-right":"100% 100%"};
const mediaStyle=(transform:MotionTransform|undefined,fit:"contain"|"cover"="contain"):CSSProperties=>{const value={...DEFAULT_MOTION_TRANSFORM,...(transform??{})};return{width:"100%",height:"100%",objectFit:fit,transform:`translate3d(${value.x}px, ${value.y}px, 0) scale(${value.scale})`,transformOrigin:anchorOrigins[value.anchor],opacity:value.opacity};};
const fadeOpacity=(frame:number,duration:number,fadeIn:number,fadeOut:number)=>{const a=fadeIn?interpolate(frame,[0,Math.min(fadeIn,duration)],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):1;const start=Math.max(0,duration-Math.min(fadeOut,duration));const b=fadeOut?interpolate(frame,[start,duration],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):1;return Math.min(a,b);};
const BrollLayer=({clip,src}:{clip:BrollClip;src:string})=>{const frame=useCurrentFrame();const opacity=fadeOpacity(frame,clip.durationInFrames,clip.fadeInFrames,clip.fadeOutFrames);const style=mediaStyle(clip.transform,clip.fit);return <OffthreadVideo src={src} volume={clip.muted?0:clip.volume} style={{...style,opacity:Number(style.opacity??1)*opacity}}/>;};

export const MasterComposition:React.FC<MasterCompositionProps>=({project,assetUrls={},renderMode="preview"})=>{
  const frame=useCurrentFrame();const visible=project.tracks.filter(track=>!track.hidden);const clips=visible.flatMap(track=>track.clips).filter(clip=>clip.enabled);
  const videos=clips.filter((clip):clip is VideoClip=>clip.type==="video");const motions=clips.filter((clip):clip is MotionClip=>clip.type==="motion");const captions=clips.filter((clip):clip is CaptionClip=>clip.type==="caption");const broll=clips.filter((clip):clip is BrollClip=>clip.type==="broll");const overlay=renderMode==="overlay";
  return <AbsoluteFill style={{backgroundColor:overlay?undefined:project.brand.colors.background,color:project.brand.colors.text,fontFamily:project.brand.typography.bodyFont}}>
    {!overlay&&videos.map(clip=>{const src=assetUrls[clip.assetId];return src?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><OffthreadVideo src={src} trimBefore={clip.sourceStartFrame} volume={clip.muted?0:clip.volume} style={mediaStyle(clip.transform,clip.fit)}/></Sequence>:null;})}
    {!overlay&&broll.sort((a,b)=>a.layer-b.layer).map(clip=>{const src=assetUrls[clip.assetId];return src?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><BrollLayer clip={clip} src={src}/></Sequence>:null;})}
    {motions.sort((a,b)=>a.layer-b.layer).map(clip=>{const resolved=resolveMotionStyle(project,clip);const style:CSSProperties={transform:`translate3d(${resolved.transform.x}px, ${resolved.transform.y}px, 0) scale(${resolved.transform.scale})`,transformOrigin:anchorOrigins[resolved.transform.anchor],opacity:resolved.transform.opacity};if(clip.engine==="hyperframes"){const src=clip.assetId?assetUrls[clip.assetId]:undefined;return src?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><AbsoluteFill style={style}><OffthreadVideo src={src} transparent volume={0} style={{width:"100%",height:"100%",objectFit:"contain"}}/></AbsoluteFill></Sequence>:null;}const effect=EFFECTS_BY_ID[clip.effectId];if(!effect)return null;const Effect=effect.component;const parsed=effect.schema.safeParse(resolved.props);return parsed.success?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}><AbsoluteFill style={style}><Effect props={parsed.data}/></AbsoluteFill></Sequence>:null;})}
    {!overlay&&videos.length===0&&renderMode==="preview"?<AbsoluteFill style={{justifyContent:"center",alignItems:"center",padding:80}}><div style={{width:"100%"}}><div style={{color:project.brand.colors.primary,fontSize:34,fontWeight:800,letterSpacing:3}}>VIDEO OS STUDIO</div><div style={{fontSize:76,fontWeight:900,marginTop:28}}>{project.project.name}</div></div></AbsoluteFill>:null}
    {captions.map(caption=><Sequence key={caption.id} from={caption.startFrame} durationInFrames={caption.durationInFrames}><AbsoluteFill><CaptionOverlay caption={caption} project={project}/></AbsoluteFill></Sequence>)}
    {renderMode==="preview"?<div style={{position:"absolute",right:24,bottom:18,fontSize:20,padding:"8px 12px",borderRadius:8,background:"rgba(0,0,0,.55)",opacity:.72}}>{project.canvas.width}×{project.canvas.height} · {project.canvas.fps} fps · f{frame}</div>:null}
  </AbsoluteFill>;
};
