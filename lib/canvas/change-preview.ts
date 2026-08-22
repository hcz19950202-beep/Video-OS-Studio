import type {Project} from "@/schemas/project";
import {describeCanvas} from "@/lib/canvas/aspect";

export type CanvasChangeTarget={width:number;height:number;fps?:number};
export type CanvasAffectedCounts={captions:number;motions:number;broll:number;videos:number;total:number};
export type CanvasChangePreview={
  before:{width:number;height:number;fps:number;aspectLabel:string};
  after:{width:number;height:number;fps:number;aspectLabel:string};
  affected:CanvasAffectedCounts;
  aspectChanged:boolean;
  fpsChanged:boolean;
};

export const countCanvasAffectedVisuals=(project:Project):CanvasAffectedCounts=>{
  let captions=0;let motions=0;let broll=0;let videos=0;
  for(const clip of project.tracks.flatMap(track=>track.clips)){
    if(clip.type==="caption")captions+=1;
    else if(clip.type==="motion")motions+=1;
    else if(clip.type==="broll")broll+=1;
    else if(clip.type==="video")videos+=1;
  }
  return{captions,motions,broll,videos,total:captions+motions+broll+videos};
};

export const buildCanvasChangePreview=(project:Project,target:CanvasChangeTarget):CanvasChangePreview=>{
  const beforeInfo=describeCanvas(project.canvas.width,project.canvas.height);
  const afterInfo=describeCanvas(target.width,target.height);
  const nextFps=target.fps??project.canvas.fps;
  return{
    before:{width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps,aspectLabel:beforeInfo.aspectLabel},
    after:{width:target.width,height:target.height,fps:nextFps,aspectLabel:afterInfo.aspectLabel},
    affected:countCanvasAffectedVisuals(project),
    aspectChanged:Math.abs(beforeInfo.ratio-afterInfo.ratio)>0.0001,
    fpsChanged:nextFps!==project.canvas.fps,
  };
};
