import {z} from "zod";
import {AssetSchema} from "@/schemas/asset";
import {ClipSchema,DEFAULT_MOTION_TRANSFORM,MotionAnchorSchema,MotionTransformSchema} from "@/schemas/clip";
import {ProjectSchema,type Project} from "@/schemas/project";

const MotionTransformPatchSchema=z.object({
  x:z.number().finite().optional(),
  y:z.number().finite().optional(),
  scale:z.number().min(0.1).max(5).optional(),
  opacity:z.number().min(0).max(1).optional(),
  anchor:MotionAnchorSchema.optional(),
});

export const ProjectCommandSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("rename-project"),name:z.string().min(1)}),
  z.object({type:z.literal("set-duration"),durationInFrames:z.number().int().positive()}),
  z.object({type:z.literal("set-canvas"),width:z.number().int().positive(),height:z.number().int().positive()}),
  z.object({type:z.literal("add-asset"),asset:AssetSchema}),
  z.object({type:z.literal("add-clip"),trackId:z.string().min(1),clip:ClipSchema}),
  z.object({type:z.literal("update-clip-timing"),clipId:z.string().min(1),startFrame:z.number().int().nonnegative().optional(),durationInFrames:z.number().int().positive().optional()}),
  z.object({type:z.literal("update-motion-props"),clipId:z.string().min(1),props:z.record(z.string(),z.unknown())}),
  z.object({type:z.literal("update-motion-transform"),clipId:z.string().min(1),transform:MotionTransformPatchSchema}),
  z.object({type:z.literal("update-caption-style"),clipId:z.string().min(1),preset:z.enum(["primary","minimal","bold"]).optional(),emphasis:z.enum(["none","numbers","keywords","both"]).optional(),keywords:z.array(z.string()).optional()}),
  z.object({type:z.literal("duplicate-clip"),clipId:z.string().min(1),newClipId:z.string().min(1),startFrame:z.number().int().nonnegative().optional()}),
  z.object({type:z.literal("set-track-state"),trackId:z.string().min(1),locked:z.boolean().optional(),hidden:z.boolean().optional()}),
  z.object({type:z.literal("remove-clip"),clipId:z.string().min(1)}),
]);

export type ProjectCommand=z.infer<typeof ProjectCommandSchema>;
export type ApplyProjectCommandOptions={now?:string};

export const applyProjectCommand=(projectInput:Project,commandInput:ProjectCommand,{now=new Date().toISOString()}:ApplyProjectCommandOptions={}):Project=>{
  const project=ProjectSchema.parse(projectInput);
  const command=ProjectCommandSchema.parse(commandInput);
  const next=structuredClone(project) as Project;

  switch(command.type){
    case"rename-project":next.project.name=command.name;break;
    case"set-duration":next.canvas.durationInFrames=command.durationInFrames;break;
    case"set-canvas":next.canvas.width=command.width;next.canvas.height=command.height;break;
    case"add-asset":
      if(next.assets.some(asset=>asset.id===command.asset.id))throw new Error(`Asset ${command.asset.id} already exists`);
      next.assets.push(command.asset);
      break;
    case"add-clip":{
      const track=next.tracks.find(item=>item.id===command.trackId);
      if(!track)throw new Error(`Track ${command.trackId} not found`);
      if(track.type!==command.clip.type)throw new Error(`Clip type ${command.clip.type} cannot be added to ${track.type} track`);
      if(next.tracks.some(item=>item.clips.some(clip=>clip.id===command.clip.id)))throw new Error(`Clip ${command.clip.id} already exists`);
      track.clips.push(command.clip);
      break;
    }
    case"update-clip-timing":{
      const clip=next.tracks.flatMap(track=>track.clips).find(item=>item.id===command.clipId);
      if(!clip)throw new Error(`Clip ${command.clipId} not found`);
      if(command.startFrame!==undefined)clip.startFrame=command.startFrame;
      if(command.durationInFrames!==undefined)clip.durationInFrames=command.durationInFrames;
      break;
    }
    case"update-motion-props":{
      const clip=next.tracks.flatMap(track=>track.clips).find(item=>item.id===command.clipId);
      if(!clip||clip.type!=="motion")throw new Error(`Clip ${command.clipId} is not a motion clip`);
      clip.props=command.props;
      break;
    }
    case"update-motion-transform":{
      const clip=next.tracks.flatMap(track=>track.clips).find(item=>item.id===command.clipId);
      if(!clip||clip.type!=="motion")throw new Error(`Clip ${command.clipId} is not a motion clip`);
      clip.transform=MotionTransformSchema.parse({...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{}),...command.transform});
      break;
    }
    case"update-caption-style":{
      const clip=next.tracks.flatMap(track=>track.clips).find(item=>item.id===command.clipId);
      if(!clip||clip.type!=="caption")throw new Error(`Clip ${command.clipId} is not a caption clip`);
      if(command.preset)clip.preset=command.preset;
      if(command.emphasis)clip.emphasis=command.emphasis;
      if(command.keywords)clip.keywords=command.keywords;
      break;
    }
    case"duplicate-clip":{
      if(next.tracks.some(track=>track.clips.some(clip=>clip.id===command.newClipId)))throw new Error(`Clip ${command.newClipId} already exists`);
      const track=next.tracks.find(item=>item.clips.some(clip=>clip.id===command.clipId));
      if(!track)throw new Error(`Clip ${command.clipId} not found`);
      const source=track.clips.find(clip=>clip.id===command.clipId)!;
      track.clips.push({...structuredClone(source),id:command.newClipId,startFrame:command.startFrame??source.startFrame+source.durationInFrames});
      break;
    }
    case"set-track-state":{
      const track=next.tracks.find(item=>item.id===command.trackId);
      if(!track)throw new Error(`Track ${command.trackId} not found`);
      if(command.locked!==undefined)track.locked=command.locked;
      if(command.hidden!==undefined)track.hidden=command.hidden;
      break;
    }
    case"remove-clip":{
      let found=false;
      for(const track of next.tracks){
        const before=track.clips.length;
        track.clips=track.clips.filter(clip=>clip.id!==command.clipId);
        found||=before!==track.clips.length;
      }
      if(!found)throw new Error(`Clip ${command.clipId} not found`);
      break;
    }
  }

  next.project.revision+=1;
  next.project.updatedAt=now;
  return ProjectSchema.parse(next);
};
