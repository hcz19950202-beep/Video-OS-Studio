"use client";

import {useState,type KeyboardEvent} from "react";
import type {ProjectCommand} from "@/lib/project/commands";
import {createCaptionLinkedStyleProperties,createMotionLinkedStyleProperties} from "@/lib/styles/resolve";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {m3Label} from "./m3-i18n";

const blurOnEnter=(event:KeyboardEvent<HTMLInputElement>)=>{if(event.key==="Enter")event.currentTarget.blur();};

export const LinkedStyleControls=({project,clip,onCommand}:{project:Project;clip:Extract<Clip,{type:"motion"|"caption"}>;onCommand:(command:ProjectCommand,message:string)=>Promise<void>})=>{
  const{locale}=useStudioPreferences();
  const label=(key:Parameters<typeof m3Label>[1])=>m3Label(locale,key);
  const[name,setName]=useState(clip.type==="motion"?label("motionStyle"):label("captionStyle"));
  const target=clip.type==="motion"?"motion":"caption";
  const styles=project.linkedStyles.filter(style=>style.target===target||(clip.type==="motion"&&style.target==="cta"));
  const current=clip.linkedStyleId?project.linkedStyles.find(style=>style.id===clip.linkedStyleId):undefined;
  const message=(en:string,zh:string)=>locale==="zh-CN"?zh:en;
  const create=async()=>{
    const now=new Date().toISOString();const id=`style-${target}-${Date.now()}`;
    const properties=clip.type==="motion"?createMotionLinkedStyleProperties(clip):createCaptionLinkedStyleProperties(clip);
    await onCommand({type:"add-linked-style",style:{id,name:name.trim()||`${target} style`,target,properties,createdAt:now,updatedAt:now}},message("Linked style created","联动样式已创建"));
    await onCommand({type:"assign-linked-style",clipId:clip.id,styleId:id},message("Linked style assigned","联动样式已绑定"));
  };
  const updateMotion=(key:"scale"|"opacity",value:number)=>{if(!current)return;const root=current.properties&&typeof current.properties==="object"?current.properties as Record<string,unknown>:{};const transform=root.transform&&typeof root.transform==="object"?root.transform as Record<string,unknown>:{};const existing=Number(transform[key]??1);if(value===existing)return;void onCommand({type:"update-linked-style",style:{...current,properties:{...root,transform:{...transform,[key]:value}},updatedAt:new Date().toISOString()}},message("Linked style updated","联动样式已更新"));};
  const updateCaption=(key:"fill"|"background"|"fontSize",value:string|number)=>{if(!current)return;const root=current.properties&&typeof current.properties==="object"?current.properties as Record<string,unknown>:{};const style=root.style&&typeof root.style==="object"?root.style as Record<string,unknown>:{};if(Object.is(style[key],value))return;void onCommand({type:"update-linked-style",style:{...current,properties:{...root,style:{...style,[key]:value}},updatedAt:new Date().toISOString()}},message("Linked style updated","联动样式已更新"));};
  const transform=current?.properties&&typeof current.properties==="object"&&"transform" in current.properties&&current.properties.transform&&typeof current.properties.transform==="object"?current.properties.transform as Record<string,unknown>:{};
  const captionStyle=current?.properties&&typeof current.properties==="object"&&"style" in current.properties&&current.properties.style&&typeof current.properties.style==="object"?current.properties.style as Record<string,unknown>:{};
  const scale=Number(transform.scale??1);const opacity=Number(transform.opacity??1);const fill=String(captionStyle.fill??project.brand.colors.text);const background=String(captionStyle.background??"rgba(0,0,0,.68)");const fontSize=Number(captionStyle.fontSize??50);
  return <section className="inspector-section">
    <div className="inspector-section-title"><strong>{label("linkedStyle")}</strong><small>{label("live").toUpperCase()}</small></div>
    <label className="inspector-field"><span>{label("style")}</span><select value={clip.linkedStyleId??""} onChange={event=>void onCommand({type:"assign-linked-style",clipId:clip.id,styleId:event.target.value||null},event.target.value?message("Linked style assigned","联动样式已绑定"):message("Linked style detached","已解除联动样式"))}><option value="">{label("none")}</option>{styles.map(style=><option key={style.id} value={style.id}>{style.name}</option>)}</select></label>
    {!current?<div className="inspector-linked-create"><input value={name} onChange={event=>setName(event.target.value)} placeholder={label("styleName")}/><button onClick={()=>void create()}>＋ {label("create")}</button></div>:clip.type==="motion"?<div className="layout-number-grid"><label><span>{label("styleScale")}</span><input type="number" min={.1} max={5} step={.05} defaultValue={scale} key={`${current.id}-scale-${scale}`} onKeyDown={blurOnEnter} onBlur={event=>updateMotion("scale",Number(event.target.value))}/></label><label><span>{label("styleOpacity")}</span><input type="number" min={0} max={1} step={.05} defaultValue={opacity} key={`${current.id}-opacity-${opacity}`} onKeyDown={blurOnEnter} onBlur={event=>updateMotion("opacity",Number(event.target.value))}/></label></div>:<><label className="inspector-field"><span>{label("fill")}</span><input type="color" defaultValue={fill} key={`${current.id}-fill-${fill}`} onBlur={event=>updateCaption("fill",event.target.value)}/></label><label className="inspector-field"><span>{label("background")}</span><input defaultValue={background} key={`${current.id}-background-${background}`} onKeyDown={blurOnEnter} onBlur={event=>updateCaption("background",event.target.value)}/></label><label className="inspector-field"><span>{label("fontSize")}</span><input type="number" min={12} max={240} defaultValue={fontSize} key={`${current.id}-fontSize-${fontSize}`} onKeyDown={blurOnEnter} onBlur={event=>updateCaption("fontSize",Number(event.target.value))}/></label></>}
    {current?<small className="inspector-help">{current.name} · {current.id}</small>:null}
  </section>;
};
