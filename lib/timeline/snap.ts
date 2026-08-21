import type {Project} from "@/schemas/project";

export type SnapPoint={frame:number;kind:"playhead"|"clip-start"|"clip-end"|"scene"|"marker"|"caption";id?:string};
export type SnapResult={frame:number;snapped:boolean;point?:SnapPoint;distance:number};

export const collectTimelineSnapPoints=(project:Project,{playhead,excludeClipId}:{playhead?:number;excludeClipId?:string}={}):SnapPoint[]=>{
  const points:SnapPoint[]=[];
  if(playhead!==undefined)points.push({frame:playhead,kind:"playhead"});
  for(const scene of project.scenes){points.push({frame:scene.startFrame,kind:"scene",id:scene.id});points.push({frame:scene.endFrame,kind:"scene",id:scene.id});}
  for(const marker of project.markers)points.push({frame:marker.frame,kind:"marker",id:marker.id});
  for(const track of project.tracks)for(const clip of track.clips){
    if(clip.id===excludeClipId)continue;
    const kind=clip.type==="caption"?"caption":"clip-start";
    points.push({frame:clip.startFrame,kind,id:clip.id});
    points.push({frame:clip.startFrame+clip.durationInFrames,kind:clip.type==="caption"?"caption":"clip-end",id:clip.id});
  }
  return points.sort((a,b)=>a.frame-b.frame);
};

export const snapFrame=(candidate:number,points:SnapPoint[],thresholdFrames:number):SnapResult=>{
  let best:SnapResult={frame:candidate,snapped:false,distance:Number.POSITIVE_INFINITY};
  for(const point of points){const distance=Math.abs(point.frame-candidate);if(distance<=thresholdFrames&&distance<best.distance)best={frame:point.frame,snapped:true,point,distance};}
  return best.snapped?best:{frame:candidate,snapped:false,distance:best.distance};
};

export const snapMove=(candidateStart:number,duration:number,points:SnapPoint[],thresholdFrames:number)=>{
  const start=snapFrame(candidateStart,points,thresholdFrames);
  const end=snapFrame(candidateStart+duration,points,thresholdFrames);
  if(start.snapped&&(!end.snapped||start.distance<=end.distance))return{startFrame:start.frame,guide:start.point};
  if(end.snapped)return{startFrame:end.frame-duration,guide:end.point};
  return{startFrame:candidateStart,guide:undefined};
};

export const snapResizeEnd=(startFrame:number,candidateDuration:number,points:SnapPoint[],thresholdFrames:number)=>{
  const end=snapFrame(startFrame+candidateDuration,points,thresholdFrames);
  return end.snapped?{durationInFrames:Math.max(1,end.frame-startFrame),guide:end.point}:{durationInFrames:Math.max(1,candidateDuration),guide:undefined};
};
