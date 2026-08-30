import {z} from "zod";
import {ProjectSchema,type Project} from "@/schemas/project";

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
export type ResolvedExportProfile=ExportProfile&{width:number;height:number;fps:number;aspectMismatch:boolean};

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
  return{...profile,width,height,fps,aspectMismatch:Math.abs(sourceRatio-outputRatio)>.01};
};

const scaleFrame=(value:number,ratio:number)=>Math.max(0,Math.round(value*ratio));
const scalePositiveFrame=(value:number,ratio:number)=>Math.max(1,Math.round(value*ratio));
const scaleBoundedStart=(value:number,ratio:number,endExclusive:number)=>Math.min(endExclusive-1,scaleFrame(value,ratio));
const scaleBoundedInterval=(startFrame:number,durationInFrames:number,ratio:number,endExclusive:number)=>{
  const start=scaleBoundedStart(startFrame,ratio,endExclusive);
  const scaledEnd=Math.min(endExclusive,scaleFrame(startFrame+durationInFrames,ratio));
  const end=Math.max(start+1,scaledEnd);
  return{startFrame:start,durationInFrames:end-start};
};

export const projectForExportProfile=(project:Project,input?:Partial<ExportProfile>):{project:Project;profile:ResolvedExportProfile}=>{
  const profile=resolveExportProfile(project,input);
  const ratio=profile.fps/project.canvas.fps;
  const next=structuredClone(project) as Project;
  next.canvas.width=profile.width;
  next.canvas.height=profile.height;
  next.canvas.fps=profile.fps;
  if(ratio!==1){
    next.canvas.durationInFrames=scalePositiveFrame(project.canvas.durationInFrames,ratio);
    next.assets=project.assets.map(asset=>asset.durationInFrames===undefined?asset:{...asset,durationInFrames:scalePositiveFrame(asset.durationInFrames,ratio)});
    const scaledAssetDurationById=new Map(next.assets.map(asset=>[asset.id,asset.durationInFrames]));
    next.tracks=project.tracks.map(track=>({...track,clips:track.clips.map(clip=>{
      const timing=scaleBoundedInterval(clip.startFrame,clip.durationInFrames,ratio,next.canvas.durationInFrames);
      const copy={...clip,...timing} as typeof clip;
      if(copy.type==="video"||copy.type==="audio"||copy.type==="broll"){
        const sourceStartFrame=copy.type==="broll"?(copy.sourceStartFrame??0):copy.sourceStartFrame;
        const scaledAssetDuration=scaledAssetDurationById.get(copy.assetId);
        if(scaledAssetDuration!==undefined){
          copy.sourceStartFrame=scaleBoundedStart(sourceStartFrame,ratio,scaledAssetDuration);
          copy.durationInFrames=Math.min(copy.durationInFrames,scaledAssetDuration-copy.sourceStartFrame);
        }else if(copy.type!=="broll"||copy.sourceStartFrame!==undefined){
          copy.sourceStartFrame=scaleFrame(sourceStartFrame,ratio);
        }
      }
      if((copy.type==="audio"||copy.type==="broll")&&copy.fadeInFrames!==undefined)copy.fadeInFrames=Math.min(copy.durationInFrames,scaleFrame(copy.fadeInFrames,ratio));
      if((copy.type==="audio"||copy.type==="broll")&&copy.fadeOutFrames!==undefined)copy.fadeOutFrames=Math.min(copy.durationInFrames,scaleFrame(copy.fadeOutFrames,ratio));
      return copy;
    })}));
    next.scenes=project.scenes.map(scene=>{
      const timing=scaleBoundedInterval(scene.startFrame,scene.endFrame-scene.startFrame,ratio,next.canvas.durationInFrames);
      return{...scene,startFrame:timing.startFrame,endFrame:timing.startFrame+timing.durationInFrames};
    });
    next.markers=project.markers.map(marker=>({...marker,frame:scaleBoundedStart(marker.frame,ratio,next.canvas.durationInFrames)}));
  }
  return{project:ProjectSchema.parse(next),profile};
};

export const exportQualityCrf=(quality:ResolvedExportProfile["quality"])=>quality==="draft"?28:quality==="standard"?23:18;
