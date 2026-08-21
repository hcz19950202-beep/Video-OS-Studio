import {z} from "zod";
import {AssetSchema} from "@/schemas/asset";
import {CaptionVisualStyleSchema,ClipSchema,DEFAULT_MOTION_TRANSFORM,MotionAnchorSchema,MotionTransformSchema} from "@/schemas/clip";
import {ProjectSchema,type Project} from "@/schemas/project";
import {ScriptDocumentSchema} from "@/schemas/script";
import {SceneSchema,SceneSemanticTypeSchema,SceneVisualStrategySchema} from "@/schemas/scene";
import {MarkerSchema} from "@/schemas/marker";
import {BrandConfigSchema} from "@/schemas/brand";
import {LinkedStyleSchema} from "@/schemas/linked-style";
import {LanguageConfigSchema} from "@/schemas/language";

const MotionTransformPatchSchema=z.object({
  x:z.number().finite().optional(),
  y:z.number().finite().optional(),
  scale:z.number().min(0.1).max(5).optional(),
  opacity:z.number().min(0).max(1).optional(),
  anchor:MotionAnchorSchema.optional(),
  rotation:z.number().finite().optional(),
});
const ScenePatchSchema=z.object({
  name:z.string().min(1).optional(),
  semanticType:SceneSemanticTypeSchema.optional(),
  startFrame:z.number().int().nonnegative().optional(),
  endFrame:z.number().int().positive().optional(),
  summary:z.string().nullable().optional(),
  styleId:z.string().min(1).nullable().optional(),
  visualStrategy:SceneVisualStrategySchema.nullable().optional(),
});
const MarkerPatchSchema=z.object({
  frame:z.number().int().nonnegative().optional(),
  label:z.string().nullable().optional(),
  color:z.string().min(1).nullable().optional(),
  type:z.enum(["note","beat","cta","visual"]).optional(),
});

export const ProjectCommandSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("rename-project"),name:z.string().min(1)}),
  z.object({type:z.literal("set-duration"),durationInFrames:z.number().int().positive()}),
  z.object({type:z.literal("set-canvas"),width:z.number().int().positive(),height:z.number().int().positive()}),
  z.object({type:z.literal("add-asset"),asset:AssetSchema}),
  z.object({type:z.literal("add-clip"),trackId:z.string().min(1),clip:ClipSchema}),
  z.object({type:z.literal("update-clip-timing"),clipId:z.string().min(1),startFrame:z.number().int().nonnegative().optional(),durationInFrames:z.number().int().positive().optional()}),
  z.object({type:z.literal("set-clip-layer"),clipId:z.string().min(1),layer:z.number().int()}),
  z.object({type:z.literal("split-clip"),clipId:z.string().min(1),frame:z.number().int().nonnegative(),newClipId:z.string().min(1)}),
  z.object({type:z.literal("update-video-properties"),clipId:z.string().min(1),fit:z.enum(["contain","cover"]).optional(),volume:z.number().min(0).max(2).optional(),muted:z.boolean().optional(),transform:MotionTransformPatchSchema.optional()}),
  z.object({type:z.literal("update-motion-props"),clipId:z.string().min(1),props:z.record(z.string(),z.unknown())}),
  z.object({type:z.literal("update-motion-transform"),clipId:z.string().min(1),transform:MotionTransformPatchSchema}),
  z.object({type:z.literal("assign-linked-style"),clipId:z.string().min(1),styleId:z.string().min(1).nullable()}),
  z.object({type:z.literal("update-caption-style"),clipId:z.string().min(1),preset:z.enum(["primary","minimal","bold"]).optional(),emphasis:z.enum(["none","numbers","keywords","both"]).optional(),keywords:z.array(z.string()).optional(),style:CaptionVisualStyleSchema.optional()}),
  z.object({type:z.literal("update-broll-properties"),clipId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().optional(),fit:z.enum(["cover","contain"]).optional(),muted:z.boolean().optional(),volume:z.number().min(0).max(2).optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),transform:MotionTransformPatchSchema.optional()}),
  z.object({type:z.literal("update-audio-properties"),clipId:z.string().min(1),volume:z.number().min(0).max(2).optional(),muted:z.boolean().optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),role:z.enum(["voice","bgm","sfx"]).optional()}),
  z.object({type:z.literal("duplicate-clip"),clipId:z.string().min(1),newClipId:z.string().min(1),startFrame:z.number().int().nonnegative().optional()}),
  z.object({type:z.literal("set-track-state"),trackId:z.string().min(1),locked:z.boolean().optional(),hidden:z.boolean().optional()}),
  z.object({type:z.literal("remove-clip"),clipId:z.string().min(1)}),
  z.object({type:z.literal("set-script-document"),script:ScriptDocumentSchema}),
  z.object({type:z.literal("add-scene"),scene:SceneSchema}),
  z.object({type:z.literal("update-scene"),sceneId:z.string().min(1),patch:ScenePatchSchema}),
  z.object({type:z.literal("remove-scene"),sceneId:z.string().min(1)}),
  z.object({type:z.literal("add-marker"),marker:MarkerSchema}),
  z.object({type:z.literal("update-marker"),markerId:z.string().min(1),patch:MarkerPatchSchema}),
  z.object({type:z.literal("remove-marker"),markerId:z.string().min(1)}),
  z.object({type:z.literal("set-brand"),brand:BrandConfigSchema}),
  z.object({type:z.literal("add-linked-style"),style:LinkedStyleSchema}),
  z.object({type:z.literal("update-linked-style"),style:LinkedStyleSchema}),
  z.object({type:z.literal("remove-linked-style"),styleId:z.string().min(1)}),
  z.object({type:z.literal("set-language-config"),language:LanguageConfigSchema}),
  z.object({type:z.literal("restore-project-snapshot"),snapshot:ProjectSchema}),
]);

