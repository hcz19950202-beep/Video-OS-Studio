import {z} from "zod";

const FrameTimingSchema=z.object({startFrame:z.number().int().nonnegative(),durationInFrames:z.number().int().positive()});
const BaseClipShape={id:z.string().min(1),enabled:z.boolean().default(true),layer:z.number().int().default(0)};
export const MotionAnchorSchema=z.enum(["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]);
export const MotionTransformSchema=z.object({x:z.number().finite().default(0),y:z.number().finite().default(0),scale:z.number().min(0.1).max(5).default(1),opacity:z.number().min(0).max(1).default(1),anchor:MotionAnchorSchema.default("center"),rotation:z.number().finite().optional()});
export type MotionTransform=z.infer<typeof MotionTransformSchema>;
export const DEFAULT_MOTION_TRANSFORM:MotionTransform={x:0,y:0,scale:1,opacity:1,anchor:"center",rotation:0};

export const CaptionVisualStyleSchema=z.object({fontFamily:z.string().min(1).optional(),fontSize:z.number().min(12).max(240).optional(),fontWeight:z.number().int().min(100).max(1000).optional(),lineHeight:z.number().min(.7).max(3).optional(),position:z.enum(["top","center","bottom"]).optional(),maxWidth:z.number().min(20).max(100).optional(),alignment:z.enum(["left","center","right"]).optional(),fill:z.string().min(1).optional(),stroke:z.string().min(1).optional(),shadow:z.string().min(1).optional(),background:z.string().min(1).optional()});
export type CaptionVisualStyle=z.infer<typeof CaptionVisualStyleSchema>;

export const VideoClipSchema=z.object({...BaseClipShape,type:z.literal("video"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),muted:z.boolean().optional(),fit:z.enum(["contain","cover"]).optional(),transform:MotionTransformSchema.optional(),...FrameTimingSchema.shape});
export const CaptionClipSchema=z.object({...BaseClipShape,type:z.literal("caption"),text:z.string().min(1),preset:z.enum(["primary","minimal","bold"]).default("primary"),emphasis:z.enum(["none","numbers","keywords","both"]).default("numbers"),keywords:z.array(z.string()).default([]),style:CaptionVisualStyleSchema.optional(),linkedStyleId:z.string().min(1).optional(),...FrameTimingSchema.shape});
export const MotionClipSchema=z.object({...BaseClipShape,type:z.literal("motion"),engine:z.enum(["remotion","hyperframes"]),effectId:z.string().min(1),assetId:z.string().min(1).optional(),props:z.record(z.string(),z.unknown()).default({}),transform:MotionTransformSchema.optional(),linkedStyleId:z.string().min(1).optional(),...FrameTimingSchema.shape});
export const BrollClipSchema=z.object({...BaseClipShape,type:z.literal("broll"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().optional(),fit:z.enum(["cover","contain"]).optional(),muted:z.boolean().optional(),volume:z.number().min(0).max(2).optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),transform:MotionTransformSchema.optional(),...FrameTimingSchema.shape});
export const AudioClipSchema=z.object({...BaseClipShape,type:z.literal("audio"),assetId:z.string().min(1),sourceStartFrame:z.number().int().nonnegative().default(0),volume:z.number().min(0).max(2).default(1),muted:z.boolean().optional(),fadeInFrames:z.number().int().nonnegative().optional(),fadeOutFrames:z.number().int().nonnegative().optional(),role:z.enum(["voice","bgm","sfx"]).optional(),...FrameTimingSchema.shape});
export const ClipSchema=z.discriminatedUnion("type",[VideoClipSchema,CaptionClipSchema,MotionClipSchema,BrollClipSchema,AudioClipSchema]);
export type Clip=z.infer<typeof ClipSchema>;
export type ClipType=Clip["type"];
