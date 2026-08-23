"use client";

import type {CallbackListener,PlayerRef} from "@remotion/player";
import {useEffect,type RefObject} from "react";
import {usePlayerStore} from "@/store/player-store";

type PlayerStateSink={
  setCurrentFrame:(frame:number)=>void;
  setPlaying:(playing:boolean)=>void;
};

export const bindRemotionPlayerState=(player:PlayerRef,sink:PlayerStateSink)=>{
  const onFrameUpdate:CallbackListener<"frameupdate">=event=>sink.setCurrentFrame(event.detail.frame);
  const onSeeked:CallbackListener<"seeked">=event=>sink.setCurrentFrame(event.detail.frame);
  const onPlay:CallbackListener<"play">=()=>sink.setPlaying(true);
  const onPause:CallbackListener<"pause">=()=>sink.setPlaying(false);
  const onEnded:CallbackListener<"ended">=()=>{sink.setPlaying(false);sink.setCurrentFrame(player.getCurrentFrame());};

  sink.setCurrentFrame(player.getCurrentFrame());
  sink.setPlaying(player.isPlaying());
  player.addEventListener("frameupdate",onFrameUpdate);
  player.addEventListener("seeked",onSeeked);
  player.addEventListener("play",onPlay);
  player.addEventListener("pause",onPause);
  player.addEventListener("ended",onEnded);

  return()=>{
    player.removeEventListener("frameupdate",onFrameUpdate);
    player.removeEventListener("seeked",onSeeked);
    player.removeEventListener("play",onPlay);
    player.removeEventListener("pause",onPause);
    player.removeEventListener("ended",onEnded);
  };
};

export const usePlayerStoreBridge=(playerRef:RefObject<PlayerRef|null>)=>{
  const setCurrentFrame=usePlayerStore(state=>state.setCurrentFrame);
  const setPlaying=usePlayerStore(state=>state.setPlaying);
  useEffect(()=>{
    const player=playerRef.current;
    if(!player)return;
    return bindRemotionPlayerState(player,{setCurrentFrame,setPlaying});
  },[playerRef,setCurrentFrame,setPlaying]);
};
