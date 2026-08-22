import {getCanvasOrientation,type CanvasOrientation} from "@/lib/canvas/aspect";

export type EffectLayoutMode="relative"|"responsive"|"fixed";
export type EffectAspectFamily=CanvasOrientation;
export type EffectCapability={
  layoutMode:EffectLayoutMode;
  recommendedAspects:EffectAspectFamily[];
  unsupportedAspects:EffectAspectFamily[];
};

export type EffectCompatibility="recommended"|"supported"|"unsupported";
export type EffectCompatibilityResult={
  family:EffectAspectFamily;
  status:EffectCompatibility;
  message:string;
};

const UNIVERSAL:EffectAspectFamily[]=["landscape","portrait","square","ultrawide","tall"];

export const EFFECT_CAPABILITIES:Record<string,EffectCapability>={
  "big-number":{layoutMode:"responsive",recommendedAspects:["landscape","portrait","square"],unsupportedAspects:[]},
  "metric-focus":{layoutMode:"responsive",recommendedAspects:["landscape","portrait","square"],unsupportedAspects:[]},
  "keyword-impact":{layoutMode:"relative",recommendedAspects:[...UNIVERSAL],unsupportedAspects:[]},
  "lower-third":{layoutMode:"relative",recommendedAspects:["landscape","portrait","square","ultrawide"],unsupportedAspects:[]},
};

export const defaultEffectCapability=():EffectCapability=>({layoutMode:"responsive",recommendedAspects:[...UNIVERSAL],unsupportedAspects:[]});
export const getEffectCapability=(effectId:string):EffectCapability=>EFFECT_CAPABILITIES[effectId]??defaultEffectCapability();

export const evaluateEffectCompatibility=(effectId:string,width:number,height:number):EffectCompatibilityResult=>{
  const family=getCanvasOrientation(width,height);
  const capability=getEffectCapability(effectId);
  if(capability.unsupportedAspects.includes(family))return{family,status:"unsupported",message:`${effectId} is not supported on ${family} canvases.`};
  if(capability.recommendedAspects.includes(family))return{family,status:"recommended",message:`${effectId} is recommended for this ${family} canvas.`};
  return{family,status:"supported",message:`${effectId} supports this ${family} canvas, but this aspect is outside its recommended set.`};
};
