"use client";

import {useCallback,useMemo,useRef,useState} from "react";
import {StudioPreview} from "@/components/player/StudioPreview";
import {Timeline} from "@/components/timeline/Timeline";
import {EffectLibrary} from "@/components/library/EffectLibrary";
import {EffectInspector} from "@/components/inspector/EffectInspector";
import {StudioPreferencesProvider,useStudioPreferences} from "@/components/i18n/StudioPreferences";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectSummary} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import {usePlayerStore} from "@/store/player-store";
import {useSelectionStore} from "@/store/selection-store";
import {formatStudioTime,getStudioMetrics} from "@/lib/studio/metrics";

type ApiError={error?:string;action?:string;retryable?:boolean};
type ErrorState={message:string;action?:string;retryable:boolean}|null;
type WorkspaceTab="edit"|"effects";
type LeftTab="cards"|"captions";

const requestJson=async<T,>(url:string,init?:RequestInit):Promise<T>=>{
  const response=await fetch(url,init);
  const payload=(await response.json()) as T&ApiError;
  if(!response.ok){
    const error=new Error(payload.error||`Request failed with status ${response.status}`);
    Object.assign(error,{action:payload.action,retryable:payload.retryable});
    throw error;
  }
  return payload;
};

const toErrorState=(error:unknown):ErrorState=>({
  message:error instanceof Error?error.message:String(error),
  action:error instanceof Error&&"action" in error?String((error as Error&{action?:string}).action||""):undefined,
  retryable:error instanceof Error&&"retryable" in error?Boolean((error as Error&{retryable?:boolean}).retryable):true
});

