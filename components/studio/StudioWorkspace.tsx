"use client";

import {useCallback,useRef,useState,type PointerEvent as ReactPointerEvent} from "react";
import {StudioPreview} from "@/components/player/StudioPreview";
import {Timeline} from "@/components/timeline/Timeline";
import {EffectLibrary} from "@/components/library/EffectLibrary";
import {EffectInspector} from "@/components/inspector/EffectInspector";
import {StudioPreferencesProvider,useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {ScriptEditor} from "@/components/script/ScriptEditor";
import {ScenePanel} from "@/components/scenes/ScenePanel";
import {VideoUsePanel} from "@/components/video-use/VideoUsePanel";
import type {ProjectCommand} from "@/lib/project/commands";
import type {ProjectSummary} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import {useHistoryStore} from "@/store/history-store";
import {useSelectionStore} from "@/store/selection-store";
import {STUDIO_LAYOUT_LIMITS,workspacePresetLayout,type StudioWorkspaceLayout,type StudioWorkspacePreset} from "@/lib/studio/workspace-layout";

type ApiError={error?:string;action?:string;retryable?:boolean};
type ErrorState={message:string;action?:string;retryable:boolean}|null;
type LeftTab="script"|"scenes"|"assets"|"effects"|"captions"|"project";
type ResizeKind="left"|"right"|"timeline";
type ResizeState={kind:ResizeKind;pointerId:number;startX:number;startY:number;startValue:number}|null;

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
  retryable:error instanceof Error&&"retryable" in error?Boolean((error as Error&{retryable?:boolean}).retryable):true,
});

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

