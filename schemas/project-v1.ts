import {z} from "zod";

// H5 historical-schema rule: V1 input must be frozen here. Do not import the
// mutable current AssetSchema / ClipSchema into this file.
export const LegacyProjectV1IdSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/,"Project IDs may contain only letters, numbers, underscores, and hyphens");

export const LegacyProjectRelativePathV1Schema=z.string().min(1).refine(value=>{
  if(value.startsWith("/")||value.startsWith("\\"))return false;
  if(/^[A-Za-z]:[\\/]/.test(value))return false;
  if(value.includes("\\"))return false;
  return!value.split("/").some(segment=>segment==="..");
},"Asset paths must be project-relative POSIX-style paths without parent traversal");

export const LegacyAssetV1Schema=z.object({
  id:z.string().min(1),
  kind:z.enum(["video","audio","image","overlay","subtitle"]),
  relativePath:LegacyProjectRelativePathV1Schema,
  originalRelativePath:LegacyProjectRelativePathV1Schema.optional(),
  label:z.string().min(1).optional(),
  originalName:z.string().min(1).optional(),
  mimeType:z.string().min(1).optional(),
  originalMimeType:z.string().min(1).optional(),
  durationInFrames:z.number().int().positive().optional(),
  width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),
  sourceFps:z.number().positive().optional(),
  hasAudio:z.boolean().optional(),
  sizeBytes:z.number().int().nonnegative().optional(),
});

const LegacyFrameTimingV1Schema=z.object({startFrame:z.number().int().nonnegative(),durationInFrames:z.number().int().positive()});
const LegacyBaseClipV1Shape={id:z.string().min(1),enabled:z.boolean().default(true),layer:z.number().int().default(0)};
const LegacyMotionAnchorV1Schema=z.enum(["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]);
const LegacyMotionTransformV1Schema=z.object({x:z.number().finite().default(0),y:z.number().finite().default(0),scale:z.number().min(0.1).max(5).default(1),opacity:z.number().min(0).max(1).default(1),anchor:LegacyMotionAnchorV1Schema.default("center"),rotation:z.number().finite().optional()});
const LegacyCaptionVisualStyleV1Schema=z.object({fontFamily:z.string().min(1).optional(),fontSize:z.number().min(12).max(240).optional(),fontWeight:z.number().int().min(100).max(1000).optional(),lineHeight:z.number().min(.7).max(3).optional(),position:z.enum(["top","center","bottom"]).optional(),maxWidth:z.number().min(20).max(100).optional(),alignment:z.enum(["left","center","right"]).optional(),fill:z.string().min(1).optional(),stroke:z.string().min(1).optional(),shadow:z.string().min(1).optional(),background:z.string().min(1).optional()});

const LegacyVideoClipV1Schema=z.object({...LegacyBaseClipV1Shape,type:z.literal("video"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),muted:z.boolean().optional(),fit:z.enum(["contain","cover"]).optional(),transform:LegacyMotionTransformV1Schema.optional(),...LegacyFrameTimingV1Schema.shape});
const LegacyCaptionClipV1Schema=z.object({...LegacyBaseClipV1Shape,type:z.literal("caption"),text:z.string().min(1),preset:z.enum(["primary","minimal","bold"]).default("primary"),emphasis:z.enum(["none","numbers","keywords","both"]).default("numbers"),keywords:z.array(z.string()).default([]),style:LegacyCaptionVisualStyleV1Schema.optional(),linkedStyleId:z.string().min(1).optional(),...LegacyFrameTimingV1Schema.shape});
const LegacyMotionClipV1Schema=z.object({...LegacyBaseClipV1Shape,type:z.literal("motion"),engine:z.enum(["remotion","hyperframes"]),effectId:z.string().min(1),assetId:z.string().min(1).optional(),props:z.record(z.string(),z.unknown()).default({}),transform:LegacyMotionTransformV1Schema.optional(),linkedStyleId:z.string().min(1).optional(),...LegacyFrameTimingV1Schema.shape});
const LegacyBrollClipV1Schema=z.object({...LegacyBaseClipV1Shape,type:z.literal("broll"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().optional(),fit:z.enum(["cover","contain"]).optional(),muted:z.boolean().optional(),volume:z.number().min(0).max(2).optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),transform:LegacyMotionTransformV1Schema.optional(),...LegacyFrameTimingV1Schema.shape});
const LegacyAudioClipV1Schema=z.object({...LegacyBaseClipV1Shape,type:z.literal("audio"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),muted:z.boolean().optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),role:z.enum(["voice","bgm","sfx"]).optional(),...LegacyFrameTimingV1Schema.shape});
export const LegacyClipV1Schema=z.discriminatedUnion("type",[LegacyVideoClipV1Schema,LegacyCaptionClipV1Schema,LegacyMotionClipV1Schema,LegacyBrollClipV1Schema,LegacyAudioClipV1Schema]);
export type LegacyClipV1=z.infer<typeof LegacyClipV1Schema>;
export type LegacyClipV1Type=LegacyClipV1["type"];

export const LegacyCanvasV1Schema=z.object({
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  fps:z.number().int().positive(),
  durationInFrames:z.number().int().positive(),
});

export const LegacyTrackV1Schema=z.object({
  id:z.string().min(1),
  type:z.enum(["video","caption","motion","broll","audio"]),
  name:z.string().min(1),
  locked:z.boolean().default(false),
  hidden:z.boolean().default(false),
  clips:z.array(LegacyClipV1Schema).default([]),
}).superRefine((track,ctx)=>{
  for(const[index,clip]of track.clips.entries())if(clip.type!==(track.type as LegacyClipV1Type))ctx.addIssue({code:"custom",path:["clips",index,"type"],message:`Clip type ${clip.type} cannot live on ${track.type} track`});
});

export const LegacyProjectV1Schema=z.object({
  version:z.literal("1.0.0"),
  project:z.object({
    id:LegacyProjectV1IdSchema,
    name:z.string().min(1),
    revision:z.number().int().nonnegative(),
    createdAt:z.string().datetime(),
    updatedAt:z.string().datetime(),
  }),
  canvas:LegacyCanvasV1Schema,
  assets:z.array(LegacyAssetV1Schema).default([]),
  tracks:z.array(LegacyTrackV1Schema).default([]),
});

export type LegacyProjectV1=z.infer<typeof LegacyProjectV1Schema>;