const StudioWorkspaceInner=({initialProjects}:{initialProjects:ProjectSummary[]})=>{
  const{locale,theme,t,toggleLocale,toggleTheme}=useStudioPreferences();
  const project=useProjectStore(s=>s.project);
  const setProject=useProjectStore(s=>s.setProject);
  const currentFrame=usePlayerStore(s=>s.currentFrame);
  const selectedClipId=useSelectionStore(s=>s.selectedClipId);
  const[projects,setProjects]=useState(initialProjects);
  const[newProjectName,setNewProjectName]=useState("Untitled Video");
  const[busy,setBusy]=useState<string|null>(null);
  const[notice,setNotice]=useState(t("app.status.ready"));
  const[error,setError]=useState<ErrorState>(null);
  const[lastUpload,setLastUpload]=useState<File|null>(null);
  const[workspaceTab,setWorkspaceTab]=useState<WorkspaceTab>("edit");
  const[leftTab,setLeftTab]=useState<LeftTab>("cards");
  const fileInputRef=useRef<HTMLInputElement>(null);
  const renameInputRef=useRef<HTMLInputElement>(null);

  const metrics=useMemo(()=>project?getStudioMetrics(project):null,[project]);
  const selectedClip=project?.tracks.flatMap(track=>track.clips).find(clip=>clip.id===selectedClipId);
  const totalFrame=project?Math.max(0,project.canvas.durationInFrames-1):0;

  const refreshRecent=useCallback(async()=>{
    const data=await requestJson<{projects:ProjectSummary[]}>("/api/projects",{cache:"no-store"});
    setProjects(data.projects);
  },[]);

  const run=async(label:string,op:()=>Promise<void>)=>{
    setBusy(label);setError(null);
    try{await op();}catch(caught){setError(toErrorState(caught));}finally{setBusy(null);}
  };

  const createNewProject=()=>run(t("status.creating"),async()=>{
    const data=await requestJson<{project:Project}>("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newProjectName})});
    setProject(data.project);setNotice(t("status.projectCreated"));await refreshRecent();
  });

  const openProject=(id:string)=>run(t("status.opening"),async()=>{
    const data=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(id)}`,{cache:"no-store"});
    setProject(data.project);setNotice(t("status.projectRestored"));
  });

  const persistCommand=(command:ProjectCommand,message:string)=>{
    if(!project)return Promise.resolve();
    return run(t("status.saving"),async()=>{
      const data=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(project.project.id)}/commands`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
      setProject(data.project);setNotice(message);await refreshRecent();
    });
  };

  const renameProject=()=>{
    const name=renameInputRef.current?.value.trim();
    return!project||!name||name===project.project.name?Promise.resolve():persistCommand({type:"rename-project",name},t("status.projectRenamed"));
  };

  const saveProject=()=>{
    if(!project)return Promise.resolve();
    return run(t("status.saving"),async()=>{
      const data=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(project.project.id)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(project)});
      setProject(data.project);setNotice(t("status.projectSaved"));await refreshRecent();
    });
  };

  const exportProjectJson=()=>{
    if(!project)return;
    const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;anchor.download=`${project.project.id}.json`;anchor.click();
    URL.revokeObjectURL(url);
  };

  const uploadFile=(file:File)=>{
    if(!project)return Promise.resolve();
    setLastUpload(file);
    return run(`${t("status.importing")} ${file.name}`,async()=>{
      const form=new FormData();form.set("file",file);
      const data=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(project.project.id)}/media`,{method:"POST",body:form});
      setProject(data.project);
      setNotice(file.name.toLowerCase().endsWith(".mp4")?t("status.importedVideo"):t("status.importedSubtitle"));
      await refreshRecent();
    });
  };

  const motionClips=project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="motion")??[];
  const captionClips=project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption")??[];

  return <main className="overlay-studio">
    <input ref={fileInputRef} className="sr-only" type="file" accept="video/mp4,.mp4,application/x-subrip,.srt,text/vtt,.vtt" onChange={event=>{const file=event.target.files?.[0];event.currentTarget.value="";if(file)void uploadFile(file);}}/>

    <header className="os-topbar">
      <div className="os-brand"><strong>{t("app.brand")}</strong><span>v1.1</span></div>
      <nav className="os-workspace-tabs">
        <button className={workspaceTab==="edit"?"active":""} onClick={()=>setWorkspaceTab("edit")}>{t("app.edit")}</button>
        <button className={workspaceTab==="effects"?"active":""} onClick={()=>setWorkspaceTab("effects")}>{t("app.effects")}</button>
      </nav>
      <div className="os-metrics">
        <div><small>{t("metric.time")}</small><strong>{project?formatStudioTime(currentFrame,project.canvas.fps):"00:00.0"}<em>/ {project?formatStudioTime(totalFrame,project.canvas.fps):"00:00.0"}</em></strong></div>
        <div><small>{t("metric.cards")}</small><strong>{metrics?.motionCards??0}<em>/ 50</em></strong></div>
        <div><small>{t("metric.density")}</small><strong className="accent-metric">{metrics?metrics.densityPerMinute.toFixed(1):"0.0"}<em>/ min</em></strong></div>
        <div><small>{t("metric.peak")}</small><strong>{metrics?.peakConcurrency??0}</strong></div>
        <div className="metric-selection"><small>{t("metric.selected")}</small><strong>{selectedClip?selectedClip.id.slice(0,18):t("metric.none")}</strong></div>
      </div>
      <div className="os-top-actions">
        <button className="os-ghost" onClick={toggleLocale}>{locale==="zh-CN"?"EN":"中文"}</button>
        <button className="os-ghost" onClick={toggleTheme}>{theme==="dark"?`☀ ${t("app.theme.light")}`:`☾ ${t("app.theme.dark")}`}</button>
        <button className="os-ghost" disabled={!project} onClick={exportProjectJson}>{t("app.exportJson")}</button>
        <button className="os-ghost" disabled={!project||Boolean(busy)} onClick={()=>void saveProject()}>{t("app.save")}</button>
        <button className="os-primary" disabled={!project||Boolean(busy)} onClick={()=>fileInputRef.current?.click()}>↓ {t("app.importVideo")}</button>
      </div>
    </header>

    {error?<div className="error-banner os-error" role="alert"><div><strong>{error.message}</strong>{error.action?<span>{error.action}</span>:null}</div>{error.retryable&&lastUpload&&project?<button className="button danger" onClick={()=>void uploadFile(lastUpload)}>Retry</button>:null}</div>:null}

    <div className="os-shell">
      <aside className="os-left-panel">
        <div className="os-left-tabs">
          <button className={leftTab==="cards"?"active":""} onClick={()=>setLeftTab("cards")}>{t("left.cards")} <span>{motionClips.length}</span></button>
          <button className={leftTab==="captions"?"active":""} onClick={()=>setLeftTab("captions")}>{t("left.captions")} <span>{captionClips.length}</span></button>
        </div>

        <div className="os-left-scroll">
          <section className="os-section">
            <div className="os-section-title"><span>{t("left.global")}</span><small>GLOBAL</small></div>
            <div className="os-theme-switch"><button className={theme==="light"?"active":""} onClick={()=>theme!=="light"&&toggleTheme()}>☀ {t("app.theme.light")}</button><button className={theme==="dark"?"active":""} onClick={()=>theme!=="dark"&&toggleTheme()}>☾ {t("app.theme.dark")}</button></div>
            <label className="os-field"><span>{t("left.canvas")}</span><div className="segmented os-segmented"><button disabled={!project} className={project?.canvas.width===1080&&project.canvas.height===1920?"active":""} onClick={()=>void persistCommand({type:"set-canvas",width:1080,height:1920},t("status.canvas"))}>9:16</button><button disabled={!project} className={project?.canvas.width===1920&&project.canvas.height===1080?"active":""} onClick={()=>void persistCommand({type:"set-canvas",width:1920,height:1080},t("status.canvas"))}>16:9</button><button disabled={!project} className={project?.canvas.width===1080&&project.canvas.height===1080?"active":""} onClick={()=>void persistCommand({type:"set-canvas",width:1080,height:1080},t("status.canvas"))}>1:1</button></div></label>
          </section>

          <section className="os-section">
            <div className="os-section-title"><span>{t("left.project")}</span><small>PROJECT</small></div>
            <label className="os-field"><span>{t("left.newProject")}</span><div className="os-inline"><input value={newProjectName} onChange={event=>setNewProjectName(event.target.value)}/><button disabled={!newProjectName.trim()||Boolean(busy)} onClick={()=>void createNewProject()}>＋</button></div></label>
            <label className="os-field"><span>{t("left.projectName")}</span><div className="os-inline"><input key={project?.project.id??"none"} ref={renameInputRef} disabled={!project} defaultValue={project?.project.name??""}/><button disabled={!project||Boolean(busy)} onClick={()=>void renameProject()}>↵</button></div></label>
            <div className="os-recent-header"><span>{t("left.projects")}</span><button onClick={()=>void refreshRecent()}>{t("left.refresh")}</button></div>
            <div className="os-recent-list">{projects.slice(0,6).map(item=><button key={item.id} className={item.id===project?.project.id?"selected":""} onClick={()=>void openProject(item.id)}><strong>{item.name}</strong><small>rev {item.revision}</small></button>)}</div>
          </section>

          {leftTab==="cards"?<>
            <section className="os-section">
              <div className="os-section-title"><span>{t("left.assets")}</span><button className="os-section-action" disabled={!project} onClick={()=>fileInputRef.current?.click()}>{t("left.import")}</button></div>
              <div className="os-asset-list">{project?.assets.length?project.assets.slice(-8).map(asset=><div key={asset.id}><span>{asset.kind}</span><strong>{asset.label??asset.originalName??asset.id}</strong></div>):<p>{t("left.noAssets")}</p>}</div>
            </section>
            {project&&workspaceTab==="edit"?<EffectLibrary project={project} onCommand={persistCommand} onProjectChange={setProject} mode="sidebar"/>:null}
          </>:<section className="os-section caption-browser">
            <div className="os-section-title"><span>{t("left.captions")}</span><small>{captionClips.length}</small></div>
            {captionClips.length?captionClips.slice(0,30).map(clip=><button key={clip.id} onClick={()=>useSelectionStore.getState().selectClip(clip.id)}><small>f{clip.startFrame}</small><span>{clip.text}</span></button>):<p>{t("left.noAssets")}</p>}
          </section>}
        </div>
      </aside>

      <section className="os-main-column">
        <div className="os-stage">
          {workspaceTab==="effects"&&project?<div className="os-catalog-stage"><EffectLibrary project={project} onCommand={persistCommand} onProjectChange={setProject} mode="catalog"/></div>:project?<StudioPreview project={project}/>:<div className="empty-state os-empty"><span>01</span><h2>{t("preview.emptyTitle")}</h2><p>{t("preview.emptyBody")}</p></div>}
        </div>
        <div className="os-status-strip"><span className={busy?"busy":""}>{busy??notice}</span><span>{project?`${project.canvas.width}×${project.canvas.height} · ${project.canvas.fps} fps · rev ${project.project.revision}`:"—"}</span></div>
        {project?<Timeline project={project} onCommand={persistCommand}/>:<section className="timeline-placeholder"><strong>{t("timeline.title")}</strong></section>}
      </section>

      <aside className="os-right-panel">{project?<EffectInspector project={project} onCommand={persistCommand}/>:<div className="inspector-empty"><h2>{t("inspector.title")}</h2><p>{t("preview.emptyBody")}</p></div>}</aside>
    </div>
  </main>;
};

export const StudioWorkspace=(props:{initialProjects:ProjectSummary[]})=><StudioPreferencesProvider><StudioWorkspaceInner {...props}/></StudioPreferencesProvider>;
