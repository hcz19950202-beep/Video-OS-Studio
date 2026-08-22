"use client";

import type {Project} from "@/schemas/project";
import {VisualPlannerPanel} from "@/components/planner/VisualPlannerPanel";
import {useSelectionStore} from "@/store/selection-store";
import {getStudioMetrics} from "@/lib/studio/metrics";
import {describeCanvas} from "@/lib/canvas/aspect";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const AIWorkspacePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const metrics=getStudioMetrics(project);
  const canvas=describeCanvas(project.canvas.width,project.canvas.height);
  const selectedClip=project.tracks.flatMap(track=>track.clips).find(clip=>clip.id===selectedClipId);
  const selectedScene=project.scenes.find(scene=>scene.id===selectedSceneId);
  const zh=locale==="zh-CN";

  return <div className="v21-ai-workspace">
    <section className="v21-ai-context">
      <header><small>AI COMPOSER · CONTEXT</small><strong>{zh?"导演上下文":"Director Context"}</strong></header>
      <div className="v21-ai-context-project"><strong>{project.project.name}</strong><span>{project.canvas.width}×{project.canvas.height} · {canvas.aspectLabel} · {project.canvas.fps} fps</span></div>
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
      <p className="v21-ai-note">{zh?"V2.1 复用已验收的 AI Director：分析、建议、解释、变更预览、确认、事务与撤销。此版本不引入新的 AI Provider 或广义命令代理。":"V2.1 reuses the accepted AI Director analyze/review/diff/apply transaction flow. No new AI provider or general-purpose command agent is introduced here."}</p>
    </section>
    <VisualPlannerPanel project={project} onProjectChange={onProjectChange}/>
  </div>;
};
