import {z} from "zod";
import {AssetSchema,type Asset} from "@/schemas/asset";
import {ClipSchema,type ClipType} from "@/schemas/clip";
import {ScriptDocumentSchema} from "@/schemas/script";
import {SceneSchema} from "@/schemas/scene";
import {MarkerSchema} from "@/schemas/marker";
import {BrandConfigSchema,DEFAULT_BRAND_CONFIG} from "@/schemas/brand";
import {LinkedStyleSchema,type LinkedStyle} from "@/schemas/linked-style";
import {LanguageConfigSchema,DEFAULT_LANGUAGE_CONFIG} from "@/schemas/language";
import {WorkflowStarterSchema,DEFAULT_WORKFLOW_STARTER} from "@/schemas/workflow";

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

const linkedStyleMatchesClip=(style:LinkedStyle,clipType:"caption"|"motion")=>clipType==="caption"?style.target==="caption":style.target==="motion"||style.target==="cta";
const sourceStartFor=(clip:{type:string;sourceStartFrame?:number})=>clip.type==="broll"?clip.sourceStartFrame??0:clip.sourceStartFrame??0;

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
  workflow:WorkflowStarterSchema.default(DEFAULT_WORKFLOW_STARTER),
}).superRefine((project,ctx)=>{
  const assetById=new Map<string,Asset>();
  for(const[index,asset]of project.assets.entries()){
    if(assetById.has(asset.id))ctx.addIssue({code:"custom",path:["assets",index,"id"],message:`Duplicate asset id ${asset.id}`});
    else assetById.set(asset.id,asset);
  }

  const styleById=new Map<string,LinkedStyle>();
  for(const[index,style]of project.linkedStyles.entries()){
    if(styleById.has(style.id))ctx.addIssue({code:"custom",path:["linkedStyles",index,"id"],message:`Duplicate linked style id ${style.id}`});
    else styleById.set(style.id,style);
  }

  const trackIds=new Set<string>();
  const clipIds=new Set<string>();
  for(const[trackIndex,track]of project.tracks.entries()){
    if(trackIds.has(track.id))ctx.addIssue({code:"custom",path:["tracks",trackIndex,"id"],message:`Duplicate track id ${track.id}`});
    trackIds.add(track.id);

    for(const[clipIndex,clip]of track.clips.entries()){
      const path=["tracks",trackIndex,"clips",clipIndex] as (string|number)[];
      if(clipIds.has(clip.id))ctx.addIssue({code:"custom",path:[...path,"id"],message:`Duplicate clip id ${clip.id}`});
      clipIds.add(clip.id);

      if(clip.startFrame+clip.durationInFrames>project.canvas.durationInFrames)ctx.addIssue({code:"custom",path:[...path,"durationInFrames"],message:`Clip ${clip.id} cannot extend beyond project duration`});

      const assetId="assetId" in clip?clip.assetId:undefined;
      if(typeof assetId==="string"){
        const asset=assetById.get(assetId);
        if(!asset)ctx.addIssue({code:"custom",path:[...path,"assetId"],message:`Clip ${clip.id} references missing asset ${assetId}`});
        else if(asset.durationInFrames!==undefined&&(clip.type==="video"||clip.type==="broll"||clip.type==="audio")){
          const sourceStart=sourceStartFor(clip);
          if(sourceStart+clip.durationInFrames>asset.durationInFrames)ctx.addIssue({code:"custom",path:[...path,"durationInFrames"],message:`Clip ${clip.id} exceeds source asset ${assetId} bounds`});
        }
      }

      if((clip.type==="caption"||clip.type==="motion")&&clip.linkedStyleId){
        const style=styleById.get(clip.linkedStyleId);
        if(!style)ctx.addIssue({code:"custom",path:[...path,"linkedStyleId"],message:`Clip ${clip.id} references missing linked style ${clip.linkedStyleId}`});
        else if(!linkedStyleMatchesClip(style,clip.type))ctx.addIssue({code:"custom",path:[...path,"linkedStyleId"],message:`Linked style ${style.id} does not target ${clip.type}`});
      }
    }
  }

  const sceneIds=new Set<string>();
  for(const[index,scene]of project.scenes.entries()){
    if(scene.endFrame>project.canvas.durationInFrames)ctx.addIssue({code:"custom",path:["scenes",index,"endFrame"],message:"Scene cannot extend beyond project duration"});
    if(sceneIds.has(scene.id))ctx.addIssue({code:"custom",path:["scenes",index,"id"],message:`Duplicate scene id ${scene.id}`});
    sceneIds.add(scene.id);
    if(scene.styleId&&!styleById.has(scene.styleId))ctx.addIssue({code:"custom",path:["scenes",index,"styleId"],message:`Scene ${scene.id} references missing linked style ${scene.styleId}`});
  }

  const markerIds=new Set<string>();
  for(const[index,marker]of project.markers.entries()){
    if(marker.frame>=project.canvas.durationInFrames)ctx.addIssue({code:"custom",path:["markers",index,"frame"],message:"Marker must be inside project duration"});
    if(markerIds.has(marker.id))ctx.addIssue({code:"custom",path:["markers",index,"id"],message:`Duplicate marker id ${marker.id}`});
    markerIds.add(marker.id);
  }
});

export type Project=z.infer<typeof ProjectSchema>;
export type Track=z.infer<typeof TrackSchema>;
