import type {Project} from "@/schemas/project";
import type {VisualDensity} from "@/lib/visual-planner/schema";

export type VisualInterval={startFrame:number;endFrame:number};

const peakConcurrency=(intervals:VisualInterval[])=>{
  const events=intervals.flatMap(interval=>[
    {frame:interval.startFrame,delta:1},
    {frame:interval.endFrame,delta:-1},
  ]).sort((a,b)=>a.frame-b.frame||a.delta-b.delta);
  let current=0;let peak=0;
  for(const event of events){current+=event.delta;peak=Math.max(peak,current);}
  return peak;
};

export const getMotionIntervals=(project:Project):VisualInterval[]=>project.tracks
  .filter(track=>!track.hidden)
  .flatMap(track=>track.clips)
  .filter(clip=>clip.type==="motion"&&clip.enabled)
  .map(clip=>({startFrame:clip.startFrame,endFrame:clip.startFrame+clip.durationInFrames}));

export const computeVisualDensity=(project:Project,extraIntervals:VisualInterval[]=[]):VisualDensity=>{
  const intervals=[...getMotionIntervals(project),...extraIntervals].sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame);
  const starts=intervals.map(interval=>interval.startFrame);
  const gaps=starts.slice(1).map((frame,index)=>Math.max(0,frame-starts[index]!));
  const minutes=Math.max(1/project.canvas.fps/60,project.canvas.durationInFrames/project.canvas.fps/60);
  return{
    motionCards:intervals.length,
    cardsPerMinute:intervals.length/minutes,
    peakConcurrency:peakConcurrency(intervals),
    averageGapFrames:gaps.length?gaps.reduce((sum,value)=>sum+value,0)/gaps.length:null,
    minimumGapFrames:gaps.length?Math.min(...gaps):null,
  };
};
