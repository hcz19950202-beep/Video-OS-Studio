"use client";

import {usePlayerStore} from "@/store/player-store";

export const TimelinePlayhead=({pixelsPerFrame}:{pixelsPerFrame:number})=>{
  const currentFrame=usePlayerStore(state=>state.currentFrame);
  return <i className="timeline-playhead" style={{left:currentFrame*pixelsPerFrame}}/>;
};
