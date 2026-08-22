export type CanvasOrientation="landscape"|"portrait"|"square"|"ultrawide"|"tall";

export type CanvasPreset={
  id:string;
  label:string;
  width:number;
  height:number;
};

export type CanvasFit={
  width:number;
  height:number;
  scale:number;
};

export const CANVAS_PRESETS:readonly CanvasPreset[]=[
  {id:"landscape-16-9",label:"16:9",width:1920,height:1080},
  {id:"portrait-9-16",label:"9:16",width:1080,height:1920},
  {id:"square-1-1",label:"1:1",width:1080,height:1080},
  {id:"social-4-5",label:"4:5",width:1080,height:1350},
  {id:"portrait-3-4",label:"3:4",width:1080,height:1440},
  {id:"classic-4-3",label:"4:3",width:1440,height:1080},
  {id:"ultrawide-21-9",label:"21:9",width:2560,height:1080},
  {id:"uhd-landscape",label:"4K 16:9",width:3840,height:2160},
  {id:"uhd-portrait",label:"4K 9:16",width:2160,height:3840},
] as const;

const gcd=(a:number,b:number):number=>{let x=Math.abs(Math.round(a));let y=Math.abs(Math.round(b));while(y){const next=x%y;x=y;y=next;}return x||1;};

export const normalizeCanvasDimension=(value:number,fallback:number)=>Number.isFinite(value)&&value>0?Math.max(16,Math.min(16384,Math.round(value))):fallback;

export const normalizeCanvasSize=(width:number,height:number,fallback={width:1920,height:1080})=>({
  width:normalizeCanvasDimension(width,fallback.width),
  height:normalizeCanvasDimension(height,fallback.height),
});

export const getCanvasAspectRatio=(width:number,height:number)=>{
  const size=normalizeCanvasSize(width,height);
  return size.width/size.height;
};

export const getCanvasOrientation=(width:number,height:number):CanvasOrientation=>{
  const ratio=getCanvasAspectRatio(width,height);
  if(Math.abs(ratio-1)<=0.02)return"square";
  if(ratio>=1.9)return"ultrawide";
  if(ratio<=0.56)return"tall";
  return ratio>1?"landscape":"portrait";
};

export const getAspectLabel=(width:number,height:number)=>{
  const size=normalizeCanvasSize(width,height);
  const divisor=gcd(size.width,size.height);
  const left=size.width/divisor;
  const right=size.height/divisor;
  if(left<=100&&right<=100)return`${left}:${right}`;
  return`${size.width}×${size.height}`;
};

export const fitCanvasInside=(availableWidth:number,availableHeight:number,canvasWidth:number,canvasHeight:number,padding=0):CanvasFit=>{
  const available={width:Math.max(1,availableWidth-padding*2),height:Math.max(1,availableHeight-padding*2)};
  const canvas=normalizeCanvasSize(canvasWidth,canvasHeight);
  const scale=Math.min(available.width/canvas.width,available.height/canvas.height);
  return{width:Math.max(1,Math.round(canvas.width*scale)),height:Math.max(1,Math.round(canvas.height*scale)),scale};
};

export const findCanvasPreset=(width:number,height:number)=>CANVAS_PRESETS.find(preset=>preset.width===Math.round(width)&&preset.height===Math.round(height));

export const describeCanvas=(width:number,height:number)=>({
  ...normalizeCanvasSize(width,height),
  ratio:getCanvasAspectRatio(width,height),
  aspectLabel:getAspectLabel(width,height),
  orientation:getCanvasOrientation(width,height),
  preset:findCanvasPreset(width,height)?.id??"custom",
});
