"use client";

import {useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useTimelineProjectActions} from "@/components/timeline/useTimelineProjectActions";
import {ConnectionCenter} from "@/components/studio/ConnectionCenter";
import {useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

type Props={onOpenProjects:()=>void;onOpenCampaigns:()=>void;onOpenHistory:()=>void};

const ProjectHistoryControls=({project}:{project:Project})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const{undo,redo}=useTimelineProjectActions(project);
  const undoCount=useHistoryStore(state=>state.undoStack.filter(entry=>entry.projectId===project.project.id).length);
  const redoCount=useHistoryStore(state=>state.redoStack.filter(entry=>entry.projectId===project.project.id).length);
  return <>
    <button type="button" disabled={undoCount===0} onClick={()=>void undo()} aria-label={zh?"撤销最近修改":"Undo latest change"}>{zh?"撤销":"Undo"}</button>
    <button type="button" disabled={redoCount===0} onClick={()=>void redo()} aria-label={zh?"重做最近修改":"Redo latest change"}>{zh?"重做":"Redo"}</button>
  </>;
};

export const AgentNativeCommandStrip=({onOpenProjects,onOpenCampaigns,onOpenHistory}:Props)=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const{layout,toggleLeft,toggleInspector,toggleTimeline,resetWorkspace}=useWorkspaceLayout();
  const[paletteOpen,setPaletteOpen]=useState(false);
  const run=(action:()=>void)=>{action();setPaletteOpen(false);};

  return <div className={styles.commandStrip} data-testid="agent-native-command-strip">
    <div className={styles.commandGroup}>
      <button type="button" data-testid="open-projects" onClick={onOpenProjects}>{zh?"← 项目":"← Projects"}</button>
      <button type="button" data-testid="open-campaigns" onClick={onOpenCampaigns}>{zh?"Campaigns":"Campaigns"}</button>
      {project?<ProjectHistoryControls project={project}/>:<><button type="button" disabled>{zh?"撤销":"Undo"}</button><button type="button" disabled>{zh?"重做":"Redo"}</button></>}
      <button type="button" data-testid="open-history" disabled={!project} onClick={onOpenHistory}>{zh?"版本 / 历史":"Versions / History"}</button>
      <button type="button" onClick={toggleTimeline}>{layout.timelineCollapsed?(zh?"展开时间轴":"Show Timeline"):(zh?"收起时间轴":"Hide Timeline")}</button>
    </div>
    <div className={styles.commandGroup}>
      <span className={`${styles.connection} ${project?styles.connected:styles.disconnected}`} data-testid="project-connection-status">{project?(zh?"Project 已连接":"Project connected"):(zh?"无 Project":"No project")}</span>
      <ConnectionCenter/>
      <div className={styles.paletteWrap}>
        <button type="button" aria-haspopup="menu" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(value=>!value)}>⌘ {zh?"命令":"Commands"}</button>
        {paletteOpen?<div className={styles.palette} role="menu">
          <button type="button" role="menuitem" onClick={()=>run(onOpenProjects)}>{zh?"打开项目列表":"Open Projects"}</button>
          <button type="button" role="menuitem" onClick={()=>run(onOpenCampaigns)}>{zh?"打开 Campaigns":"Open Campaigns"}</button>
          <button type="button" role="menuitem" disabled={!project} onClick={()=>run(onOpenHistory)}>{zh?"打开版本 / 历史":"Open Versions / History"}</button>
          <button type="button" role="menuitem" onClick={()=>run(toggleLeft)}>{layout.leftCollapsed?(zh?"显示 Agent 工作区":"Show Agent Workspace"):(zh?"隐藏 Agent 工作区":"Hide Agent Workspace")}</button>
          <button type="button" role="menuitem" onClick={()=>run(toggleInspector)}>{layout.inspectorCollapsed?(zh?"显示 Context Dock":"Show Context Dock"):(zh?"隐藏 Context Dock":"Hide Context Dock")}</button>
          <button type="button" role="menuitem" onClick={()=>run(toggleTimeline)}>{layout.timelineCollapsed?(zh?"显示 Timeline":"Show Timeline"):(zh?"隐藏 Timeline":"Hide Timeline")}</button>
          <button type="button" role="menuitem" onClick={()=>run(resetWorkspace)}>{zh?"重置工作区布局":"Reset workspace layout"}</button>
        </div>:null}
      </div>
    </div>
  </div>;
};