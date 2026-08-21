"use client";

import {useMemo,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import type {ProjectCommand} from "@/lib/project/commands";
import {textEditingMessage} from "@/lib/i18n/text-editing";
import {getSegmentSourceRange,mapSourceFrameToTimelineFrame,mapTimelineFrameToSourceFrame,segmentText} from "@/lib/script/model";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useSelectionStore} from "@/store/selection-store";

type Props={
  project:Project;
  onProjectChange:(project:Project)=>void;
  onCommand:(command:ProjectCommand,message:string)=>Promise<void>;
};

const TAGS=["keep","motion","broll","quote","cta"] as const;

export const ScriptEditor=({project,onProjectChange,onCommand}:Props)=>{
  const{locale}=useStudioPreferences();
  const msg=(key:Parameters<typeof textEditingMessage>[1])=>textEditingMessage(locale,key);
  const currentFrame=usePlayerStore(state=>state.currentFrame);
  const requestSeek=usePlayerStore(state=>state.requestSeek);
  const selectScriptRange=useSelectionStore(state=>state.selectScriptRange);
  const[showRemoved,setShowRemoved]=useState(true);
  const[busyId,setBusyId]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const sourceFrame=mapTimelineFrameToSourceFrame(project,currentFrame);
  const blocking=project.scenes.length>0||project.tracks.some(track=>track.type!=="video"&&track.clips.length>0);
  const segments=useMemo(()=>project.script.segments.filter(segment=>showRemoved||segment.status!=="removed"),[project.script.segments,showRemoved]);
  const wordCount=project.script.segments.reduce((sum,segment)=>sum+segment.words.length,0);

  const setStatus=async(segmentId:string,status:"active"|"removed")=>{
    setBusyId(segmentId);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/script/edit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({segmentId,status})});
      const data=await response.json() as {project?:Project;error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||"Script edit failed");
      onProjectChange(data.project);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusyId(null);}
  };

  const toggleTag=async(segmentId:string,tag:string)=>{
    const script=structuredClone(project.script);
    const segment=script.segments.find(item=>item.id===segmentId);
    if(!segment)return;
    segment.semanticTags=segment.semanticTags.includes(tag)?segment.semanticTags.filter(item=>item!==tag):[...segment.semanticTags,tag];
    await onCommand({type:"set-script-document",script},locale==="zh-CN"?"脚本标签已更新":"Script tags updated");
  };

  if(!project.script.segments.length)return <section className="script-editor script-empty">
    <div className="script-editor-head"><div><small>SCRIPT</small><strong>{msg("noScript")}</strong></div></div>
    <p>{msg("transcribe")}</p>
  </section>;

  return <section className="script-editor">
    <div className="script-editor-head">
      <div><small>SCRIPT</small><strong>{msg("scriptReady")}</strong><span>{project.script.segments.length} {msg("segments")} · {wordCount} {msg("words")}</span></div>
      <button onClick={()=>setShowRemoved(value=>!value)}>{showRemoved?msg("hideRemoved"):msg("showRemoved")}</button>
    </div>
    <p className="script-editor-hint">{msg("scriptStatus")} · {msg("seek")}</p>
    {blocking?<p className="script-lock-notice">{msg("editLocked")}</p>:null}
    {error?<p className="render-error">{error}</p>:null}
    <div className="script-segments">
      {segments.map((segment,index)=>{
        const removed=segment.status==="removed";
        const sourceRange=getSegmentSourceRange(segment);
        const timelineStart=sourceRange?mapSourceFrameToTimelineFrame(project,sourceRange.startFrame):null;
        const scene=segment.sceneId?project.scenes.find(item=>item.id===segment.sceneId):undefined;
        return <article key={segment.id} className={`script-segment ${removed?"is-removed":""}`}>
          <header>
            <div><span>{String(index+1).padStart(2,"0")}</span><small>{scene?.name??(timelineStart!==null?`f${timelineStart}`:"SOURCE")}</small></div>
            <button disabled={Boolean(busyId)||blocking} className={removed?"restore":"remove"} onClick={()=>void setStatus(segment.id,removed?"active":"removed")}>{busyId===segment.id?"…":removed?msg("restore"):msg("remove")}</button>
          </header>
          <p className="script-words" aria-label={segmentText(segment)}>{segment.words.map(word=>{
            const active=sourceFrame!==null&&sourceFrame>=word.startFrame&&sourceFrame<word.endFrame;
            const seek=mapSourceFrameToTimelineFrame(project,word.startFrame);
            return <button key={word.id} className={active?"current-word":""} disabled={removed||seek===null} onClick={()=>{selectScriptRange({startWordId:word.id,endWordId:word.id});if(seek!==null)requestSeek(seek);}}>{word.text}</button>;
          })}</p>
          <footer><small>{msg("tags")}</small><div>{TAGS.map(tag=><button key={tag} className={segment.semanticTags.includes(tag)?"active":""} onClick={()=>void toggleTag(segment.id,tag)}>{msg(tag)}</button>)}</div></footer>
        </article>;
      })}
    </div>
  </section>;
};
