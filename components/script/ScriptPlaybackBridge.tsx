"use client";

import {useEffect,useMemo} from "react";
import {findActiveScriptWordId} from "@/lib/script/playback";
import {mapTimelineFrameToSourceFrame} from "@/lib/script/model";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useScriptPlaybackStore} from "@/store/script-playback-store";

export const ScriptPlaybackBridge=({project}:{project:Project})=>{
  const projectId=project.project.id;
  const setActiveWordKey=useScriptPlaybackStore(state=>state.setActiveWordKey);
  const ranges=useMemo(()=>project.script.segments.flatMap(segment=>segment.words.map(word=>({id:word.id,startFrame:word.startFrame,endFrame:word.endFrame}))).sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame),[project.script.segments]);

  useEffect(()=>{
    const publish=(timelineFrame:number)=>{
      const sourceFrame=mapTimelineFrameToSourceFrame(project,timelineFrame);
      const wordId=findActiveScriptWordId(ranges,sourceFrame);
      setActiveWordKey(wordId?`${projectId}:${wordId}`:null);
    };
    publish(usePlayerStore.getState().currentFrame);
    const unsubscribe=usePlayerStore.subscribe((state,previous)=>{
      if(state.currentFrame!==previous.currentFrame)publish(state.currentFrame);
    });
    return()=>{
      unsubscribe();
      const state=useScriptPlaybackStore.getState();
      if(state.activeWordKey?.startsWith(`${projectId}:`))state.setActiveWordKey(null);
    };
  },[project,projectId,ranges,setActiveWordKey]);

  return null;
};
