"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import type {RenderJob,RenderMode} from "@/lib/render/render-jobs";
import {resolveExportProfile,type ExportProfile} from "@/lib/render/profile";
import type {Project} from "@/schemas/project";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useProjectStore} from "@/store/project-store";

export const RENDER_REQUEST_EVENT="video-os-render-request";

const RenderControlsInner=({project}:{project:Project})=>{
  const{t,locale}=useStudioPreferences();const zh=locale==="zh-CN";
  const[job,setJob]=useState<RenderJob|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[showProfile,setShowProfile]=useState(false);
  const[profile,setProfile]=useState<ExportProfile>({sizing:"project",container:"mp4",codec:"h264",audio:"aac",quality:"high",fps:project.canvas.fps,width:project.canvas.width,height:project.canvas.height});
  useEffect(()=>{setProfile(current=>current.sizing==="project"?{...current,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps}:current);},[project.canvas.fps,project.canvas.height,project.canvas.width]);
  const resolved=useMemo(()=>resolveExportProfile(project,profile),[profile,project]);
  const start=useCallback(async(mode:RenderMode,requestedProfile?:ExportProfile)=>{
    setError(null);
    const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/renders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,...(mode==="final"&&requestedProfile?{profile:requestedProfile}:{})})});
    const data=await response.json() as {job?:RenderJob;error?:string};
    if(!response.ok||!data.job){setError(data.error||t("render.startError"));return;}
    setJob(data.job);setShowProfile(false);
  },[project.project.id,t]);
  useEffect(()=>{if(!job||job.status==="completed"||job.status==="failed")return;const timer=window.setInterval(async()=>{const response=await fetch(`/api/renders/${job.id}`,{cache:"no-store"});const data=await response.json() as {job?:RenderJob};if(data.job)setJob(data.job);},700);return()=>window.clearInterval(timer);},[job]);
  useEffect(()=>{const listener=()=>setShowProfile(true);window.addEventListener(RENDER_REQUEST_EVENT,listener);return()=>window.removeEventListener(RENDER_REQUEST_EVENT,listener);},[]);
  const setSizing=(sizing:"project"|"custom")=>setProfile(current=>sizing==="project"?{...current,sizing,width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps}:{...current,sizing,width:current.width??project.canvas.width,height:current.height??project.canvas.height,fps:current.fps??project.canvas.fps});

  return <div className="render-controls"><button disabled={job?.status==="running"} onClick={()=>void start("final",{sizing:"project",container:"mp4",codec:"h264",audio:"aac",quality:"high",fps:project.canvas.fps,width:project.canvas.width,height:project.canvas.height})}>↓ {t("render.final")}</button><button className="overlay-export" disabled={job?.status==="running"} onClick={()=>void start("overlay")}>◇ {t("render.overlay")}</button>{job?<span className={`render-status ${job.status}`}>{job.status} · {Math.round(job.progress*100)}%</span>:null}{job?.status==="completed"?<a href={`/api/renders/${job.id}/output`}>{t("render.download")}</a>:null}{job?.status==="failed"?<button onClick={()=>void start(job.mode,job.mode==="final"?profile:undefined)}>{t("render.retry")}</button>:null}{error?<span className="render-error">{error}</span>:null}
    {showProfile?<section className="export-profile-panel" role="dialog" aria-modal="true" aria-label={zh?"导出设置":"Export profile"}><header><div><small>EXPORT PROFILE</small><h3>{zh?"导出视频":"Export Video"}</h3></div><button onClick={()=>setShowProfile(false)} aria-label={zh?"关闭":"Close"}>×</button></header><p>{project.canvas.width}×{project.canvas.height} · {project.canvas.fps} fps → <strong>{resolved.width}×{resolved.height} · {resolved.fps} fps</strong></p><div className="export-grid"><label><span>{zh?"尺寸":"Sizing"}</span><select value={profile.sizing} onChange={event=>setSizing(event.target.value as"project"|"custom")}><option value="project">{zh?"使用项目画布":"Use Project Canvas"}</option><option value="custom">{zh?"自定义输出":"Custom Output"}</option></select></label><label><span>FPS</span><input type="number" min={1} max={120} value={profile.fps??project.canvas.fps} disabled={profile.sizing==="project"} onChange={event=>setProfile(current=>({...current,fps:Math.max(1,Math.min(120,Number(event.target.value)||project.canvas.fps))}))}/></label><label><span>{zh?"宽":"Width"}</span><input type="number" min={16} max={16384} value={profile.width??project.canvas.width} disabled={profile.sizing==="project"} onChange={event=>setProfile(current=>({...current,width:Math.max(16,Math.min(16384,Number(event.target.value)||project.canvas.width))}))}/></label><label><span>{zh?"高":"Height"}</span><input type="number" min={16} max={16384} value={profile.height??project.canvas.height} disabled={profile.sizing==="project"} onChange={event=>setProfile(current=>({...current,height:Math.max(16,Math.min(16384,Number(event.target.value)||project.canvas.height))}))}/></label><label><span>{zh?"容器 / 编码":"Container / Codec"}</span><select disabled value="mp4-h264"><option value="mp4-h264">MP4 · H.264</option></select></label><label><span>{zh?"音频":"Audio"}</span><select value={profile.audio} onChange={event=>setProfile(current=>({...current,audio:event.target.value as"aac"|"none"}))}><option value="aac">AAC</option><option value="none">{zh?"无音频":"Muted"}</option></select></label><label><span>{zh?"质量":"Quality"}</span><select value={profile.quality} onChange={event=>setProfile(current=>({...current,quality:event.target.value as ExportProfile["quality"]}))}><option value="draft">Draft</option><option value="standard">Standard</option><option value="high">High</option></select></label></div>{resolved.aspectMismatch?<p className="export-warning">{zh?"输出宽高比与项目画布不同。不会进行智能重构，内容可能发生裁切、留边或需要重新检查布局。":"Output aspect ratio differs from the Project Canvas. Smart reframe is not applied; content may crop, letterbox, or need layout review."}</p>:null}<button className="v21-primary" disabled={job?.status==="running"} onClick={()=>void start("final",profile)}>{zh?"开始导出":"Start Export"}</button></section>:null}
  </div>;
};

export const RenderControls=({projectId}:{projectId:string})=>{const project=useProjectStore(state=>state.project);return project&&project.project.id===projectId?<RenderControlsInner project={project}/>:null;};
