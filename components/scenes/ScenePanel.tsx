"use client";

import {useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {textEditingMessage} from "@/lib/i18n/text-editing";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import {buildAutoScenesTransaction,buildMergeSceneWithNextTransaction,buildSplitSceneTransaction} from "@/lib/scenes/model";
import {segmentText} from "@/lib/script/model";
import {SceneSemanticTypeSchema,type SceneSemanticType} from "@/schemas/scene";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useSelectionStore} from "@/store/selection-store";

type Props={project:Project;onProjectChange:(project:Project)=>void;onCommand:(command:ProjectCommand,message:string)=>Promise<void>};
const TYPES=SceneSemanticTypeSchema.options;

export const ScenePanel=({project,onProjectChange,onCommand}:Props)=>{
  const{locale}=useStudioPreferences();
  const msg=(key:Parameters<typeof textEditingMessage>[1])=>textEditingMessage(locale,key);
  const requestSeek=usePlayerStore(state=>state.requestSeek);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectScene=useSelectionStore(state=>state.selectScene);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);

  const applyTransaction=async(transaction:ProjectCommandTransaction)=>{
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/transactions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(transaction)});
      const data=await response.json() as {project?:Project;error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||"Scene transaction failed");
      onProjectChange(data.project);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const clearScenes=()=>{
    const script=structuredClone(project.script);
    for(const segment of script.segments)delete segment.sceneId;
    return applyTransaction({id:`clear-scenes-${Date.now()}`,label:"Clear Scenes",commands:[...project.scenes.map(scene=>({type:"remove-scene" as const,sceneId:scene.id})),{type:"set-script-document",script}]});
  };

  if(!project.script.segments.length)return <section className="scene-panel scene-empty"><div className="scene-panel-head"><small>SCENE</small><strong>{msg("scenes")}</strong></div><p>{msg("sceneEmpty")}</p></section>;

  const ordered=[...project.scenes].sort((a,b)=>a.startFrame-b.startFrame);
  return <section className="scene-panel">
    <div className="scene-panel-head"><div><small>SCENE</small><strong>{msg("scenes")}</strong><span>{ordered.length} {msg("sceneCount")}</span></div><div><button disabled={busy} onClick={()=>void applyTransaction(buildAutoScenesTransaction(project))}>{msg("sceneGenerate")}</button>{ordered.length?<button className="danger-lite" disabled={busy} onClick={()=>void clearScenes()}>{locale==="zh-CN"?"清空":"Clear"}</button>:null}</div></div>
    <p className="scene-panel-hint">{msg("sceneHint")}</p>
    {error?<p className="render-error">{error}</p>:null}
    <div className="scene-list">{ordered.map((scene,index)=>{
      const segments=project.script.segments.filter(segment=>segment.sceneId===scene.id&&segment.status==="active");
      return <article key={scene.id} className={selectedSceneId===scene.id?"selected":""}>
        <header onClick={()=>{selectScene(scene.id);requestSeek(scene.startFrame);}}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{scene.name}</strong><small>{scene.semanticType.toUpperCase()} · f{scene.startFrame}–{scene.endFrame}</small></div></header>
        <label><span>{msg("sceneRename")}</span><input defaultValue={scene.name} onBlur={event=>{const name=event.currentTarget.value.trim();if(name&&name!==scene.name)void onCommand({type:"update-scene",sceneId:scene.id,patch:{name}},msg("sceneUpdated"));}}/></label>
        <label><span>{msg("sceneType")}</span><select value={scene.semanticType} onChange={event=>void onCommand({type:"update-scene",sceneId:scene.id,patch:{semanticType:event.currentTarget.value as SceneSemanticType}},msg("sceneUpdated"))}>{TYPES.map(type=><option key={type} value={type}>{type.toUpperCase()}</option>)}</select></label>
        <div className="scene-segments">{segments.map((segment,segmentIndex)=><div key={segment.id}><span title={segmentText(segment)}>{segmentText(segment)}</span>{segmentIndex>0?<button disabled={busy} onClick={()=>void applyTransaction(buildSplitSceneTransaction(project,scene.id,segment.id))}>{msg("sceneSplit")}</button>:null}</div>)}</div>
        <footer><button disabled={busy||index===ordered.length-1} onClick={()=>void applyTransaction(buildMergeSceneWithNextTransaction(project,scene.id))}>{msg("sceneMerge")}</button></footer>
      </article>;
    })}</div>
  </section>;
};
