"use client";

import {useMemo,type ReactNode} from "react";
import {ProductionContextSurface} from "@/components/studio/ProductionContextSurface";
import {ProjectHistorySurface} from "@/components/studio/ProjectHistorySurface";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useProjectStore} from "@/store/project-store";
import {useSelectionStore} from "@/store/selection-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

export type AgentNativeContextTab="inspector"|"assets"|"transcript"|"mission"|"qa"|"history";

type Props={inspector:ReactNode;tab:AgentNativeContextTab;onTabChange:(tab:AgentNativeContextTab)=>void;preferredMissionId?:string};

const tabs:Array<{id:AgentNativeContextTab;zh:string;en:string}>=[
  {id:"inspector",zh:"检查器",en:"Inspector"},
  {id:"assets",zh:"素材",en:"Assets"},
  {id:"transcript",zh:"转写",en:"Transcript"},
  {id:"mission",zh:"任务",en:"Mission"},
  {id:"qa",zh:"质检",en:"QA"},
  {id:"history",zh:"历史",en:"History"},
];

export const AgentNativeContextDock=({inspector,tab,onTabChange,preferredMissionId}:Props)=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const selectContextTarget=useSelectionStore(state=>state.selectContextTarget);
  const selectScriptRange=useSelectionStore(state=>state.selectScriptRange);
  const selectedContextTarget=useSelectionStore(state=>state.selectedContextTarget);
  const captionClips=useMemo(()=>project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption")??[],[project]);
  const transcriptWords=useMemo(()=>project?.script.segments.flatMap(segment=>segment.words.map(word=>({segmentId:segment.id,word}))).slice(0,150)??[],[project]);

  return <section className={styles.contextDock} data-testid="agent-context-dock">
    <header className={styles.contextHeader}>
      <div><strong>{zh?"上下文":"Context"}</strong><small>{project?.project.name??(zh?"未打开项目":"No project")}</small></div>
    </header>
    <div className={styles.contextTabs} role="tablist" aria-label={zh?"上下文面板":"Context dock"}>
      {tabs.map(item=><button type="button" key={item.id} role="tab" aria-selected={tab===item.id} className={tab===item.id?styles.active:""} onClick={()=>onTabChange(item.id)}>{zh?item.zh:item.en}</button>)}
    </div>
    <div className={styles.contextBody} data-context-tab={tab}>
      {tab==="inspector"?inspector:null}
      {tab==="assets"?<div className={styles.contextList}>{project?.assets.length?project.assets.map(asset=>{const label=asset.label??asset.originalName??asset.id;const selected=selectedContextTarget?.kind==="asset"&&selectedContextTarget.target.assetId===asset.id;return <article key={asset.id} data-context-selected={selected?"true":"false"}><strong>{label}</strong><span>{asset.kind}</span><button type="button" className="button secondary small" data-testid={`select-asset-context-${asset.id}`} onClick={()=>selectContextTarget({kind:"asset",label,target:{assetId:asset.id}})}>@ {zh?"选择上下文":"Select context"}</button></article>;}):<p>{zh?"当前项目还没有素材。":"No project assets yet."}</p>}</div>:null}
      {tab==="transcript"?<div className={styles.contextList}>{transcriptWords.length?transcriptWords.map(({segmentId,word})=>{const selected=selectedContextTarget?.kind==="transcript-range"&&selectedContextTarget.target.startWordId===word.id&&selectedContextTarget.target.endWordId===word.id;return <article key={`${segmentId}-${word.id}`} data-context-selected={selected?"true":"false"}><strong>f{word.startFrame}</strong><span>{word.text}</span><button type="button" className="button secondary small" data-testid={`select-transcript-context-${word.id}`} onClick={()=>selectScriptRange({startWordId:word.id,endWordId:word.id})}>@ {zh?"选择上下文":"Select context"}</button></article>;}):captionClips.length?captionClips.slice(0,150).map(clip=><article key={clip.id}><strong>f{clip.startFrame}</strong><span>{clip.text}</span></article>):<p>{zh?"当前项目还没有字幕或转写内容。":"No transcript or caption content yet."}</p>}</div>:null}
      {tab==="mission"?project?<ProductionContextSurface project={project} mode="mission" preferredMissionId={preferredMissionId}/>:<p>{zh?"打开项目后查看任务。":"Open a project to view missions."}</p>:null}
      {tab==="qa"?project?<ProductionContextSurface project={project} mode="qa" preferredMissionId={preferredMissionId}/>:<p>{zh?"打开项目后查看质检上下文。":"Open a project to view QA context."}</p>:null}
      {tab==="history"?project?<ProjectHistorySurface project={project}/>:<p>{zh?"打开项目后查看历史。":"Open a project to view History."}</p>:null}
    </div>
  </section>;
};
