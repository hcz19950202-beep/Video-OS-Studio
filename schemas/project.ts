import {z} from "zod";
import {AssetSchema} from "@/schemas/asset";
import {ClipSchema,type ClipType} from "@/schemas/clip";
import {ScriptDocumentSchema} from "@/schemas/script";
import {SceneSchema} from "@/schemas/scene";
import {MarkerSchema} from "@/schemas/marker";
import {BrandConfigSchema,DEFAULT_BRAND_CONFIG} from "@/schemas/brand";
import {LinkedStyleSchema} from "@/schemas/linked-style";
import {LanguageConfigSchema,DEFAULT_LANGUAGE_CONFIG} from "@/schemas/language";

export const CURRENT_PROJECT_VERSION="2.0.0" as const;

export const ProjectIdSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/,"Project IDs may contain only letters, numbers, underscores, and hyphens");

export const CanvasSchema=z.object({
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  fps:z.number().int().positive(),
  durationInFrames:z.number().int().positive(),
});

export const TrackSchema=z.object({
  id:z.string().min(1),
  type:z.enum(["video","caption","motion","broll","audio"]),
  name:z.string().min(1),
  locked:z.boolean().default(false),
  hidden:z.boolean().default(false),
  clips:z.array(ClipSchema).default([]),
}).superRefine((track,ctx)=>{
  for(const[index,clip]of track.clips.entries())if(clip.type!==(track.type as ClipType))ctx.addIssue({code:"custom",path:["clips",index,"type"],message:`Clip type ${clip.type} cannot live on ${track.type} track`});
});

export const ProjectSchema=z.object({
  version:z.literal(CURRENT_PROJECT_VERSION),
  project:z.object({
    id:ProjectIdSchema,
    name:z.string().min(1),
    revision:z.number().int().nonnegative(),
    createdAt:z.string().datetime(),
    updatedAt:z.string().datetime(),
  }),
  canvas:CanvasSchema,
  assets:z.array(AssetSchema).default([]),
  tracks:z.array(TrackSchema).default([]),
  script:ScriptDocumentSchema.default({baseSourceRanges:[],segments:[]}),
  scenes:z.array(SceneSchema).default([]),
  markers:z.array(MarkerSchema).default([]),
  brand:BrandConfigSchema.default(DEFAULT_BRAND_CONFIG),
  linkedStyles:z.array(LinkedStyleSchema).default([]),
  language:LanguageConfigSchema.default(DEFAULT_LANGUAGE_CONFIG),
}).superRefine((project,ctx)=>{
  for(const[index,scene]of project.scenes.entries())if(scene.endFrame>project.canvas.durationInFrames)ctx.addIssue({code:"custom",path:["scenes",index,"endFrame"],message:"Scene cannot extend beyond project duration"});
  for(const[index,marker]of project.markers.entries())if(marker.frame>=project.canvas.durationInFrames)ctx.addIssue({code:"custom",path:["markers",index,"frame"],message:"Marker must be inside project duration"});
  const sceneIds=new Set<string>();
  for(const[index,scene]of project.scenes.entries()){
    if(sceneIds.has(scene.id))ctx.addIssue({code:"custom",path:["scenes",index,"id"],message:`Duplicate scene id ${scene.id}`});
    sceneIds.add(scene.id);
  }
  const markerIds=new Set<string>();
  for(const[index,marker]of project.markers.entries()){
    if(markerIds.has(marker.id))ctx.addIssue({code:"custom",path:["markers",index,"id"],message:`Duplicate marker id ${marker.id}`});
    markerIds.add(marker.id);
  }
  const styleIds=new Set<string>();
  for(const[index,style]of project.linkedStyles.entries()){
    if(styleIds.has(style.id))ctx.addIssue({code:"custom",path:["linkedStyles",index,"id"],message:`Duplicate linked style id ${style.id}`});
    styleIds.add(style.id);
  }
});

export type Project=z.infer<typeof ProjectSchema>;
export type Track=z.infer<typeof TrackSchema>;
