"use client";

import {useMemo,useState,type ReactNode} from "react";
import {ProductionMissionPanel} from "@/components/studio/ProductionMissionPanel";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

type ContextTab="inspector"|"assets"|"transcript"|"mission"|"qa"|"history";

type Props={inspector:ReactNode};

const tabs:Array<{id:ContextTab;zh:string;en:string}>=[
  {id:"inspector",zh:"检查器",en:"Inspector"},
  {id:"assets",zh:"素材",en:"Assets"},
  {id:"transcript",zh:"转写",en:"Transcript"},
  {id:"mission",zh:"任务",en:"Mission"},
  {id:"qa",zh:"质检",en:"QA"},
  {id:"history",zh:"历史",en:"History"},
];

export const AgentNativeContextDock=({inspector}:Props)=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const undoStack=useHistoryStore(state=>state.undoStack);
  const redoStack=useHistoryStore(state=>state.redoStack);
  const[tab,setTab]=useState<ContextTab>("inspector");
  const projectId=project?.project.id;
  const undoEntries=useMemo(()=>undoStack.filter(entry=>entry.projectId===projectId).map(entry=>({label:entry.label})),[projectId,undoStack]);
  const redoEntries=useMemo(()=>redoStack.filter(entry=>entry.projectId===projectId).map(entry=>({label:entry.label})),[projectId,redoStack]);
  const captionClips=useMemo(()=>project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption")??[],[project]);
  const enabledClips=useMemo(()=>project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.enabled).length??0,[project]);

  return <section className={styles.contextDock} data-testid="agent-context-dock">
    <header className={styles.contextHeader}>
      <div><strong>{zh?"上下文":"Context"}</strong><small>{project?.project.name??(zh?"未打开项目":"No project")}</small></div>
    </header>
    <div className={styles.contextTabs} role="tablist" aria-label={zh?"上下文面板":"Context dock"}>
      {tabs.map(item=><button type="button" key={item.id} role="tab" aria-selected={tab===item.id} className={tab===item.id?styles.active:""} onClick={()=>setTab(item.id)}>{zh?item.zh:item.en}</button>)}
    </div>
    <div className={styles.contextBody} data-context-tab={tab}>
      {tab==="inspector"?inspector:null}
      {tab==="assets"?<div className={styles.contextList}>{project?.assets.length?project.assets.map(asset=><article key={asset.id}><strong>{asset.label??asset.originalName??asset.id}</strong><span>{asset.kind}</span></article>):<p>{zh?"当前项目还没有素材。":"No project assets yet."}</p>}</div>:null}
      {tab==="transcript"?<div className={styles.contextList}>{captionClips.length?captionClips.slice(0,150).map(clip=><article key={clip.id}><strong>f{clip.startFrame}</strong><span>{clip.text}</span></article>):<p>{zh?"当前项目还没有字幕或转写内容。":"No transcript or caption content yet."}</p>}</div>:null}
      {tab==="mission"?project?<ProductionMissionPanel project={project}/>:<p>{zh?"打开项目后查看任务。":"Open a project to view missions."}</p>:null}
      {tab==="qa"?<div className={styles.qaSummary}>{project?<><div><strong>{project.assets.length}</strong><span>{zh?"素材":"Assets"}</span></div><div><strong>{enabledClips}</strong><span>{zh?"启用片段":"Enabled clips"}</span></div><div><strong>{captionClips.length}</strong><span>{zh?"字幕片段":"Caption clips"}</span></div><p>{zh?"此处提供项目级快速健康视图；完整自动 QA 工作流将在统一任务层继续接入。":"This is the project-level health view; full automated QA remains owned by the unified mission layer."}</p></>:<p>{zh?"打开项目后查看质检上下文。":"Open a project to view QA context."}</p>}</div>:null}
      {tab==="history"?<div className={styles.historyPanel}><section><strong>{zh?"可撤销":"Undo"} · {undoEntries.length}</strong>{undoEntries.length?undoEntries.slice().reverse().slice(0,30).map((entry,index)=><span key={`${entry.label}-${index}`}>{entry.label}</span>):<p>{zh?"暂无历史记录。":"No history entries."}</p>}</section><section><strong>{zh?"可重做":"Redo"} · {redoEntries.length}</strong>{redoEntries.length?redoEntries.slice().reverse().slice(0,30).map((entry,index)=><span key={`${entry.label}-${index}`}>{entry.label}</span>):<p>{zh?"暂无重做记录。":"No redo entries."}</p>}</section></div>:null}
    </div>
  </section>;
};
