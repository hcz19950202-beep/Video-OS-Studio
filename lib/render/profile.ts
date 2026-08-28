import {z} from "zod";
import type {Project} from "@/schemas/project";

export const ExportQualitySchema=z.enum(["draft","standard","high"]);
export const ExportProfileSchema=z.object({
  sizing:z.enum(["project","custom"]).default("project"),
  width:z.number().int().min(16).max(16384).optional(),
  height:z.number().int().min(16).max(16384).optional(),
  fps:z.number().int().min(1).max(120).optional(),
  container:z.literal("mp4").default("mp4"),
  codec:z.literal("h264").default("h264"),
  audio:z.enum(["aac","none"]).default("aac"),
  quality:ExportQualitySchema.default("high"),
});
export type ExportProfile=z.infer<typeof ExportProfileSchema>;
export type ResolvedExportProfile=ExportProfile&{width:number;height:number;fps:number;aspectMismatch:boolean;dimensionAdjusted:boolean};

const h264CompatibleDimension=(value:number)=>value%2===0?value:Math.max(16,value-1);

export const resolveExportProfile=(project:Project,input?:Partial<ExportProfile>):ResolvedExportProfile=>{
  const profile=ExportProfileSchema.parse(input??{});
  const requestedWidth=profile.sizing==="custom"?(profile.width??project.canvas.width):project.canvas.width;
  const requestedHeight=profile.sizing==="custom"?(profile.height??project.canvas.height):project.canvas.height;
  const width=h264CompatibleDimension(requestedWidth);
  const height=h264CompatibleDimension(requestedHeight);
  const fps=profile.sizing==="custom"?(profile.fps??project.canvas.fps):project.canvas.fps;
  const sourceRatio=project.canvas.width/project.canvas.height;
  const outputRatio=width/height;
  return{...profile,width,height,fps,aspectMismatch:Math.abs(sourceRatio-outputRatio)>.01,dimensionAdjusted:width!==requestedWidth||height!==requestedHeight};
};

const scaleFrame=(value:number,ratio:number)=>Math.max(0,Math.round(value*ratio));
const scalePositiveFrame=(value:number,ratio:number)=>Math.max(1,Math.round(value*ratio));

export const projectForExportProfile=(project:Project,input?:Partial<ExportProfile>):{project:Project;profile:ResolvedExportProfile}=>{
  const profile=resolveExportProfile(project,input);
  const ratio=profile.fps/project.canvas.fps;
  const next=structuredClone(project) as Project;
  next.canvas.width=profile.width;
  next.canvas.height=profile.height;
  next.canvas.fps=profile.fps;
  if(ratio!==1){
    next.canvas.durationInFrames=scalePositiveFrame(project.canvas.durationInFrames,ratio);
    next.tracks=next.tracks.map(track=>({...track,clips:track.clips.map(clip=>{
      const copy={...clip,startFrame:scaleFrame(clip.startFrame,ratio),durationInFrames:scalePositiveFrame(clip.durationInFrames,ratio)} as typeof clip;
      if(copy.type==="video"||copy.type==="audio")copy.sourceStartFrame=scaleFrame(copy.sourceStartFrame,ratio);
      if(copy.type==="broll"&&copy.sourceStartFrame!==undefined)copy.sourceStartFrame=scaleFrame(copy.sourceStartFrame,ratio);
      if((copy.type==="audio"||copy.type==="broll")&&copy.fadeInFrames!==undefined)copy.fadeInFrames=scaleFrame(copy.fadeInFrames,ratio);
      if((copy.type==="audio"||copy.type==="broll")&&copy.fadeOutFrames!==undefined)copy.fadeOutFrames=scaleFrame(copy.fadeOutFrames,ratio);
      return copy;
    })}));
    next.scenes=next.scenes.map(scene=>({...scene,startFrame:scaleFrame(scene.startFrame,ratio),endFrame:scalePositiveFrame(scene.endFrame,ratio)}));
    next.markers=next.markers.map(marker=>({...marker,frame:Math.min(next.canvas.durationInFrames-1,scaleFrame(marker.frame,ratio))}));
  }
  return{project:next,profile};
};

export const exportQualityCrf=(quality:ResolvedExportProfile["quality"])=>quality==="draft"?28:quality==="standard"?23:18;
