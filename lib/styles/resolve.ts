import type {Clip,CaptionVisualStyle,MotionTransform} from "@/schemas/clip";
import {DEFAULT_MOTION_TRANSFORM} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

export type ResolvedMotionStyle={
  props:Record<string,unknown>;
  transform:MotionTransform;
  linkedStyleId?:string;
};

const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const numberValue=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:undefined;
const stringValue=(value:unknown)=>typeof value==="string"&&value.length?value:undefined;

export const findSceneAtFrame=(project:Project,frame:number)=>project.scenes.find(scene=>frame>=scene.startFrame&&frame<scene.endFrame);

export const resolveLinkedStyleForClip=(project:Project,clip:Clip)=>{
  const directId="linkedStyleId" in clip?clip.linkedStyleId:undefined;
  if(directId)return project.linkedStyles.find(style=>style.id===directId);
  const scene=findSceneAtFrame(project,clip.startFrame);
  if(scene?.styleId)return project.linkedStyles.find(style=>style.id===scene.styleId);
  return undefined;
};

export const resolveMotionStyle=(project:Project,clip:Extract<Clip,{type:"motion"}>):ResolvedMotionStyle=>{
  const linked=resolveLinkedStyleForClip(project,clip);
  const linkedRoot=record(linked?.properties);
  const linkedProps=record(linkedRoot.props);
  const linkedTransform=record(linkedRoot.transform);
  const base={...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})};
  const transform:MotionTransform={
    x:numberValue(linkedTransform.x)??base.x,
    y:numberValue(linkedTransform.y)??base.y,
    scale:(numberValue(linkedTransform.scale)??base.scale)*project.brand.motion.scale,
    opacity:numberValue(linkedTransform.opacity)??base.opacity,
    anchor:(stringValue(linkedTransform.anchor) as MotionTransform["anchor"]|undefined)??base.anchor,
  };
  const props={...clip.props,...linkedProps};
  if("accentColor" in props&&(!linked||linkedProps.accentColor===undefined)&&project.brand.colors.primary)props.accentColor=project.brand.colors.primary;
  return{props,transform,...(linked?{linkedStyleId:linked.id}:{})};
};

export const resolveCaptionStyle=(project:Project,clip:Extract<Clip,{type:"caption"}>):CaptionVisualStyle=>{
  const linked=resolveLinkedStyleForClip(project,clip);
  const linkedRoot=record(linked?.properties);
  const linkedStyle=record(linkedRoot.style);
  const base:CaptionVisualStyle={
    fontFamily:project.brand.typography.captionFont,
    fill:project.brand.colors.text,
    ...clip.style,
  };
  return{
    ...base,
    ...(stringValue(linkedStyle.fontFamily)?{fontFamily:stringValue(linkedStyle.fontFamily)}:{}),
    ...(numberValue(linkedStyle.fontSize)?{fontSize:numberValue(linkedStyle.fontSize)}:{}),
    ...(numberValue(linkedStyle.fontWeight)?{fontWeight:numberValue(linkedStyle.fontWeight)}:{}),
    ...(numberValue(linkedStyle.lineHeight)?{lineHeight:numberValue(linkedStyle.lineHeight)}:{}),
    ...(stringValue(linkedStyle.position)?{position:stringValue(linkedStyle.position) as CaptionVisualStyle["position"]}:{}),
    ...(numberValue(linkedStyle.maxWidth)?{maxWidth:numberValue(linkedStyle.maxWidth)}:{}),
    ...(stringValue(linkedStyle.alignment)?{alignment:stringValue(linkedStyle.alignment) as CaptionVisualStyle["alignment"]}:{}),
    ...(stringValue(linkedStyle.fill)?{fill:stringValue(linkedStyle.fill)}:{}),
    ...(stringValue(linkedStyle.stroke)?{stroke:stringValue(linkedStyle.stroke)}:{}),
    ...(stringValue(linkedStyle.shadow)?{shadow:stringValue(linkedStyle.shadow)}:{}),
    ...(stringValue(linkedStyle.background)?{background:stringValue(linkedStyle.background)}:{}),
  };
};

export const createMotionLinkedStyleProperties=(clip:Extract<Clip,{type:"motion"}>)=>({
  props:{...clip.props},
  transform:{...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})},
});

export const createCaptionLinkedStyleProperties=(clip:Extract<Clip,{type:"caption"}>)=>({
  style:{...clip.style},
  preset:clip.preset,
  emphasis:clip.emphasis,
});
