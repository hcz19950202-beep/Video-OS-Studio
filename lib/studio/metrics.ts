import type {Project} from "@/schemas/project";

export type StudioMetrics={
  motionCards:number;
  captionCards:number;
  videoAssets:number;
  densityPerMinute:number;
  peakConcurrency:number;
};

const getPeakConcurrency=(project:Project)=>{
  const events:{frame:number;delta:number}[]=[];
  for(const track of project.tracks){
    for(const clip of track.clips){
      if(clip.type!=="motion"||!clip.enabled)continue;
      events.push({frame:clip.startFrame,delta:1},{frame:clip.startFrame+clip.durationInFrames,delta:-1});
    }
  }
  events.sort((a,b)=>a.frame-b.frame||a.delta-b.delta);
  let active=0,peak=0;
  for(const event of events){active+=event.delta;peak=Math.max(peak,active);}
  return peak;
};

export const getStudioMetrics=(project:Project):StudioMetrics=>{
  const motionCards=project.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="motion"&&clip.enabled).length;
  const captionCards=project.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption"&&clip.enabled).length;
  const videoAssets=project.assets.filter(asset=>asset.kind==="video").length;
  const minutes=Math.max(project.canvas.durationInFrames/project.canvas.fps/60,1/60);
  return{motionCards,captionCards,videoAssets,densityPerMinute:motionCards/minutes,peakConcurrency:getPeakConcurrency(project)};
};

export const formatStudioTime=(frame:number,fps:number)=>{
  const seconds=Math.max(0,frame/Math.max(1,fps));
  const minutes=Math.floor(seconds/60);
  const rest=seconds-minutes*60;
  return `${String(minutes).padStart(2,"0")}:${rest.toFixed(1).padStart(4,"0")}`;
};
