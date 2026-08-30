"use client";

import {useMemo,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {createOperationId,parseProjectResponse,publishProjectIfActive} from "@/lib/client/project-mutations";
import type {ProjectCommand} from "@/lib/project/commands";
import {textEditingMessage} from "@/lib/i18n/text-editing";
import {getSegmentSourceRange,mapSourceFrameToTimelineFrame,segmentText} from "@/lib/script/model";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useProjectStore} from "@/store/project-store";
import {useScriptPlaybackStore} from "@/store/script-playback-store";
import {useSelectionStore} from "@/store/selection-store";
import {ScriptPlaybackBridge} from "./ScriptPlaybackBridge";

type Props={project:Project;onProjectChange:(project:Project)=>void;onCommand:(command:ProjectCommand,message:string)=>Promise<void>};
const TAGS=["keep","motion","broll","quote","cta"] as const;
const SCENE_LABELS:Record<string,{zh:string;en:string}>={hook:{zh:"钩子",en:"Hook"},pain:{zh:"痛点",en:"Pain"},problem:{zh:"问题",en:"Problem"},reframe:{zh:"重构",en:"Reframe"},solution:{zh:"方案",en:"Solution"},proof:{zh:"证明",en:"Proof"},process:{zh:"流程",en:"Process"},comparison:{zh:"对比",en:"Comparison"},cta:{zh:"行动",en:"CTA"},custom:{zh:"自定义",en:"Custom"}};

type ScriptWordButtonProps={projectId:string;wordId:string;text:string;removed:boolean;seek:number|null;onSelect:(wordId:string,seek:number|null)=>void};
const ScriptWordButton=({projectId,wordId,text,removed,seek,onSelect}:ScriptWordButtonProps)=>{
  const active=useScriptPlaybackStore(state=>state.activeWordKey===`${projectId}:${wordId}`);
  return <button className={active?"current-word":""} disabled={removed||seek===null} onClick={()=>onSelect(wordId,seek)}>{text}</button>;
};

export const ScriptEditor=({project,onProjectChange,onCommand}:Props)=>{
  const{locale}=useStudioPreferences();const zh=locale==="zh-CN";const msg=(key:Parameters<typeof textEditingMessage>[1])=>textEditingMessage(locale,key);
  const requestSeek=usePlayerStore(state=>state.requestSeek);const selectScriptRange=useSelectionStore(state=>state.selectScriptRange);
  const[showRemoved,setShowRemoved]=useState(true);const[busyId,setBusyId]=useState<string|null>(null);const[error,setError]=useState<string|null>(null);const[query,setQuery]=useState("");
  const blocking=project.scenes.length>0||project.tracks.some(track=>track.type!=="video"&&track.clips.length>0);
  const segments=useMemo(()=>{const needle=query.trim().toLocaleLowerCase();return project.script.segments.filter(segment=>(showRemoved||segment.status!=="removed")&&(!needle||segmentText(segment).toLocaleLowerCase().includes(needle)));},[project.script.segments,showRemoved,query]);
  const wordCount=project.script.segments.reduce((sum,segment)=>sum+segment.words.length,0);
  const publishProjectChange=(candidate:Project)=>{publishProjectIfActive(project.project.id,candidate,()=>useProjectStore.getState().project,onProjectChange);};

  const setStatus=async(segmentId:string,status:"active"|"removed")=>{setBusyId(segmentId);setError(null);try{const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/script/edit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedRevision:project.project.revision,operationId:createOperationId("script"),segmentId,status})});const data=await parseProjectResponse<{project:Project}>(response);publishProjectChange(data.project);}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusyId(null);}};
  const toggleTag=async(segmentId:string,tag:string)=>{const script=structuredClone(project.script);const segment=script.segments.find(item=>item.id===segmentId);if(!segment)return;segment.semanticTags=segment.semanticTags.includes(tag)?segment.semanticTags.filter(item=>item!==tag):[...segment.semanticTags,tag];await onCommand({type:"set-script-document",script},zh?"脚本标签已更新":"Script tags updated");};
  const selectWord=(wordId:string,seek:number|null)=>{selectScriptRange({startWordId:wordId,endWordId:wordId});if(seek!==null)requestSeek(seek);};

  if(!project.script.segments.length)return <section className="script-editor script-empty"><div className="script-editor-head"><div><small>SCRIPT</small><strong>{msg("noScript")}</strong></div></div><p>{msg("transcribe")}</p></section>;

  return <section className="script-editor">
    <ScriptPlaybackBridge project={project}/>
    <div className="script-editor-head"><div><small>SCRIPT</small><strong>{msg("scriptReady")}</strong><span>{project.script.segments.length} {msg("segments")} · {wordCount} {msg("words")}</span></div><button onClick={()=>setShowRemoved(value=>!value)}>{showRemoved?msg("hideRemoved"):msg("showRemoved")}</button></div>
    <div className="v21-script-search"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={zh?"搜索脚本内容…":"Search transcript…"} aria-label={zh?"搜索脚本":"Search transcript"}/>{query?<button onClick={()=>setQuery("")}>{zh?"清除":"Clear"}</button>:null}</div>
    <p className="script-editor-hint">{msg("scriptStatus")} · {msg("seek")}{query?` · ${segments.length} ${zh?"条结果":"matches"}`:""}</p>
    {blocking?<p className="script-lock-notice">{msg("editLocked")}</p>:null}{error?<p className="render-error">{error}</p>:null}
    <div className="script-segments">{segments.map((segment,index)=>{const removed=segment.status==="removed";const sourceRange=getSegmentSourceRange(segment);const timelineStart=sourceRange?mapSourceFrameToTimelineFrame(project,sourceRange.startFrame):null;const scene=segment.sceneId?project.scenes.find(item=>item.id===segment.sceneId):undefined;const sceneLabel=scene?SCENE_LABELS[scene.semanticType]:undefined;return <article key={segment.id} className={`script-segment ${removed?"is-removed":""}`}>
      <header><div><span>{String(index+1).padStart(2,"0")}</span><small>{scene?.name??(timelineStart!==null?`f${timelineStart}`:"SOURCE")}</small>{scene?<em className={`v21-semantic-chip type-${scene.semanticType}`}>{zh?sceneLabel?.zh:sceneLabel?.en}</em>:null}</div><button disabled={Boolean(busyId)||blocking} className={removed?"restore":"remove"} onClick={()=>void setStatus(segment.id,removed?"active":"removed")}>{busyId===segment.id?"…":removed?msg("restore"):msg("remove")}</button></header>
      <p className="script-words" aria-label={segmentText(segment)}>{segment.words.map(word=>{const seek=mapSourceFrameToTimelineFrame(project,word.startFrame);return <ScriptWordButton key={word.id} projectId={project.project.id} wordId={word.id} text={word.text} removed={removed} seek={seek} onSelect={selectWord}/>;})}</p>
      <footer><small>{msg("tags")}</small><div>{TAGS.map(tag=><button key={tag} className={segment.semanticTags.includes(tag)?"active":""} onClick={()=>void toggleTag(segment.id,tag)}>{msg(tag)}</button>)}</div></footer>
    </article>;})}{!segments.length?<p className="v21-empty-filter">{zh?"没有匹配的脚本内容。":"No transcript matches."}</p>:null}</div>
  </section>;
};
