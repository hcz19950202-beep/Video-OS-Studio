"use client";

import {useState} from "react";
import {ProjectRequestError,postProjectTransaction,publishProjectIfActive,reloadProject} from "@/lib/client/project-mutations";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {textEditingMessage} from "@/lib/i18n/text-editing";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import {buildAutoScenesTransaction,buildMergeSceneWithNextTransaction,buildSplitSceneTransaction} from "@/lib/scenes/model";
import {segmentText} from "@/lib/script/model";
import {SceneSemanticTypeSchema,type SceneSemanticType} from "@/schemas/scene";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useProjectStore} from "@/store/project-store";
import {useSelectionStore} from "@/store/selection-store";

type Props={project:Project;onProjectChange:(project:Project)=>void;onCommand:(command:ProjectCommand,message:string)=>Promise<void>};
const TYPES=SceneSemanticTypeSchema.options;
const TYPE_LABELS:Record<SceneSemanticType,{zh:string;en:string}>={hook:{zh:"钩子",en:"Hook"},pain:{zh:"痛点",en:"Pain"},problem:{zh:"问题",en:"Problem"},reframe:{zh:"重构",en:"Reframe"},solution:{zh:"方案",en:"Solution"},proof:{zh:"证明",en:"Proof"},process:{zh:"流程",en:"Process"},comparison:{zh:"对比",en:"Comparison"},cta:{zh:"行动号召",en:"CTA"},custom:{zh:"自定义",en:"Custom"}};
const INTENSITY_LABELS={low:{zh:"低",en:"Low"},medium:{zh:"中",en:"Medium"},high:{zh:"高",en:"High"}} as const;

export const ScenePanel=({project,onProjectChange,onCommand}:Props)=>{
  const{locale}=useStudioPreferences();const zh=locale==="zh-CN";const msg=(key:Parameters<typeof textEditingMessage>[1])=>textEditingMessage(locale,key);
  const requestSeek=usePlayerStore(state=>state.requestSeek);const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);const selectScene=useSelectionStore(state=>state.selectScene);
  const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
  const publishProjectChange=(candidate:Project)=>publishProjectIfActive(project.project.id,candidate,()=>useProjectStore.getState().project,onProjectChange);
  const applyTransaction=async(transaction:ProjectCommandTransaction)=>{setBusy(true);setError(null);try{const data=await postProjectTransaction(project,{label:transaction.label,commands:transaction.commands},transaction.id);publishProjectChange(data.project);}catch(caught){if(caught instanceof ProjectRequestError&&caught.code==="PROJECT_REVISION_CONFLICT"){try{const latest=await reloadProject(project.project.id);publishProjectChange(latest.project);}catch{}}setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const clearScenes=()=>{const script=structuredClone(project.script);for(const segment of script.segments)delete segment.sceneId;return applyTransaction({id:`clear-scenes-${Date.now()}`,label:"Clear Scenes",commands:[...project.scenes.map(scene=>({type:"remove-scene" as const,sceneId:scene.id})),{type:"set-script-document",script}]});};
  if(!project.script.segments.length)return <section className="scene-panel scene-empty"><div className="scene-panel-head"><small>SCENE</small><strong>{msg("scenes")}</strong></div><p>{msg("sceneEmpty")}</p></section>;
  const ordered=[...project.scenes].sort((a,b)=>a.startFrame-b.startFrame);
  return <section className="scene-panel">
    <div className="scene-panel-head"><div><small>SCENE</small><strong>{msg("scenes")}</strong><span>{ordered.length} {msg("sceneCount")}</span></div><div><button disabled={busy} onClick={()=>void applyTransaction(buildAutoScenesTransaction(project))}>{msg("sceneGenerate")}</button>{ordered.length?<button className="danger-lite" disabled={busy} onClick={()=>void clearScenes()}>{zh?"清空":"Clear"}</button>:null}</div></div>
    <p className="scene-panel-hint">{msg("sceneHint")}</p>{error?<p className="render-error">{error}</p>:null}
    <div className="scene-list">{ordered.map((scene,index)=>{const segments=project.script.segments.filter(segment=>segment.sceneId===scene.id&&segment.status==="active");const visualClips=project.tracks.flatMap(track=>track.clips).filter(clip=>(clip.type==="motion"||clip.type==="broll")&&clip.startFrame<scene.endFrame&&clip.startFrame+clip.durationInFrames>scene.startFrame);const intensity=scene.visualStrategy?.intensity??"medium";return <article key={scene.id} className={selectedSceneId===scene.id?"selected":""}>
      <header onClick={()=>{selectScene(scene.id);requestSeek(scene.startFrame);}}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{scene.name}</strong><small>f{scene.startFrame}–{scene.endFrame}</small><div className="v21-scene-meta"><em className={`v21-semantic-chip type-${scene.semanticType}`}>{zh?TYPE_LABELS[scene.semanticType].zh:TYPE_LABELS[scene.semanticType].en}</em><em>{zh?"视觉":"Visuals"} {visualClips.length}</em><em>{zh?"强度":"Intensity"} {zh?INTENSITY_LABELS[intensity].zh:INTENSITY_LABELS[intensity].en}</em></div></div></header>
      <label><span>{msg("sceneRename")}</span><input defaultValue={scene.name} onBlur={event=>{const name=event.currentTarget.value.trim();if(name&&name!==scene.name)void onCommand({type:"update-scene",sceneId:scene.id,patch:{name}},msg("sceneUpdated"));}}/></label>
      <div className="v21-scene-controls"><label><span>{msg("sceneType")}</span><select value={scene.semanticType} onChange={event=>void onCommand({type:"update-scene",sceneId:scene.id,patch:{semanticType:event.currentTarget.value as SceneSemanticType}},msg("sceneUpdated"))}>{TYPES.map(type=><option key={type} value={type}>{zh?TYPE_LABELS[type].zh:TYPE_LABELS[type].en}</option>)}</select></label><label><span>{zh?"视觉强度":"Visual intensity"}</span><select value={intensity} onChange={event=>void onCommand({type:"update-scene",sceneId:scene.id,patch:{visualStrategy:{intensity:event.currentTarget.value as "low"|"medium"|"high",preferredEngines:scene.visualStrategy?.preferredEngines??[]}}},msg("sceneUpdated"))}>{(["low","medium","high"] as const).map(value=><option key={value} value={value}>{zh?INTENSITY_LABELS[value].zh:INTENSITY_LABELS[value].en}</option>)}</select></label></div>
      {scene.summary?<p className="v21-scene-summary">{scene.summary}</p>:null}<div className="scene-segments">{segments.map((segment,segmentIndex)=><div key={segment.id}><span title={segmentText(segment)}>{segmentText(segment)}</span>{segmentIndex>0?<button disabled={busy} onClick={()=>void applyTransaction(buildSplitSceneTransaction(project,scene.id,segment.id))}>{msg("sceneSplit")}</button>:null}</div>)}</div><footer><button disabled={busy||index===ordered.length-1} onClick={()=>void applyTransaction(buildMergeSceneWithNextTransaction(project,scene.id))}>{msg("sceneMerge")}</button></footer>
    </article>;})}</div>
  </section>;
};
