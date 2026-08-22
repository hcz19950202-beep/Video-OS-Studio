"use client";

import {useRef,useState,type ReactNode} from "react";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type Tab={id:string;zh:string;en:string;selector?:string;sectionIndex?:number};
const section=(id:string)=>`[data-inspector-section="${id}"]`;
const registry:Record<string,Tab[]>={
  project:[{id:"canvas",zh:"画布",en:"Canvas",selector:section("canvas")},{id:"brand",zh:"品牌",en:"Brand",selector:section("brand")},{id:"linked",zh:"联动",en:"Linked",selector:section("linked")},{id:"workspace",zh:"工作区",en:"Workspace",selector:section("workspace")},{id:"render",zh:"渲染",en:"Render",selector:section("render")}],
  video:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"media",zh:"媒体",en:"Media",sectionIndex:1},{id:"transform",zh:"变换",en:"Transform",sectionIndex:2}],
  caption:[{id:"content",zh:"内容",en:"Content",selector:section("content")},{id:"typography",zh:"排版",en:"Typography",selector:section("typography")},{id:"style",zh:"样式",en:"Style",selector:section("style")},{id:"transform",zh:"布局",en:"Transform",selector:section("transform")},{id:"timing",zh:"时间",en:"Timing",selector:section("timing")},{id:"linked",zh:"联动",en:"Linked",selector:section("linked")}],
  motion:[{id:"content",zh:"内容",en:"Content",selector:section("content")},{id:"style",zh:"样式",en:"Style",selector:section("style")},{id:"transform",zh:"变换",en:"Transform",selector:section("transform")},{id:"animation",zh:"动画",en:"Animation",selector:section("animation")},{id:"timing",zh:"时间",en:"Timing",selector:section("timing")},{id:"linked",zh:"联动",en:"Linked",selector:section("linked")}],
  broll:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"media",zh:"媒体/变换",en:"Media / Transform",sectionIndex:1}],
  audio:[{id:"timing",zh:"时间",en:"Timing",sectionIndex:0},{id:"audio",zh:"音频",en:"Audio",sectionIndex:1}],
  scene:[{id:"scene",zh:"场景",en:"Scene",sectionIndex:0},{id:"strategy",zh:"视觉",en:"Visual",sectionIndex:1}],
  multi:[{id:"common",zh:"通用",en:"Common",sectionIndex:0},{id:"linked",zh:"联动",en:"Linked",sectionIndex:1}],
};

type ActiveState={context:string;index:number};
export const InspectorRegistryShell=({project,children}:{project:Project;children:ReactNode})=>{
  const{locale}=useStudioPreferences();const rootRef=useRef<HTMLDivElement>(null);const[chosen,setChosen]=useState<ActiveState>({context:"project",index:0});
  const ids=useSelectionStore(state=>state.selectedClipIds);const sceneId=useSelectionStore(state=>state.selectedSceneId);
  const clip=ids.length===1?project.tracks.flatMap(track=>track.clips).find(item=>item.id===ids[0]):undefined;
  const context=ids.length>1?"multi":sceneId?"scene":clip?.type??"project";
  const tabs=registry[context]??registry.project;const zh=locale==="zh-CN";const active=chosen.context===context&&chosen.index<tabs.length?chosen.index:0;
  const go=(tab:Tab,index:number)=>{setChosen({context,index});const root=rootRef.current;if(!root)return;const target=tab.selector?root.querySelector<HTMLElement>(tab.selector):root.querySelectorAll<HTMLElement>(".inspector-section")[tab.sectionIndex??0];target?.scrollIntoView({block:"start",behavior:"smooth"});};
  return <div className="v21-inspector-shell"><nav className="v21-inspector-nav" aria-label={zh?"参数分类":"Inspector categories"}>{tabs.map((tab,index)=><button key={tab.id} className={active===index?"active":""} title={zh?tab.zh:tab.en} onClick={()=>go(tab,index)}><span>{tab.id.slice(0,2).toUpperCase()}</span><small>{zh?tab.zh:tab.en}</small></button>)}</nav><div className="v21-inspector-content" ref={rootRef}>{children}</div></div>;
};