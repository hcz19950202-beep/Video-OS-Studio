import {z} from "zod";
import {AssetSchema} from "@/schemas/asset";
import {ClipSchema,type ClipType} from "@/schemas/clip";

export const LegacyProjectV1IdSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/,"Project IDs may contain only letters, numbers, underscores, and hyphens");

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
  clips:z.array(ClipSchema).default([]),
}).superRefine((track,ctx)=>{
  for(const[index,clip]of track.clips.entries())if(clip.type!==(track.type as ClipType))ctx.addIssue({code:"custom",path:["clips",index,"type"],message:`Clip type ${clip.type} cannot live on ${track.type} track`});
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
  assets:z.array(AssetSchema).default([]),
  tracks:z.array(LegacyTrackV1Schema).default([]),
});

export type LegacyProjectV1=z.infer<typeof LegacyProjectV1Schema>;
