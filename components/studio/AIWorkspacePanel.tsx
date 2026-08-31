"use client";

import {useState} from "react";
import type {Project} from "@/schemas/project";
import {VisualPlannerPanel} from "@/components/planner/VisualPlannerPanel";
import {AgentWorkspacePanel} from "@/components/studio/AgentWorkspacePanel";
import {ProductionMissionPanel} from "@/components/studio/ProductionMissionPanel";
import missionStyles from "@/components/studio/ProductionMissionPanel.module.css";
import {WorkflowPanel} from "@/components/studio/WorkflowPanel";
import {useSelectionStore} from "@/store/selection-store";
import {useProjectStore} from "@/store/project-store";
import {publishProjectIfActive} from "@/lib/client/project-mutations";
import {getStudioMetrics} from "@/lib/studio/metrics";
import {describeCanvas} from "@/lib/canvas/aspect";
import {workflowMessages} from "@/lib/i18n/workflow";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type AdvancedView="mission"|"composer"|"workflow"|null;

export const AIWorkspacePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();
  const[advancedView,setAdvancedView]=useState<AdvancedView>(null);
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const metrics=getStudioMetrics(project);
  const canvas=describeCanvas(project.canvas.width,project.canvas.height);
  const selectedClip=project.tracks.flatMap(track=>track.clips).find(clip=>clip.id===selectedClipId);
  const selectedScene=project.scenes.find(scene=>scene.id===selectedSceneId);
  const zh=locale==="zh-CN";
  const workflowText=workflowMessages(locale);
  const publishProjectChange=(candidate:Project)=>{publishProjectIfActive(project.project.id,candidate,()=>useProjectStore.getState().project,onProjectChange);};

  return <div className="v21-ai-workspace" data-testid="unified-ai-workspace">
    <section className="v25-agent-entry-header">
      <div><small>AGENT-NATIVE WORKSPACE</small><strong>{zh?"统一 Agent 对话":"Unified Agent Conversation"}</strong><span>{zh?"默认直接对话；Mission / Composer / Workflow 只作为附加详情，不会中断当前 Agent turn。":"Conversation stays primary; Mission / Composer / Workflow open as additional detail without replacing the active Agent turn."}</span></div>
      <details className="v25-agent-advanced" data-testid="agent-advanced-disclosure">
        <summary>{zh?"高级":"Advanced"}</summary>
        <div className="v22-ai-mode-switch" aria-label={zh?"高级 Agent 详情":"Advanced Agent details"}>
          <button type="button" className={advancedView===null?"active":""} onClick={()=>setAdvancedView(null)}>{zh?"对话":"Conversation"}</button>
          <button type="button" className={advancedView==="mission"?"active":""} onClick={()=>setAdvancedView("mission")}>{zh?"任务详情":"Mission"}</button>
          <button type="button" className={advancedView==="composer"?"active":""} onClick={()=>setAdvancedView("composer")}>{workflowText.composer}</button>
          <button type="button" className={advancedView==="workflow"?"active":""} onClick={()=>setAdvancedView("workflow")}>{workflowText.workflow}</button>
        </div>
      </details>
    </section>

    <AgentWorkspacePanel key={`agent-${project.project.id}`} project={project} onProjectChange={publishProjectChange} onOpenMission={()=>setAdvancedView("mission")}/>

    {advancedView?<section className="v25-agent-advanced-detail" data-testid="agent-advanced-detail">
      <header><small>ADVANCED DETAIL</small><strong>{advancedView==="mission"?(zh?"任务详情":"Mission"):advancedView==="composer"?workflowText.composer:workflowText.workflow}</strong><button type="button" className="button secondary small" onClick={()=>setAdvancedView(null)}>{zh?"关闭详情":"Close detail"}</button></header>
      {advancedView==="mission"?<div className={missionStyles.root} data-testid="advanced-mission-detail"><ProductionMissionPanel key={`mission-${project.project.id}`} project={project}/></div>:null}
      {advancedView==="workflow"?<div data-testid="advanced-workflow-detail"><WorkflowPanel key={`workflow-${project.project.id}`} project={project} onProjectChange={publishProjectChange}/></div>:null}
      {advancedView==="composer"?<div data-testid="advanced-composer-detail">
        <section className="v21-ai-context">
          <header><small>ADVANCED · RULES DIRECTOR</small><strong>{zh?"Composer 详情":"Composer detail"}</strong></header>
          <div className="v21-ai-context-project"><strong>{project.project.name}</strong><span>{project.canvas.width}×{project.canvas.height} · {canvas.aspectLabel} · {project.canvas.fps} fps</span></div>
          <div className="scenario-starter-detail"><strong>{zh?"工作流起点":"Workflow Starter"} · {project.workflow.scenario}</strong><small>{zh?"导演意图":"Director intent"}: {project.workflow.starterPrompt||"—"}</small><small>{zh?"场景结构":"Scene taxonomy"}: {project.workflow.sceneTaxonomy.length?project.workflow.sceneTaxonomy.join(" → "):"—"}</small><small>{zh?"字幕建议":"Caption hint"}: {project.workflow.captionHint}</small><small>{zh?"视觉强度":"Visual intensity"}: {project.workflow.visualIntensity}</small></div>
          <div className="v21-reference-row">
            {selectedScene?<span>@Scene · {selectedScene.name}</span>:null}
            {selectedClip?<span>@{selectedClip.type} · {selectedClip.id}</span>:null}
            {selectedScriptRange?<span>@Transcript · {selectedScriptRange.startWordId} → {selectedScriptRange.endWordId}</span>:null}
            {!selectedScene&&!selectedClip&&!selectedScriptRange?<em>{zh?"从场景、脚本、时间轴或画布选择上下文":"Select context from Scenes, Script, Timeline or Canvas"}</em>:null}
          </div>
          <div className="v21-ai-metrics">
            <div><small>{zh?"卡片":"Cards"}</small><strong>{metrics.motionCards}</strong></div>
            <div><small>{zh?"密度":"Density"}</small><strong>{metrics.densityPerMinute.toFixed(1)}/min</strong></div>
            <div><small>{zh?"峰值":"Peak"}</small><strong>{metrics.peakConcurrency}</strong></div>
          </div>
          <p className="v21-ai-note">{zh?"Composer 继续使用已验收的 Rules Director；它是附加细节，不会替换或卸载统一 Agent 对话。":"Composer keeps the accepted Rules Director as additional detail without replacing or unmounting the unified Agent conversation."}</p>
        </section>
        <VisualPlannerPanel key={project.project.id} project={project} onProjectChange={publishProjectChange}/>
      </div>:null}
    </section>:null}
  </div>;
};
