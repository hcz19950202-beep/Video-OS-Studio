"use client";

import {useCallback,type ReactNode} from "react";
import {AIWorkspacePanel} from "@/components/studio/AIWorkspacePanel";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {publishProjectIfActive} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

export type AgentNativeSurface="agent"|"tools";

type Props={legacyRail:ReactNode;legacyContent:ReactNode;surface:AgentNativeSurface;onSurfaceChange:(surface:AgentNativeSurface)=>void};

export const AgentNativeLeftPanel=({legacyRail,legacyContent,surface,onSurfaceChange}:Props)=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const setProject=useProjectStore(state=>state.setProject);

  const publishProjectChange=useCallback((candidate:Project)=>{
    const projectId=project?.project.id;
    if(!projectId)return;
    publishProjectIfActive(projectId,candidate,()=>useProjectStore.getState().project,setProject);
  },[project?.project.id,setProject]);

  return <section className={styles.leftPanel} data-testid="agent-native-workspace">
    <header className={styles.leftHeader}>
      <div><strong>{zh?"Agent 工作区":"Agent Workspace"}</strong><small>{zh?"统一对话、提案与生产状态":"Unified conversation, proposals and production state"}</small></div>
      <div className={styles.segmented} role="group" aria-label={zh?"Agent 工作区视图":"Agent workspace view"}>
        <button type="button" data-testid="agent-surface-toggle" aria-pressed={surface==="agent"} className={surface==="agent"?styles.active:""} onClick={()=>onSurfaceChange("agent")}>{zh?"Agent":"Agent"}</button>
        <button type="button" data-testid="tools-surface-toggle" aria-pressed={surface==="tools"} className={surface==="tools"?styles.active:""} onClick={()=>onSurfaceChange("tools")}>{zh?"工具":"Tools"}</button>
      </div>
    </header>
    <div className={styles.leftBody}>
      <nav className={styles.legacyRail} aria-label={zh?"编辑工具":"Editing tools"} onClickCapture={()=>onSurfaceChange("tools")}>{legacyRail}</nav>
      <div className={styles.leftSurface}>
        {surface==="agent"?project?<AIWorkspacePanel project={project} onProjectChange={publishProjectChange}/>:<div className={styles.emptyState}><strong>{zh?"打开项目后即可使用 Agent":"Open a project to use the Agent"}</strong><span>{zh?"可通过左侧 Project 工具新建或打开项目。":"Use the Project tool on the left to create or open a project."}</span></div>:<div className={styles.legacyContent}>{legacyContent}</div>}
      </div>
    </div>
  </section>;
};
