"use client";

import {useRef,useState,type ReactNode} from "react";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type Tab={id:string;zh:string;en:string;sectionIndex:number};
const registry:Record<string,Tab[]>={
  project:[{id:"brand",zh:"品牌",en:"Brand",sectionIndex:0},{id:"linked",zh:"联动",en:"Linked",sectionIndex:1}],
  video:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"media",zh:"媒体",en:"Media",sectionIndex:1},{id:"transform",zh:"变换",en:"Transform",sectionIndex:2}],
  caption:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"style",zh:"样式",en:"Style",sectionIndex:1},{id:"content",zh:"内容",en:"Content",sectionIndex:2}],
  motion:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"content",zh:"内容",en:"Content",sectionIndex:1},{id:"style",zh:"样式",en:"Style",sectionIndex:2},{id:"transform",zh:"变换",en:"Transform",sectionIndex:3}],
  broll:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"media",zh:"媒体/变换",en:"Media / Transform",sectionIndex:1}],
  audio:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"audio",zh:"音频",en:"Audio",sectionIndex:1}],
  scene:[{id:"scene",zh:"场景",en:"Scene",sectionIndex:0},{id:"strategy",zh:"视觉",en:"Visual",sectionIndex:1}],
  multi:[{id:"common",zh:"通用",en:"Common",sectionIndex:0},{id:"linked",zh:"联动",en:"Linked",sectionIndex:1}],
};

export const InspectorRegistryShell=({project,children}:{project:Project;children:ReactNode})=>{
  const{locale}=useStudioPreferences();const rootRef=useRef<HTMLDivElement>(null);const[active,setActive]=useState(0);
  const ids=useSelectionStore(state=>state.selectedClipIds);const sceneId=useSelectionStore(state=>state.selectedSceneId);
  const clip=ids.length===1?project.tracks.flatMap(track=>track.clips).find(item=>item.id===ids[0]):undefined;
  const context=ids.length>1?"multi":sceneId?"scene":clip?.type??"project";
  const tabs=registry[context]??registry.project;const zh=locale==="zh-CN";
  const go=(tab:Tab,index:number)=>{setActive(index);const sections=rootRef.current?.querySelectorAll<HTMLElement>(".inspector-section");sections?.[tab.sectionIndex]?.scrollIntoView({block:"start",behavior:"smooth"});};
  return <div className="v21-inspector-shell"><nav className="v21-inspector-nav" aria-label={zh?"参数分类":"Inspector categories"}>{tabs.map((tab,index)=><button key={tab.id} className={active===index?"active":""} title={zh?tab.zh:tab.en} onClick={()=>go(tab,index)}><span>{tab.id.slice(0,2).toUpperCase()}</span><small>{zh?tab.zh:tab.en}</small></button>)}</nav><div className="v21-inspector-content" ref={rootRef}>{children}</div></div>;
};
