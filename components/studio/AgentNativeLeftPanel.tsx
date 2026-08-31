"use client";

import {useCallback,useState,type ReactNode} from "react";
import {AgentWorkspacePanel} from "@/components/studio/AgentWorkspacePanel";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {publishProjectIfActive} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

type Surface="agent"|"tools";

type Props={
  legacyRail:ReactNode;
  legacyContent:ReactNode;
};

export const AgentNativeLeftPanel=({legacyRail,legacyContent}:Props)=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const setProject=useProjectStore(state=>state.setProject);
  const[surface,setSurface]=useState<Surface>("agent");

  const publishProjectChange=useCallback((candidate:Project)=>{
    const projectId=project?.project.id;
    if(!projectId)return;
    publishProjectIfActive(projectId,candidate,()=>useProjectStore.getState().project,setProject);
  },[project?.project.id,setProject]);

  return <section className={styles.leftPanel} data-testid="agent-native-workspace">
    <header className={styles.leftHeader}>
      <div>
        <strong>{zh?"Agent 工作区":"Agent Workspace"}</strong>
        <small>{zh?"对话、提案与工具活动":"Conversation, proposals and tool activity"}</small>
      </div>
      <div className={styles.segmented} role="tablist" aria-label={zh?"Agent 工作区视图":"Agent workspace view"}>
        <button type="button" role="tab" aria-selected={surface==="agent"} className={surface==="agent"?styles.active:""} onClick={()=>setSurface("agent")}>{zh?"Agent":"Agent"}</button>
        <button type="button" role="tab" aria-selected={surface==="tools"} className={surface==="tools"?styles.active:""} onClick={()=>setSurface("tools")}>{zh?"工具":"Tools"}</button>
      </div>
    </header>
    <div className={styles.leftBody}>
      <nav className={styles.legacyRail} aria-label={zh?"编辑工具":"Editing tools"} onClickCapture={()=>setSurface("tools")}>{legacyRail}</nav>
      <div className={styles.leftSurface}>
        {surface==="agent"?project?<AgentWorkspacePanel project={project} onProjectChange={publishProjectChange}/>:<div className={styles.emptyState}><strong>{zh?"打开项目后即可使用 Agent":"Open a project to use the Agent"}</strong><span>{zh?"可通过左侧 Project 工具新建或打开项目。":"Use the Project tool on the left to create or open a project."}</span></div>:<div className={styles.legacyContent}>{legacyContent}</div>}
      </div>
    </div>
  </section>;
};
