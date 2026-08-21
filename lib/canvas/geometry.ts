import type {MotionTransform} from "@/schemas/clip";

export type CanvasGuide={axis:"x"|"y";value:number;kind:"center"|"safe"|"object"};
export type CanvasSnapResult={transform:MotionTransform;guides:CanvasGuide[]};

const nearest=(value:number,candidates:Array<{value:number;kind:CanvasGuide["kind"]}>,threshold:number)=>{
  let best:{value:number;kind:CanvasGuide["kind"];distance:number}|undefined;
  for(const candidate of candidates){const distance=Math.abs(candidate.value-value);if(distance<=threshold&&(!best||distance<best.distance))best={...candidate,distance};}
  return best;
};

export const canvasSnapTargets=(width:number,height:number,otherTransforms:MotionTransform[]=[])=>({
  x:[{value:0,kind:"center" as const},{value:-width*.43,kind:"safe" as const},{value:width*.43,kind:"safe" as const},...otherTransforms.map(transform=>({value:transform.x,kind:"object" as const}))],
  y:[{value:0,kind:"center" as const},{value:-height*.42,kind:"safe" as const},{value:height*.36,kind:"safe" as const},...otherTransforms.map(transform=>({value:transform.y,kind:"object" as const}))],
});

export const snapCanvasTransform=(transform:MotionTransform,{width,height,threshold,others=[]}:{width:number;height:number;threshold:number;others?:MotionTransform[]}):CanvasSnapResult=>{
  const targets=canvasSnapTargets(width,height,others);const x=nearest(transform.x,targets.x,threshold);const y=nearest(transform.y,targets.y,threshold);const guides:CanvasGuide[]=[];
  if(x)guides.push({axis:"x",value:x.value,kind:x.kind});if(y)guides.push({axis:"y",value:y.value,kind:y.kind});
  return{transform:{...transform,x:x?.value??transform.x,y:y?.value??transform.y},guides};
};

export const resizeScaleFromPointer=(initialScale:number,deltaX:number,deltaY:number,baseWidth:number,baseHeight:number)=>{
  const xDelta=deltaX/Math.max(1,baseWidth);const yDelta=deltaY/Math.max(1,baseHeight);const next=initialScale+(xDelta+yDelta)/2;return Math.max(.1,Math.min(5,next));
};

export const rotationFromPointer=(centerX:number,centerY:number,pointerX:number,pointerY:number)=>Math.round(Math.atan2(pointerY-centerY,pointerX-centerX)*180/Math.PI+90);

export const normalizeRotation=(degrees:number)=>{let value=degrees%360;if(value>180)value-=360;if(value<=-180)value+=360;return value;};
