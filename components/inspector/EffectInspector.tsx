"use client";

import type {ProjectCommand} from "@/lib/project/commands";
import {DEFAULT_MOTION_TRANSFORM,type MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {EFFECTS_BY_ID} from "@/shared/effects/registry";
import type {EffectField} from "@/shared/effects/types";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {translateEffectName,type StudioMessageKey} from "@/lib/i18n/studio";
import {CaptionInspector} from "./CaptionInspector";
import {EffectPresetControls} from "./EffectPresetControls";

const coerce=(field:EffectField,value:string|boolean)=>field.type==="number"||field.type==="slider"?Number(value):value;
const zhFieldLabels:Record<string,string>={label:"标签",value:"核心数值",suffix:"单位",accentColor:"强调色",fontSize:"字号",animationStyle:"动画方式",title:"标题",subtitle:"副标题",keyword:"关键词",name:"名称",role:"身份",color:"颜色",background:"背景",progress:"进度",size:"大小",scale:"缩放"};
const zhOptions:Record<string,string>={scale:"缩放",slide:"滑入",left:"左",right:"右",center:"居中"};

const groupForField=(field:EffectField):"content"|"timing"|"style"=>{
  const key=field.key.toLowerCase();
  if(key.includes("animation")||key.includes("speed")||key.includes("delay")||key.includes("interval"))return"timing";
  if(field.type==="color"||key.includes("color")||key.includes("font")||key.includes("background")||key.includes("shadow")||key.includes("glow"))return"style";
  return"content";
};

const anchorKeys:MotionTransform["anchor"][]=["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"];
const anchorI18n:Record<MotionTransform["anchor"],StudioMessageKey>={
  "top-left":"layout.anchor.topLeft",top:"layout.anchor.top","top-right":"layout.anchor.topRight",left:"layout.anchor.left",center:"layout.anchor.center",right:"layout.anchor.right","bottom-left":"layout.anchor.bottomLeft",bottom:"layout.anchor.bottom","bottom-right":"layout.anchor.bottomRight",
};

export const EffectInspector=({project,onCommand}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>})=>{
  const selected=useSelectionStore(state=>state.selectedClipId);
  const selectClip=useSelectionStore(state=>state.selectClip);
  const{locale,t}=useStudioPreferences();
  const clip=project.tracks.flatMap(track=>track.clips).find(item=>item.id===selected);
  if(clip?.type==="caption")return <CaptionInspector project={project} onCommand={onCommand}/>;
  if(!clip||clip.type!=="motion")return <div className="inspector-empty os-inspector-empty"><small>INSPECTOR</small><h2>{t("inspector.title")}</h2><p>{t("inspector.empty")}</p></div>;

  const effect=clip.engine==="remotion"?EFFECTS_BY_ID[clip.effectId]:undefined;
  if(clip.engine==="remotion"&&!effect)return <div className="inspector-empty"><h2>{t("inspector.title")}</h2><p>{t("inspector.missing")}</p></div>;
  const displayName=translateEffectName(locale,clip.effectId,effect?.name??clip.effectId);
  const category=effect?.category??"hyperframes";
  let props:Record<string,unknown>=clip.props;
  if(effect){try{props=effect.schema.parse(clip.props);}catch{props=effect.defaults;}}
  const transform={...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})};

  const update=(key:string,value:string|boolean,field:EffectField)=>{
    if(!effect)return;
    const next={...props,[key]:coerce(field,value)};
    const parsed=effect.schema.safeParse(next);
    if(parsed.success)void onCommand({type:"update-motion-props",clipId:clip.id,props:parsed.data},`${displayName} · ${t("inspector.updated")}`);
  };

  const updateTiming=(patch:{startFrame?:number;durationInFrames?:number})=>{
    const startFrame=Math.max(0,Math.min(project.canvas.durationInFrames-1,patch.startFrame??clip.startFrame));
    const durationInFrames=Math.max(1,Math.min(project.canvas.durationInFrames-startFrame,patch.durationInFrames??clip.durationInFrames));
    void onCommand({type:"update-clip-timing",clipId:clip.id,startFrame,durationInFrames},t("timeline.updated"));
  };

  const updateTransform=(patch:Partial<MotionTransform>)=>void onCommand({type:"update-motion-transform",clipId:clip.id,transform:patch},t("inspector.updated"));

  const renderField=(field:EffectField)=>{
    const label=locale==="zh-CN"?(zhFieldLabels[field.key]??field.label):field.label;
    return <label className="inspector-field" key={field.key}><span>{label}</span>{field.type==="switch"?<input type="checkbox" checked={Boolean(props[field.key])} onChange={event=>update(field.key,event.target.checked,field)}/>:field.type==="select"?<select value={String(props[field.key]??"")} onChange={event=>update(field.key,event.target.value,field)}>{field.options?.map(option=><option value={option.value} key={option.value}>{locale==="zh-CN"?(zhOptions[option.value]??option.label):option.label}</option>)}</select>:field.type==="slider"?<div className="slider-field"><input type="range" min={field.min} max={field.max} step={field.step} value={Number(props[field.key]??field.min??0)} onChange={event=>update(field.key,event.target.value,field)}/><output>{String(props[field.key])}</output></div>:<input type={field.type==="color"?"color":field.type==="number"?"number":"text"} min={field.min} max={field.max} step={field.step} value={String(props[field.key]??"")} onChange={event=>update(field.key,event.target.value,field)}/>}</label>;
  };

  const grouped=effect?{content:effect.fields.filter(field=>groupForField(field)==="content"),timing:effect.fields.filter(field=>groupForField(field)==="timing"),style:effect.fields.filter(field=>groupForField(field)==="style")}:{content:[],timing:[],style:[]};

  return <div className="effect-inspector os-inspector">
    <header className="inspector-card-head"><small>{t("inspector.title")} · {clip.id.slice(0,14)}</small><div><span className="inspector-dot"/><h2>{displayName}</h2><em>{category}</em></div></header>

    <EffectPresetControls key={`${clip.engine}:${clip.effectId}`} project={project} clipId={clip.id} effectId={clip.effectId} engine={clip.engine} onCommand={onCommand}/>

    <section className="inspector-section"><div className="inspector-section-title"><strong>{t("inspector.timing")}</strong><small>TIMING</small></div><div className="timing-grid"><label><span>{t("inspector.start")}</span><input type="number" min={0} max={project.canvas.durationInFrames-1} defaultValue={clip.startFrame} key={`${clip.id}-start-${clip.startFrame}`} onBlur={event=>updateTiming({startFrame:Number(event.target.value)})}/></label><label><span>{t("inspector.duration")}</span><input type="number" min={1} max={project.canvas.durationInFrames} defaultValue={clip.durationInFrames} key={`${clip.id}-duration-${clip.durationInFrames}`} onBlur={event=>updateTiming({durationInFrames:Number(event.target.value)})}/></label></div></section>

    {effect?(["content","timing","style"] as const).map(group=>grouped[group].length?<section className="inspector-section" key={group}><div className="inspector-section-title"><strong>{t(`inspector.${group}`)}</strong><small>{group.toUpperCase()}</small></div>{grouped[group].map(renderField)}</section>:null):null}

    <section className="inspector-section motion-layout-section">
      <div className="inspector-section-title"><strong>{t("inspector.layout")}</strong><small>LAYOUT</small></div>
      <div className="layout-number-grid">
        <label><span>{t("layout.x")}</span><input type="number" defaultValue={transform.x} key={`${clip.id}-x-${transform.x}`} onBlur={event=>updateTransform({x:Number(event.target.value)})}/></label>
        <label><span>{t("layout.y")}</span><input type="number" defaultValue={transform.y} key={`${clip.id}-y-${transform.y}`} onBlur={event=>updateTransform({y:Number(event.target.value)})}/></label>
        <label><span>{t("layout.scale")}</span><input type="number" min={0.1} max={5} step={0.05} defaultValue={transform.scale} key={`${clip.id}-scale-${transform.scale}`} onBlur={event=>updateTransform({scale:Number(event.target.value)})}/></label>
        <label><span>{t("layout.opacity")}</span><input type="number" min={0} max={1} step={0.05} defaultValue={transform.opacity} key={`${clip.id}-opacity-${transform.opacity}`} onBlur={event=>updateTransform({opacity:Number(event.target.value)})}/></label>
      </div>
      <div className="anchor-control"><span>{t("layout.anchor")}</span><div className="anchor-grid">{anchorKeys.map(anchor=><button key={anchor} className={transform.anchor===anchor?"active":""} title={t(anchorI18n[anchor])} onClick={()=>updateTransform({anchor})}><i/></button>)}</div></div>
    </section>

    <section className="inspector-meta"><div><span>{t("inspector.engine")}</span><strong>{clip.engine==="remotion"?"Remotion":"HyperFrames"}</strong></div><div><span>{t("inspector.category")}</span><strong>{category}</strong></div></section>
    <button className="inspector-delete" onClick={()=>void onCommand({type:"remove-clip",clipId:clip.id},t("timeline.deleted")).then(()=>selectClip(null))}>▱ {t("inspector.delete")}</button>
  </div>;
};
