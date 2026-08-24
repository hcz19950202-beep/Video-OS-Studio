"use client";

import {useState} from "react";
import type {Project} from "@/schemas/project";
import {VisualPlannerPanel} from "@/components/planner/VisualPlannerPanel";
import {WorkflowPanel} from "@/components/studio/WorkflowPanel";
import {useSelectionStore} from "@/store/selection-store";
import {getStudioMetrics} from "@/lib/studio/metrics";
import {describeCanvas} from "@/lib/canvas/aspect";
import {workflowMessages} from "@/lib/i18n/workflow";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const AIWorkspacePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();const[mode,setMode]=useState<"composer"|"workflow">("composer");
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const metrics=getStudioMetrics(project);
  const canvas=describeCanvas(project.canvas.width,project.canvas.height);
  const selectedClip=project.tracks.flatMap(track=>track.clips).find(clip=>clip.id===selectedClipId);
  const selectedScene=project.scenes.find(scene=>scene.id===selectedSceneId);
  const zh=locale==="zh-CN";const workflowText=workflowMessages(locale);

  return <div className="v21-ai-workspace">
    <div className="v22-ai-mode-switch" role="tablist" aria-label={zh?"AI 工作模式":"AI workspace mode"}>
      <button type="button" role="tab" aria-selected={mode==="composer"} className={mode==="composer"?"active":""} onClick={()=>setMode("composer")}>{workflowText.composer}</button>
      <button type="button" role="tab" aria-selected={mode==="workflow"} className={mode==="workflow"?"active":""} onClick={()=>setMode("workflow")}>{workflowText.workflow}</button>
    </div>
    {mode==="workflow"?<WorkflowPanel key={`workflow-${project.project.id}`} project={project} onProjectChange={onProjectChange}/>:<>
      <section className="v21-ai-context">
        <header><small>AI COMPOSER · CONTEXT</small><strong>{zh?"导演上下文":"Director Context"}</strong></header>
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
        <p className="v21-ai-note">{zh?"Composer 保留已验收的 Rules Director：生成建议不会直接改 Project，Review / Diff / Apply / Transaction / Undo 安全链保持不变。":"Composer preserves the accepted Rules Director: suggestions do not mutate Project until Review / Diff / Apply, and the Transaction / Undo safety chain remains unchanged."}</p>
      </section>
      <VisualPlannerPanel key={project.project.id} project={project} onProjectChange={onProjectChange}/>
    </>}
  </div>;
};
