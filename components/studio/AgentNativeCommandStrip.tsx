"use client";

import {useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useTimelineProjectActions} from "@/components/timeline/useTimelineProjectActions";
import {useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useProjectStore} from "@/store/project-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

const ProjectHistoryControls=({project}:{project:Project})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const{undo,redo}=useTimelineProjectActions(project);
  const undoCount=useHistoryStore(state=>state.undoStack.filter(entry=>entry.projectId===project.project.id).length);
  const redoCount=useHistoryStore(state=>state.redoStack.filter(entry=>entry.projectId===project.project.id).length);
  return <>
    <button type="button" disabled={undoCount===0} onClick={()=>void undo()} title={zh?"撤销最近一次项目修改":"Undo the latest project mutation"}>{zh?"撤销":"Undo"}</button>
    <button type="button" disabled={redoCount===0} onClick={()=>void redo()} title={zh?"重做最近一次项目修改":"Redo the latest project mutation"}>{zh?"重做":"Redo"}</button>
  </>;
};

export const AgentNativeCommandStrip=()=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const{layout,toggleLeft,toggleInspector,toggleTimeline,resetWorkspace}=useWorkspaceLayout();
  const[paletteOpen,setPaletteOpen]=useState(false);
  const run=(action:()=>void)=>{action();setPaletteOpen(false);};

  return <div className={styles.commandStrip} data-testid="agent-native-command-strip">
    <div className={styles.commandGroup}>
      {project?<ProjectHistoryControls project={project}/>:<><button type="button" disabled>{zh?"撤销":"Undo"}</button><button type="button" disabled>{zh?"重做":"Redo"}</button></>}
      <button type="button" onClick={toggleTimeline}>{layout.timelineCollapsed?(zh?"展开时间轴":"Show Timeline"):(zh?"收起时间轴":"Hide Timeline")}</button>
    </div>
    <div className={styles.commandGroup}>
      <span className={`${styles.connection} ${project?styles.connected:styles.disconnected}`} data-testid="project-connection-status">{project?(zh?"Project 已连接":"Project connected"):(zh?"无 Project":"No project")}</span>
      <div className={styles.paletteWrap}>
        <button type="button" aria-haspopup="menu" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(value=>!value)}>⌘ {zh?"命令":"Commands"}</button>
        {paletteOpen?<div className={styles.palette} role="menu">
          <button type="button" role="menuitem" onClick={()=>run(toggleLeft)}>{layout.leftCollapsed?(zh?"显示 Agent 工作区":"Show Agent Workspace"):(zh?"隐藏 Agent 工作区":"Hide Agent Workspace")}</button>
          <button type="button" role="menuitem" onClick={()=>run(toggleInspector)}>{layout.inspectorCollapsed?(zh?"显示 Context Dock":"Show Context Dock"):(zh?"隐藏 Context Dock":"Hide Context Dock")}</button>
          <button type="button" role="menuitem" onClick={()=>run(toggleTimeline)}>{layout.timelineCollapsed?(zh?"显示 Timeline":"Show Timeline"):(zh?"隐藏 Timeline":"Hide Timeline")}</button>
          <button type="button" role="menuitem" onClick={()=>run(resetWorkspace)}>{zh?"重置工作区布局":"Reset workspace layout"}</button>
        </div>:null}
      </div>
    </div>
  </div>;
};