const StudioWorkspaceInner=({initialProjects}:{initialProjects:ProjectSummary[]})=>{
  const{locale,theme,t,toggleLocale,toggleTheme,workspaceLayout,setWorkspacePreset,updateWorkspaceLayout,resetWorkspaceLayout}=useStudioPreferences();
  const project=useProjectStore(state=>state.project);
  const setProject=useProjectStore(state=>state.setProject);
  const pushHistory=useHistoryStore(state=>state.push);
  const selectedClipIds=useSelectionStore(state=>state.selectedClipIds);
  const[projects,setProjects]=useState(initialProjects);
  const[newProjectName,setNewProjectName]=useState("Untitled Video");
  const[busy,setBusy]=useState<string|null>(null);
  const[notice,setNotice]=useState(t("app.status.ready"));
  const[error,setError]=useState<ErrorState>(null);
  const[lastUpload,setLastUpload]=useState<File|null>(null);
  const[leftTab,setLeftTab]=useState<LeftTab>("assets");
  const[layoutDraft,setLayoutDraft]=useState<Partial<StudioWorkspaceLayout>|null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const renameInputRef=useRef<HTMLInputElement>(null);
  const resizeRef=useRef<ResizeState>(null);

  const effectiveLayout={...workspaceLayout,...(layoutDraft??{})};
  const motionClips=project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="motion")??[];
  const captionClips=project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption")??[];
  const scriptSegments=project?.script.segments.length??0;
  const sceneCount=project?.scenes.length??0;

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
      const before=useProjectStore.getState().project??project;
      const data=await requestJson<{project:Project}>(`/api/projects/${encodeURIComponent(project.project.id)}/commands`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
      setProject(data.project);setNotice(message);await refreshRecent();
      if(before.project.revision!==data.project.project.revision)pushHistory({projectId:project.project.id,label:message,before,after:data.project});
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

  const switchWorkspace=(preset:StudioWorkspacePreset)=>{
    setWorkspacePreset(preset);
    if(preset==="script")setLeftTab("script");
    else if(preset==="motion"||preset==="ai")setLeftTab("effects");
    else if(leftTab==="script"||leftTab==="effects")setLeftTab("assets");
  };

  const workspaceLabel=(preset:StudioWorkspacePreset)=>{
    if(locale==="zh-CN")return preset==="edit"?"剪辑":preset==="ai"?"AI":preset==="script"?"脚本":"动效";
    return preset==="edit"?"Edit":preset==="ai"?"AI":preset==="script"?"Script":"Motion";
  };

  const startResize=(kind:ResizeKind,event:ReactPointerEvent<HTMLDivElement>)=>{
    const startValue=kind==="left"?effectiveLayout.leftPanelWidth:kind==="right"?effectiveLayout.inspectorWidth:effectiveLayout.timelineHeight;
    resizeRef.current={kind,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startValue};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const drag=resizeRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(drag.kind==="left")setLayoutDraft({leftPanelWidth:clamp(drag.startValue+(event.clientX-drag.startX),STUDIO_LAYOUT_LIMITS.left.min,STUDIO_LAYOUT_LIMITS.left.max)});
    else if(drag.kind==="right")setLayoutDraft({inspectorWidth:clamp(drag.startValue-(event.clientX-drag.startX),STUDIO_LAYOUT_LIMITS.inspector.min,STUDIO_LAYOUT_LIMITS.inspector.max)});
    else{
      const viewportMax=Math.max(STUDIO_LAYOUT_LIMITS.timeline.min,Math.min(STUDIO_LAYOUT_LIMITS.timeline.max,window.innerHeight-330));
      setLayoutDraft({timelineHeight:clamp(drag.startValue+(drag.startY-event.clientY),STUDIO_LAYOUT_LIMITS.timeline.min,viewportMax)});
    }
  };
  const stopResize=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const drag=resizeRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(layoutDraft)updateWorkspaceLayout(layoutDraft);
    setLayoutDraft(null);resizeRef.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const resetAxis=(kind:ResizeKind)=>{
    const defaults=workspacePresetLayout(workspaceLayout.preset);
    updateWorkspaceLayout(kind==="left"?{leftPanelWidth:defaults.leftPanelWidth}:kind==="right"?{inspectorWidth:defaults.inspectorWidth}:{timelineHeight:defaults.timelineHeight,timelineCollapsed:false});
  };

  const leftWidth=effectiveLayout.leftCollapsed?0:effectiveLayout.leftPanelWidth;
  const rightWidth=effectiveLayout.inspectorCollapsed?0:effectiveLayout.inspectorWidth;
  const timelineHeight=effectiveLayout.timelineCollapsed?0:effectiveLayout.timelineHeight;
  const leftDivider=effectiveLayout.leftCollapsed?22:6;
  const rightDivider=effectiveLayout.inspectorCollapsed?22:6;

  return <main className="overlay-studio v21-studio">
    <input ref={fileInputRef} className="sr-only" type="file" accept="video/mp4,.mp4,application/x-subrip,.srt,text/vtt,.vtt" onChange={event=>{const file=event.target.files?.[0];event.currentTarget.value="";if(file)void uploadFile(file);}}/>

    <header className="os-topbar os-topbar-v21">
      <div className="os-brand"><strong>{t("app.brand")}</strong><span>v2.1</span></div>
      <div className="os-project-title" title={project?.project.name??""}><small>{locale==="zh-CN"?"项目":"PROJECT"}</small><strong>{project?.project.name??(locale==="zh-CN"?"未打开项目":"No project")}</strong></div>
      <nav className="os-workspace-tabs os-workspace-tabs-v21" aria-label={locale==="zh-CN"?"工作区":"Workspace"}>{(["edit","ai","script","motion"] as StudioWorkspacePreset[]).map(preset=><button key={preset} className={workspaceLayout.preset===preset?"active":""} onClick={()=>switchWorkspace(preset)}>{workspaceLabel(preset)}</button>)}</nav>
      <div className="os-save-state"><span className={busy?"busy":""}>{busy??notice}</span>{project?<small>rev {project.project.revision}</small>:null}</div>
      <div className="os-top-actions os-top-actions-v21">
        <button className="os-ghost" disabled={!project||Boolean(busy)} onClick={()=>void saveProject()}>{locale==="zh-CN"?"保存":"Save"}</button>
        <details className="os-project-menu"><summary aria-label={locale==="zh-CN"?"更多":"More"}>•••</summary><div className="os-project-menu-popover">
          <button onClick={toggleLocale}>{locale==="zh-CN"?"English":"中文"}</button>
          <button onClick={toggleTheme}>{theme==="dark"?(locale==="zh-CN"?"浅色界面":"Light UI"):(locale==="zh-CN"?"深色界面":"Dark UI")}</button>
          <button disabled={!project} onClick={()=>fileInputRef.current?.click()}>{locale==="zh-CN"?"导入媒体":"Import media"}</button>
          <button disabled={!project} onClick={exportProjectJson}>{locale==="zh-CN"?"导出项目 JSON":"Export Project JSON"}</button>
          <button onClick={resetWorkspaceLayout}>{locale==="zh-CN"?"重置工作区":"Reset workspace"}</button>
        </div></details>
        <button className="os-primary" disabled={!project} onClick={()=>window.dispatchEvent(new Event("video-os-start-final-render"))}>↓ {locale==="zh-CN"?"导出":"Export"}</button>
      </div>
    </header>

    {error?<div className="error-banner os-error" role="alert"><div><strong>{error.message}</strong>{error.action?<span>{error.action}</span>:null}</div>{error.retryable&&lastUpload&&project?<button className="button danger" onClick={()=>void uploadFile(lastUpload)}>Retry</button>:null}</div>:null}

    <div className={`os-shell os-shell-v21 workspace-${workspaceLayout.preset}`} style={{gridTemplateColumns:`${leftWidth}px ${leftDivider}px minmax(420px,1fr) ${rightDivider}px ${rightWidth}px`}}>
      <aside className={`os-left-panel ${effectiveLayout.leftCollapsed?"is-collapsed":""}`} aria-hidden={effectiveLayout.leftCollapsed}>
        <div className="os-left-tabs os-left-tabs-six">
          <button className={leftTab==="script"?"active":""} onClick={()=>setLeftTab("script")}>{locale==="zh-CN"?"脚本":"Script"} <span>{scriptSegments}</span></button>
          <button className={leftTab==="scenes"?"active":""} onClick={()=>setLeftTab("scenes")}>{locale==="zh-CN"?"场景":"Scenes"} <span>{sceneCount}</span></button>
          <button className={leftTab==="assets"?"active":""} onClick={()=>setLeftTab("assets")}>{t("left.assets")} <span>{project?.assets.length??0}</span></button>
          <button className={leftTab==="effects"?"active":""} onClick={()=>setLeftTab("effects")}>{t("left.effects")} <span>{motionClips.length}</span></button>
          <button className={leftTab==="captions"?"active":""} onClick={()=>setLeftTab("captions")}>{t("left.captions")} <span>{captionClips.length}</span></button>
          <button className={leftTab==="project"?"active":""} onClick={()=>setLeftTab("project")}>{t("left.project")}</button>
        </div>

        <div className="os-left-scroll">
          {leftTab==="script"&&project?<ScriptEditor project={project} onProjectChange={setProject} onCommand={persistCommand}/>:null}
          {leftTab==="scenes"&&project?<ScenePanel project={project} onProjectChange={setProject} onCommand={persistCommand}/>:null}

          {leftTab==="project"?<>
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
              <div className="os-recent-list">{projects.slice(0,8).map(item=><button key={item.id} className={item.id===project?.project.id?"selected":""} onClick={()=>void openProject(item.id)}><strong>{item.name}</strong><small>rev {item.revision}</small></button>)}</div>
            </section>
            {project?<section className="os-section"><VideoUsePanel project={project} onProjectChange={setProject}/></section>:null}
          </>:null}

          {leftTab==="assets"?<section className="os-section os-assets-workspace"><div className="os-section-title"><span>{t("left.assets")}</span><button className="os-section-action" disabled={!project} onClick={()=>fileInputRef.current?.click()}>{t("left.import")}</button></div><div className="os-asset-list">{project?.assets.length?project.assets.map(asset=><div key={asset.id}><span>{asset.kind}</span><strong title={asset.relativePath}>{asset.label??asset.originalName??asset.id}</strong></div>):<p>{t("left.noAssets")}</p>}</div></section>:null}
          {leftTab==="effects"&&project?<EffectLibrary project={project} onCommand={persistCommand} onProjectChange={setProject} mode="sidebar"/>:null}
          {leftTab==="captions"?<section className="os-section caption-browser"><div className="os-section-title"><span>{t("left.captions")}</span><small>{captionClips.length}</small></div>{captionClips.length?captionClips.slice(0,60).map(clip=><button key={clip.id} onClick={()=>useSelectionStore.getState().selectClip(clip.id)}><small>f{clip.startFrame}</small><span>{clip.text}</span></button>):<p>{t("left.noAssets")}</p>}</section>:null}
        </div>
      </aside>

      <div className={`os-v21-divider os-v21-divider-left ${effectiveLayout.leftCollapsed?"collapsed":""}`} role="separator" aria-orientation="vertical" onPointerDown={event=>startResize("left",event)} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onDoubleClick={()=>resetAxis("left")}><button type="button" aria-label={effectiveLayout.leftCollapsed?(locale==="zh-CN"?"展开左面板":"Expand left panel"):(locale==="zh-CN"?"折叠左面板":"Collapse left panel")} onPointerDown={event=>event.stopPropagation()} onClick={()=>updateWorkspaceLayout({leftCollapsed:!effectiveLayout.leftCollapsed})}>{effectiveLayout.leftCollapsed?"›":"‹"}</button></div>

      <section className="os-main-column">
        <div className="os-stage">{project?<StudioPreview project={project}/>:<div className="empty-state os-empty"><span>01</span><h2>{t("preview.emptyTitle")}</h2><p>{t("preview.emptyBody")}</p></div>}</div>
        <div className="os-status-strip"><span className={busy?"busy":""}>{busy??notice}</span><span>{project?`${project.canvas.width}×${project.canvas.height} · ${project.canvas.fps} fps · ${selectedClipIds.length?`${selectedClipIds.length} sel · `:""}rev ${project.project.revision}`:"—"}</span></div>
        <div className={`os-splitter os-splitter-v21 ${effectiveLayout.timelineCollapsed?"collapsed":""}`} role="separator" aria-orientation="horizontal" aria-label={t("preview.resizeTimeline")} title={t("preview.resizeTimeline")} onPointerDown={event=>startResize("timeline",event)} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onDoubleClick={()=>resetAxis("timeline")}><span/><button type="button" onPointerDown={event=>event.stopPropagation()} onClick={()=>updateWorkspaceLayout({timelineCollapsed:!effectiveLayout.timelineCollapsed})}>{effectiveLayout.timelineCollapsed?"⌃":"⌄"}</button></div>
        <div className={`os-timeline-region ${effectiveLayout.timelineCollapsed?"is-collapsed":""}`} style={{height:`${timelineHeight}px`,flexBasis:`${timelineHeight}px`}}>{project&&!effectiveLayout.timelineCollapsed?<Timeline project={project} onCommand={persistCommand}/>:!project&&!effectiveLayout.timelineCollapsed?<section className="timeline-placeholder"><strong>{t("timeline.title")}</strong></section>:null}</div>
      </section>

      <div className={`os-v21-divider os-v21-divider-right ${effectiveLayout.inspectorCollapsed?"collapsed":""}`} role="separator" aria-orientation="vertical" onPointerDown={event=>startResize("right",event)} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onDoubleClick={()=>resetAxis("right")}><button type="button" aria-label={effectiveLayout.inspectorCollapsed?(locale==="zh-CN"?"展开检查器":"Expand inspector"):(locale==="zh-CN"?"折叠检查器":"Collapse inspector")} onPointerDown={event=>event.stopPropagation()} onClick={()=>updateWorkspaceLayout({inspectorCollapsed:!effectiveLayout.inspectorCollapsed})}>{effectiveLayout.inspectorCollapsed?"‹":"›"}</button></div>

      <aside className={`os-right-panel ${effectiveLayout.inspectorCollapsed?"is-collapsed":""}`} aria-hidden={effectiveLayout.inspectorCollapsed}>{project?<EffectInspector project={project} onCommand={persistCommand}/>:<div className="inspector-empty"><h2>{t("inspector.title")}</h2><p>{t("preview.emptyBody")}</p></div>}</aside>
    </div>
  </main>;
};

export const StudioWorkspace=(props:{initialProjects:ProjectSummary[]})=><StudioPreferencesProvider><StudioWorkspaceInner {...props}/></StudioPreferencesProvider>;
