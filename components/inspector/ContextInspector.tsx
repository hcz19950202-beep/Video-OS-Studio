"use client";

import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {AudioInspector,BrollInspector,VideoInspector} from "./MediaInspectors";
import {CaptionInspector} from "./CaptionInspector";
import {MotionInspector} from "./MotionInspector";
import {MultiInspector} from "./MultiInspector";
import {ProjectInspector} from "./ProjectInspector";
import {SceneInspector} from "./SceneInspector";

export const ContextInspector=({project,onCommand,onTransaction}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>;onTransaction:(transaction:ProjectCommandTransaction,message:string)=>Promise<void>})=>{
  const ids=useSelectionStore(state=>state.selectedClipIds);
  const sceneId=useSelectionStore(state=>state.selectedSceneId);
  if(ids.length>1)return <MultiInspector project={project} onTransaction={onTransaction}/>;
  if(sceneId)return <SceneInspector project={project} sceneId={sceneId} onCommand={onCommand}/>;
  const clip=ids.length===1?project.tracks.flatMap(track=>track.clips).find(item=>item.id===ids[0]):undefined;
  if(!clip)return <ProjectInspector project={project} onCommand={onCommand}/>;
  if(clip.type==="motion")return <MotionInspector project={project} onCommand={onCommand} onTransaction={onTransaction}/>;
  if(clip.type==="caption")return <CaptionInspector project={project} onCommand={onCommand}/>;
  if(clip.type==="video")return <VideoInspector clip={clip} onCommand={onCommand}/>;
  if(clip.type==="broll")return <BrollInspector clip={clip} onCommand={onCommand}/>;
  return <AudioInspector clip={clip} onCommand={onCommand}/>;
};