export type ProjectCommand=z.infer<typeof ProjectCommandSchema>;
export type ApplyProjectCommandOptions={now?:string;skipRevision?:boolean};

const findClip=(project:Project,clipId:string)=>project.tracks.flatMap(track=>track.clips).find(item=>item.id===clipId);
const applyTransform=(current:typeof DEFAULT_MOTION_TRANSFORM|undefined,patch:Partial<typeof DEFAULT_MOTION_TRANSFORM>)=>MotionTransformSchema.parse({...DEFAULT_MOTION_TRANSFORM,...(current??{}),...patch});

export const applyProjectCommand=(projectInput:Project,commandInput:ProjectCommand,{now=new Date().toISOString(),skipRevision=false}:ApplyProjectCommandOptions={}):Project=>{
  const project=ProjectSchema.parse(projectInput);
  const command=ProjectCommandSchema.parse(commandInput);

  if(command.type==="restore-project-snapshot"){
    if(command.snapshot.project.id!==project.project.id)throw new Error("Project snapshot ID must match the loaded project");
    const restored=structuredClone(command.snapshot) as Project;
    if(!skipRevision){restored.project.revision=project.project.revision+1;restored.project.updatedAt=now;}
    return ProjectSchema.parse(restored);
  }

  const next=structuredClone(project) as Project;

  switch(command.type){
    case"rename-project":next.project.name=command.name;break;
    case"set-duration":next.canvas.durationInFrames=command.durationInFrames;break;
    case"set-canvas":next.canvas.width=command.width;next.canvas.height=command.height;break;
    case"add-asset":if(next.assets.some(asset=>asset.id===command.asset.id))throw new Error(`Asset ${command.asset.id} already exists`);next.assets.push(command.asset);break;
    case"add-clip":{const track=next.tracks.find(item=>item.id===command.trackId);if(!track)throw new Error(`Track ${command.trackId} not found`);if(track.type!==command.clip.type)throw new Error(`Clip type ${command.clip.type} cannot be added to ${track.type} track`);if(next.tracks.some(item=>item.clips.some(clip=>clip.id===command.clip.id)))throw new Error(`Clip ${command.clip.id} already exists`);track.clips.push(command.clip);break;}
    case"update-clip-timing":{const clip=findClip(next,command.clipId);if(!clip)throw new Error(`Clip ${command.clipId} not found`);if(command.startFrame!==undefined)clip.startFrame=command.startFrame;if(command.durationInFrames!==undefined)clip.durationInFrames=command.durationInFrames;break;}
    case"set-clip-layer":{const clip=findClip(next,command.clipId);if(!clip)throw new Error(`Clip ${command.clipId} not found`);clip.layer=command.layer;break;}
    case"split-clip":{if(findClip(next,command.newClipId))throw new Error(`Clip ${command.newClipId} already exists`);const track=next.tracks.find(item=>item.clips.some(clip=>clip.id===command.clipId));if(!track)throw new Error(`Clip ${command.clipId} not found`);const clip=track.clips.find(item=>item.id===command.clipId)!;const end=clip.startFrame+clip.durationInFrames;if(command.frame<=clip.startFrame||command.frame>=end)throw new Error("Split frame must be inside the selected clip");const leftDuration=command.frame-clip.startFrame;const right=structuredClone(clip);right.id=command.newClipId;right.startFrame=command.frame;right.durationInFrames=end-command.frame;if(right.type==="video"||right.type==="audio")right.sourceStartFrame+=leftDuration;if(right.type==="broll")right.sourceStartFrame=(right.sourceStartFrame??0)+leftDuration;if(clip.type==="audio"||clip.type==="broll")clip.fadeOutFrames=0;if(right.type==="audio"||right.type==="broll")right.fadeInFrames=0;clip.durationInFrames=leftDuration;track.clips.push(right);break;}
    case"update-video-properties":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="video")throw new Error(`Clip ${command.clipId} is not a video clip`);if(command.fit!==undefined)clip.fit=command.fit;if(command.volume!==undefined)clip.volume=command.volume;if(command.muted!==undefined)clip.muted=command.muted;if(command.transform)clip.transform=applyTransform(clip.transform,command.transform);break;}
    case"update-motion-props":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="motion")throw new Error(`Clip ${command.clipId} is not a motion clip`);clip.props=command.props;break;}
    case"update-motion-transform":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="motion")throw new Error(`Clip ${command.clipId} is not a motion clip`);clip.transform=applyTransform(clip.transform,command.transform);break;}
    case"assign-linked-style":{const clip=findClip(next,command.clipId);if(!clip||!(clip.type==="motion"||clip.type==="caption"))throw new Error(`Clip ${command.clipId} cannot use a linked style`);if(command.styleId===null){delete clip.linkedStyleId;break;}const style=next.linkedStyles.find(item=>item.id===command.styleId);if(!style)throw new Error(`Linked style ${command.styleId} not found`);const expected=clip.type==="caption"?"caption":"motion";if(style.target!==expected&&!(clip.type==="motion"&&style.target==="cta"))throw new Error(`Linked style ${style.id} does not target ${expected}`);clip.linkedStyleId=style.id;break;}
    case"update-caption-style":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="caption")throw new Error(`Clip ${command.clipId} is not a caption clip`);if(command.preset)clip.preset=command.preset;if(command.emphasis)clip.emphasis=command.emphasis;if(command.keywords)clip.keywords=command.keywords;if(command.style)clip.style={...clip.style,...command.style};break;}
    case"update-broll-properties":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="broll")throw new Error(`Clip ${command.clipId} is not a B-roll clip`);if(command.sourceStartFrame!==undefined)clip.sourceStartFrame=command.sourceStartFrame;if(command.fit!==undefined)clip.fit=command.fit;if(command.muted!==undefined)clip.muted=command.muted;if(command.volume!==undefined)clip.volume=command.volume;if(command.fadeInFrames!==undefined)clip.fadeInFrames=command.fadeInFrames;if(command.fadeOutFrames!==undefined)clip.fadeOutFrames=command.fadeOutFrames;if(command.transform)clip.transform=applyTransform(clip.transform,command.transform);break;}
    case"update-audio-properties":{const clip=findClip(next,command.clipId);if(!clip||clip.type!=="audio")throw new Error(`Clip ${command.clipId} is not an audio clip`);if(command.volume!==undefined)clip.volume=command.volume;if(command.muted!==undefined)clip.muted=command.muted;if(command.fadeInFrames!==undefined)clip.fadeInFrames=command.fadeInFrames;if(command.fadeOutFrames!==undefined)clip.fadeOutFrames=command.fadeOutFrames;if(command.role!==undefined)clip.role=command.role;break;}
    case"duplicate-clip":{if(next.tracks.some(track=>track.clips.some(clip=>clip.id===command.newClipId)))throw new Error(`Clip ${command.newClipId} already exists`);const track=next.tracks.find(item=>item.clips.some(clip=>clip.id===command.clipId));if(!track)throw new Error(`Clip ${command.clipId} not found`);const source=track.clips.find(clip=>clip.id===command.clipId)!;track.clips.push({...structuredClone(source),id:command.newClipId,startFrame:command.startFrame??source.startFrame+source.durationInFrames});break;}
    case"set-track-state":{const track=next.tracks.find(item=>item.id===command.trackId);if(!track)throw new Error(`Track ${command.trackId} not found`);if(command.locked!==undefined)track.locked=command.locked;if(command.hidden!==undefined)track.hidden=command.hidden;break;}
    case"remove-clip":{let found=false;for(const track of next.tracks){const before=track.clips.length;track.clips=track.clips.filter(clip=>clip.id!==command.clipId);found||=before!==track.clips.length;}if(!found)throw new Error(`Clip ${command.clipId} not found`);break;}
    case"set-script-document":next.script=command.script;break;
    case"add-scene":if(next.scenes.some(scene=>scene.id===command.scene.id))throw new Error(`Scene ${command.scene.id} already exists`);next.scenes.push(command.scene);break;
    case"update-scene":{const scene=next.scenes.find(item=>item.id===command.sceneId);if(!scene)throw new Error(`Scene ${command.sceneId} not found`);const patch=command.patch;if(patch.name!==undefined)scene.name=patch.name;if(patch.semanticType!==undefined)scene.semanticType=patch.semanticType;if(patch.startFrame!==undefined)scene.startFrame=patch.startFrame;if(patch.endFrame!==undefined)scene.endFrame=patch.endFrame;if(patch.summary!==undefined){if(patch.summary===null)delete scene.summary;else scene.summary=patch.summary;}if(patch.styleId!==undefined){if(patch.styleId===null)delete scene.styleId;else scene.styleId=patch.styleId;}if(patch.visualStrategy!==undefined){if(patch.visualStrategy===null)delete scene.visualStrategy;else scene.visualStrategy=patch.visualStrategy;}break;}
    case"remove-scene":{const before=next.scenes.length;next.scenes=next.scenes.filter(scene=>scene.id!==command.sceneId);if(before===next.scenes.length)throw new Error(`Scene ${command.sceneId} not found`);for(const segment of next.script.segments)if(segment.sceneId===command.sceneId)delete segment.sceneId;break;}
    case"add-marker":if(next.markers.some(marker=>marker.id===command.marker.id))throw new Error(`Marker ${command.marker.id} already exists`);next.markers.push(command.marker);break;
    case"update-marker":{const marker=next.markers.find(item=>item.id===command.markerId);if(!marker)throw new Error(`Marker ${command.markerId} not found`);const patch=command.patch;if(patch.frame!==undefined)marker.frame=patch.frame;if(patch.type!==undefined)marker.type=patch.type;if(patch.label!==undefined){if(patch.label===null)delete marker.label;else marker.label=patch.label;}if(patch.color!==undefined){if(patch.color===null)delete marker.color;else marker.color=patch.color;}break;}
    case"remove-marker":{const before=next.markers.length;next.markers=next.markers.filter(marker=>marker.id!==command.markerId);if(before===next.markers.length)throw new Error(`Marker ${command.markerId} not found`);break;}
    case"set-brand":next.brand=command.brand;break;
    case"add-linked-style":if(next.linkedStyles.some(style=>style.id===command.style.id))throw new Error(`Linked style ${command.style.id} already exists`);next.linkedStyles.push(command.style);break;
    case"update-linked-style":{const index=next.linkedStyles.findIndex(style=>style.id===command.style.id);if(index<0)throw new Error(`Linked style ${command.style.id} not found`);next.linkedStyles[index]=command.style;break;}
    case"remove-linked-style":{const before=next.linkedStyles.length;next.linkedStyles=next.linkedStyles.filter(style=>style.id!==command.styleId);if(before===next.linkedStyles.length)throw new Error(`Linked style ${command.styleId} not found`);for(const track of next.tracks)for(const clip of track.clips)if((clip.type==="motion"||clip.type==="caption")&&clip.linkedStyleId===command.styleId)delete clip.linkedStyleId;for(const scene of next.scenes)if(scene.styleId===command.styleId)delete scene.styleId;break;}
    case"set-language-config":next.language=command.language;break;
  }

  if(!skipRevision){next.project.revision+=1;next.project.updatedAt=now;}
  return ProjectSchema.parse(next);
};
