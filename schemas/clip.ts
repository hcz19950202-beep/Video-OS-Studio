import {z} from "zod";

const FrameTimingSchema=z.object({
  startFrame:z.number().int().nonnegative(),
  durationInFrames:z.number().int().positive(),
});

const BaseClipShape={
  id:z.string().min(1),
  enabled:z.boolean().default(true),
  layer:z.number().int().default(0),
};

export const MotionAnchorSchema=z.enum([
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);

export const MotionTransformSchema=z.object({
  x:z.number().finite().default(0),
  y:z.number().finite().default(0),
  scale:z.number().min(0.1).max(5).default(1),
  opacity:z.number().min(0).max(1).default(1),
  anchor:MotionAnchorSchema.default("center"),
});

export type MotionTransform=z.infer<typeof MotionTransformSchema>;
export const DEFAULT_MOTION_TRANSFORM:MotionTransform={x:0,y:0,scale:1,opacity:1,anchor:"center"};

export const VideoClipSchema=z.object({...BaseClipShape,type:z.literal("video"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),...FrameTimingSchema.shape});
export const CaptionClipSchema=z.object({...BaseClipShape,type:z.literal("caption"),text:z.string().min(1),preset:z.enum(["primary","minimal","bold"]).default("primary"),emphasis:z.enum(["none","numbers","keywords","both"]).default("numbers"),keywords:z.array(z.string()).default([]),...FrameTimingSchema.shape});
export const MotionClipSchema=z.object({...BaseClipShape,type:z.literal("motion"),engine:z.enum(["remotion","hyperframes"]),effectId:z.string().min(1),assetId:z.string().min(1).optional(),props:z.record(z.string(),z.unknown()).default({}),transform:MotionTransformSchema.optional(),...FrameTimingSchema.shape});
export const BrollClipSchema=z.object({...BaseClipShape,type:z.literal("broll"),assetId:z.string().min(1),fit:z.enum(["cover","contain"]).default("cover"),muted:z.boolean().default(true),...FrameTimingSchema.shape});
export const AudioClipSchema=z.object({...BaseClipShape,type:z.literal("audio"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),...FrameTimingSchema.shape});
export const ClipSchema=z.discriminatedUnion("type",[VideoClipSchema,CaptionClipSchema,MotionClipSchema,BrollClipSchema,AudioClipSchema]);
export type Clip=z.infer<typeof ClipSchema>;
export type ClipType=Clip["type"];
