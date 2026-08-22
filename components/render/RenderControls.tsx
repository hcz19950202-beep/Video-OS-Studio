"use client";

import {useCallback,useEffect,useState} from "react";
import type {RenderJob,RenderMode} from "@/lib/render/render-jobs";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const RENDER_REQUEST_EVENT="video-os-render-request";

export const RenderControls=({projectId}:{projectId:string})=>{
  const{t}=useStudioPreferences();
  const[job,setJob]=useState<RenderJob|null>(null);
  const[error,setError]=useState<string|null>(null);
  const start=useCallback(async(mode:RenderMode)=>{
    setError(null);
    const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/renders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode})});
    const data=await response.json() as {job?:RenderJob;error?:string};
    if(!response.ok||!data.job){setError(data.error||t("render.startError"));return;}
    setJob(data.job);
  },[projectId,t]);
  useEffect(()=>{if(!job||job.status==="completed"||job.status==="failed")return;const timer=window.setInterval(async()=>{const response=await fetch(`/api/renders/${job.id}`,{cache:"no-store"});const data=await response.json() as {job?:RenderJob};if(data.job)setJob(data.job);},700);return()=>window.clearInterval(timer);},[job]);
  useEffect(()=>{const listener=(event:Event)=>{const mode=(event as CustomEvent<{mode?:RenderMode}>).detail?.mode??"final";void start(mode);};window.addEventListener(RENDER_REQUEST_EVENT,listener);return()=>window.removeEventListener(RENDER_REQUEST_EVENT,listener);},[start]);
  return <div className="render-controls"><button disabled={job?.status==="running"} onClick={()=>void start("final")}>↓ {t("render.final")}</button><button className="overlay-export" disabled={job?.status==="running"} onClick={()=>void start("overlay")}>◇ {t("render.overlay")}</button>{job?<span className={`render-status ${job.status}`}>{job.status} · {Math.round(job.progress*100)}%</span>:null}{job?.status==="completed"?<a href={`/api/renders/${job.id}/output`}>{t("render.download")}</a>:null}{job?.status==="failed"?<button onClick={()=>void start(job.mode)}>{t("render.retry")}</button>:null}{error?<span className="render-error">{error}</span>:null}</div>;
};
