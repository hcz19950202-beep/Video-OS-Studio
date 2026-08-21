"use client";

import {useState} from "react";
import type {ProjectCommand} from "@/lib/project/commands";
import {createCaptionLinkedStyleProperties,createMotionLinkedStyleProperties} from "@/lib/styles/resolve";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

export const LinkedStyleControls=({project,clip,onCommand}:{project:Project;clip:Extract<Clip,{type:"motion"|"caption"}>;onCommand:(command:ProjectCommand,message:string)=>Promise<void>})=>{
  const[name,setName]=useState(clip.type==="motion"?"Motion Style":"Caption Style");
  const target=clip.type==="motion"?"motion":"caption";
  const styles=project.linkedStyles.filter(style=>style.target===target||(clip.type==="motion"&&style.target==="cta"));
  const current=clip.linkedStyleId?project.linkedStyles.find(style=>style.id===clip.linkedStyleId):undefined;
  const create=async()=>{
    const now=new Date().toISOString();const id=`style-${target}-${Date.now()}`;
    const properties=clip.type==="motion"?createMotionLinkedStyleProperties(clip):createCaptionLinkedStyleProperties(clip);
    await onCommand({type:"add-linked-style",style:{id,name:name.trim()||`${target} style`,target,properties,createdAt:now,updatedAt:now}},"Linked style created");
    await onCommand({type:"assign-linked-style",clipId:clip.id,styleId:id},"Linked style assigned");
  };
  const updateMotion=(key:"scale"|"opacity",value:number)=>{if(!current)return;const root=current.properties&&typeof current.properties==="object"?current.properties as Record<string,unknown>:{};const transform=root.transform&&typeof root.transform==="object"?root.transform as Record<string,unknown>:{};void onCommand({type:"update-linked-style",style:{...current,properties:{...root,transform:{...transform,[key]:value}},updatedAt:new Date().toISOString()}},"Linked style updated");};
  const updateCaption=(key:"fill"|"background"|"fontSize",value:string|number)=>{if(!current)return;const root=current.properties&&typeof current.properties==="object"?current.properties as Record<string,unknown>:{};const style=root.style&&typeof root.style==="object"?root.style as Record<string,unknown>:{};void onCommand({type:"update-linked-style",style:{...current,properties:{...root,style:{...style,[key]:value}},updatedAt:new Date().toISOString()}},"Linked style updated");};
  const transform=current?.properties&&typeof current.properties==="object"&&"transform" in current.properties&&current.properties.transform&&typeof current.properties.transform==="object"?current.properties.transform as Record<string,unknown>:{};
  const captionStyle=current?.properties&&typeof current.properties==="object"&&"style" in current.properties&&current.properties.style&&typeof current.properties.style==="object"?current.properties.style as Record<string,unknown>:{};
  return <section className="inspector-section">
    <div className="inspector-section-title"><strong>Linked Style</strong><small>LIVE</small></div>
    <label className="inspector-field"><span>Style</span><select value={clip.linkedStyleId??""} onChange={event=>void onCommand({type:"assign-linked-style",clipId:clip.id,styleId:event.target.value||null},event.target.value?"Linked style assigned":"Linked style detached")}><option value="">None / 无</option>{styles.map(style=><option key={style.id} value={style.id}>{style.name}</option>)}</select></label>
    {!current?<div className="inspector-linked-create"><input value={name} onChange={event=>setName(event.target.value)} placeholder="Style name"/><button onClick={()=>void create()}>＋ Create</button></div>:clip.type==="motion"?<div className="layout-number-grid"><label><span>Style Scale</span><input type="number" min={.1} max={5} step={.05} value={Number(transform.scale??1)} onChange={event=>updateMotion("scale",Number(event.target.value))}/></label><label><span>Style Opacity</span><input type="number" min={0} max={1} step={.05} value={Number(transform.opacity??1)} onChange={event=>updateMotion("opacity",Number(event.target.value))}/></label></div>:<><label className="inspector-field"><span>Fill</span><input type="color" value={String(captionStyle.fill??project.brand.colors.text)} onChange={event=>updateCaption("fill",event.target.value)}/></label><label className="inspector-field"><span>Background</span><input value={String(captionStyle.background??"rgba(0,0,0,.68)")} onBlur={event=>updateCaption("background",event.target.value)}/></label><label className="inspector-field"><span>Font Size</span><input type="number" min={12} max={240} value={Number(captionStyle.fontSize??50)} onChange={event=>updateCaption("fontSize",Number(event.target.value))}/></label></>}
    {current?<small className="inspector-help">{current.name} · {current.id}</small>:null}
  </section>;
};
