import {CURRENT_PROJECT_VERSION,ProjectSchema,type Project} from "@/schemas/project";
import {DEFAULT_BRAND_CONFIG} from "@/schemas/brand";
import {DEFAULT_LANGUAGE_CONFIG} from "@/schemas/language";

export type CreateProjectInput={
  id:string;
  name:string;
  now?:string;
  width?:number;
  height?:number;
  fps?:number;
  durationInFrames?:number;
};

export const createProject=({
  id,
  name,
  now=new Date().toISOString(),
  width=1080,
  height=1920,
  fps=30,
  durationInFrames=300,
}:CreateProjectInput):Project=>ProjectSchema.parse({
  version:CURRENT_PROJECT_VERSION,
  project:{id,name,revision:0,createdAt:now,updatedAt:now},
  canvas:{width,height,fps,durationInFrames},
  assets:[],
  tracks:[
    {id:"video-main",type:"video",name:"Video",clips:[]},
    {id:"captions-main",type:"caption",name:"Captions",clips:[]},
    {id:"motion-main",type:"motion",name:"Motion",clips:[]},
    {id:"broll-main",type:"broll",name:"B-roll",clips:[]},
    {id:"audio-main",type:"audio",name:"Audio",clips:[]},
  ],
  script:{segments:[]},
  scenes:[],
  markers:[],
  brand:DEFAULT_BRAND_CONFIG,
  linkedStyles:[],
  language:DEFAULT_LANGUAGE_CONFIG,
});
