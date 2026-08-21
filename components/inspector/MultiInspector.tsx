"use client";

import type {ProjectCommandTransaction} from "@/lib/project/history";
import {DEFAULT_MOTION_TRANSFORM,type MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";

export const MultiInspector=({project,onTransaction}:{project:Project;onTransaction:(transaction:ProjectCommandTransaction,message:string)=>Promise<void>})=>{
  const ids=useSelectionStore(state=>state.selectedClipIds);const clips=project.tracks.flatMap(track=>track.clips).filter(clip=>ids.includes(clip.id));const motions=clips.filter(clip=>clip.type==="motion");const allMotion=clips.length>1&&motions.length===clips.length;
  const scales=motions.map(clip=>({...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})}.scale));const opacities=motions.map(clip=>({...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})}.opacity);); 
  return <div/>;
};
