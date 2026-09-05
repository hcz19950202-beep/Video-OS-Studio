"use client";

import {useCallback,useRef,useState} from "react";
import {StudioPreview} from "@/components/player/StudioPreview";
import {Timeline} from "@/components/timeline/Timeline";
import {EffectLibrary} from "@/components/library/EffectLibrary";
import {CreativeAssetLibrary} from "@/components/library/CreativeAssetLibrary";
import {EffectInspector} from "@/components/inspector/EffectInspector";
import {StudioPreferencesProvider,useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {ScriptEditor} from "@/components/script/ScriptEditor";
import {ScenePanel} from "@/components/scenes/ScenePanel";
import {VideoUsePanel} from "@/components/video-use/VideoUsePanel";
import {AIWorkspacePanel} from "@/components/studio/AIWorkspacePanel";
import {ResizableWorkspaceShell} from "@/components/studio/ResizableWorkspaceShell";
import {WorkspaceLayoutProvider,useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";
import {useWorkspaceProjectRuntime} from "@/components/studio/useWorkspaceProjectRuntime";
import {RENDER_REQUEST_EVENT} from "@/components/render/RenderControls";
import {CANVAS_PRESETS,describeCanvas} from "@/lib/canvas/aspect";
import {publishProjectIfActive} from "@/lib/client/project-mutations";
import {DEFAULT_MOTION_TRANSFORM} from "@/schemas/clip";
import type {ProjectSummary} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";
import {useProjectStore} from "@/store/project-store";
import {useSelectionStore} from "@/store/selection-store";
import {usePlayerStore} from "@/store/player-store";
import type {WorkspacePreset} from "@/lib/studio/workspace-layout";

type ToolId="script"|"scenes"|"ai"|"media"|"captions"|"effects"|"brand"|"project";
type MediaTab="assets"|"transcript"|"library";
type ScenarioId="talking-head"|"product-ad"|"explainer"|"educational"|"motion"|"long-short"|"blank";

const scenarios:Array<{id:ScenarioId;zh:string;en:string;detailZh:string;detailEn:string}>=[
  {id:"talking-head",zh:"口播视频",en:"Talking Head",detailZh:"脚本 → 场景 → AI 视觉",detailEn:"Script → Scenes → AI visuals"},
  {id:"product-ad",zh:"产品广告",en:"Product Ad",detailZh:"卖点、证明与 CTA",detailEn:"Benefits, proof and CTA"},
  {id:"explainer",zh:"解释视频",en:"Explainer",detailZh:"流程与概念可视化",detailEn:"Process and concept visuals"},
  {id:"educational",zh:"知识视频",en:"Educational",detailZh:"结构化讲解与重点",detailEn:"Structured teaching and emphasis"},
  {id:"motion",zh:"动效视频",en:"Motion Video",detailZh:"以 Motion Graphics 为主",detailEn:"Motion-graphics first"},
  {id:"long-short",zh:"长视频切短",en:"Long → Short",detailZh:"从长素材提炼短片",detailEn:"Extract short-form edits"},
  {id:"blank",zh:"空白项目",en:"Blank Project",detailZh:"只初始化通用画布",detailEn:"Universal canvas only"},
];

const toolItems:Array<{id:ToolId;icon:string;zh:string;en:string}>=[
  {id:"script",icon:"≡",zh:"脚本",en:"Script"},
  {id:"scenes",icon:"◫",zh:"场景",en:"Scenes"},
  {id:"ai",icon:"✦",zh:"AI",en:"AI"},
  {id:"media",icon:"▣",zh:"媒体",en:"Media"},
  {id:"captions",icon:"CC",zh:"字幕",en:"Captions"},
  {id:"effects",icon:"FX",zh:"动效",en:"Effects"},
  {id:"brand",icon:"◈",zh:"品牌",en:"Brand"},
  {id:"project",icon:"⚙",zh:"项目",en:"Project"},
];

const WorkspaceInner=({initialProjects}:{initialProjects:ProjectSummary[]})=>{
  const{locale,theme,t,toggleLocale,toggleTheme}=useStudioPreferences();
  const{layout,setPreset,toggleLeft,toggleInspector,resetWorkspace}=useWorkspaceLayout();
  const project=useProjectStore(state=>state.project);const setProject=useProjectStore(state=>state.setProject);
  const clearSelection=useSelectionStore(state=>state.clearSelection);
  const[tool,setTool]=useState<ToolId>("media");const[mediaTab,setMediaTab]=useState<MediaTab>("assets");
  const[newProjectName,setNewProjectName]=useState("Untitled Video");const[scenario,setScenario]=useState<ScenarioId>("blank");const[canvasWidth,setCanvasWidth]=useState(1920);const[canvasHeight,setCanvasHeight]=useState(1080);const[canvasFps,setCanvasFps]=useState(30);const[matchSourceCanvas,setMatchSourceCanvas]=useState(false);
  const{projects,busy,notice,error,lastUpload,importStatus,refreshRecent,persistCommand,createNewProject,openProject,saveProject,renameProject,uploadFile}=useWorkspaceProjectRuntime({initialProjects,project,locale,t,matchSourceCanvas,setMatchSourceCanvas,onProjectCreated:()=>{setTool("media");setPreset("edit");}});
  const fileInputRef=useRef<HTMLInputElement>(null);const renameInputRef=useRef<HTMLInputElement>(null);
  const zh=locale==="zh-CN";
  const captionClips=project?.tracks.flatMap(track=>track.clips).filter(clip=>clip.type==="caption")??[];
  const canvas=project?describeCanvas(project.canvas.width,project.canvas.height):null;
  const publishProjectChange=useCallback((candidate:Project)=>{
    const requestProjectId=project?.project.id;
    if(!requestProjectId)return;
    publishProjectIfActive(requestProjectId,candidate,()=>useProjectStore.getState().project,setProject);
  },[project?.project.id,setProject]);

  const exportProjectJson=()=>{if(!project)return;const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`${project.project.id}.json`;anchor.click();URL.revokeObjectURL(url);};
  const activateTool=(id:ToolId)=>{setTool(id);if(layout.leftCollapsed)toggleLeft();if(id==="ai")setPreset("ai");else if(id==="script")setPreset("script");else if(id==="effects")setPreset("motion");else if(layout.preset!=="edit")setPreset("edit");if(id==="brand"){clearSelection();if(layout.inspectorCollapsed)toggleInspector();}};
  const selectPreset=(presetId:string)=>{const preset=CANVAS_PRESETS.find(item=>item.id===presetId);if(!preset)return;setCanvasWidth(preset.width);setCanvasHeight(preset.height);setMatchSourceCanvas(false);};
  const switchWorkspace=(preset:WorkspacePreset)=>{setPreset(preset);if(preset==="ai")setTool("ai");if(preset==="script")setTool("script");if(preset==="motion")setTool("effects");if(preset==="edit"&&tool==="ai")setTool("media");};

  const topbar=<header className="v21-topbar"><div className="v21-topbar-left"><div className="v21-brand"><strong>VIDEO OS</strong><small>V2.1</small></div><span className="v21-project-title">{project?.project.name??(zh?"未打开项目":"No project")}</span></div><div className="v21-topbar-center"><div className="v21-workspace-switch">{(["edit","ai","script","motion"] as WorkspacePreset[]).map(id=><button key={id} className={layout.preset===id?"active":""} onClick={()=>switchWorkspace(id)}>{id.toUpperCase()}</button>)}</div></div><div className="v21-topbar-right"><span className="v21-save-state">{busy??notice}</span><button className="v21-ghost" onClick={toggleLocale}>{zh?"EN":"中文"}</button><button className="v21-ghost" onClick={toggleTheme}>{theme==="dark"?"☀":"☾"}</button><button className="v21-ghost" disabled={!project} onClick={()=>void saveProject()}>{t("app.save")}</button><button className="v21-primary" disabled={!project} onClick={()=>window.dispatchEvent(new CustomEvent(RENDER_REQUEST_EVENT,{detail:{mode:"final"}}))}>{zh?"导出":"Export"}</button></div></header>;
  const rail=<>{toolItems.map(item=><button key={item.id} className={`v21-icon-rail-button ${tool===item.id?"active":""}`} title={zh?item.zh:item.en} onClick={()=>activateTool(item.id)}><span>{item.icon}</span><small>{zh?item.zh:item.en}</small></button>)}</>;

  const headerLabel=toolItems.find(item=>item.id===tool);
  const content=<div className="v21-content-panel-inner"><div className="v21-content-header"><strong>{zh?headerLabel?.zh:headerLabel?.en}</strong><small>{tool.toUpperCase()}</small></div><div className="v21-content-scroll">
    {tool==="script"&&project?<ScriptEditor project={project} onProjectChange={publishProjectChange} onCommand={persistCommand}/>:null}
    {tool==="scenes"&&project?<ScenePanel project={project} onProjectChange={publishProjectChange} onCommand={persistCommand}/>:null}
    {tool==="ai"&&project?<AIWorkspacePanel project={project} onProjectChange={publishProjectChange}/>:null}
    {tool==="media"?<><div className="v21-panel-tabs"><button className={mediaTab==="assets"?"active":""} onClick={()=>setMediaTab("assets")}>{zh?"素材":"Assets"}</button><button className={mediaTab==="transcript"?"active":""} onClick={()=>setMediaTab("transcript")}>{zh?"转写":"Transcript"}</button><button className={mediaTab==="library"?"active":""} onClick={()=>setMediaTab("library")}>{zh?"资源库":"Library"}</button></div>{mediaTab==="assets"?<section className="os-section os-assets-workspace"><div className="os-section-title"><span>{zh?"项目媒体":"Project Media"}</span><button className="os-section-action" disabled={!project||Boolean(busy)} onClick={()=>fileInputRef.current?.click()}>{t("left.import")}</button></div>{importStatus?<div className={`v21-import-status ${importStatus.phase}`} role="status"><strong>{importStatus.fileName}</strong><span>{importStatus.phase==="uploading"?(zh?"上传中…":"Uploading…"):importStatus.phase==="preparing"?(zh?"分析并准备可编辑媒体…":"Probing and preparing editable media…"):(importStatus.normalized?(zh?`已保留原文件 · Working: ${importStatus.workingFileName}`:`Original preserved · Working: ${importStatus.workingFileName}`):(zh?"导入完成":"Import ready"))}</span></div>:null}<div className="os-asset-list">{project?.assets.length?project.assets.map(asset=><div key={asset.id}><span>{asset.kind}</span><strong title={asset.relativePath}>{asset.label??asset.originalName??asset.id}</strong>{asset.originalRelativePath?<small title={asset.originalRelativePath}>{zh?"原文件已保留":"Original preserved"}</small>:null}{(asset.kind==="video"||asset.kind==="image")&&project?<button className="button small" disabled={Boolean(busy)} onClick={()=>{const currentFrame=usePlayerStore.getState().currentFrame;const duration=Math.max(1,Math.min(asset.durationInFrames??project.canvas.fps*3,project.canvas.durationInFrames-currentFrame));void persistCommand({type:"add-clip",trackId:"broll-main",clip:{id:`broll-${asset.id}-${Date.now()}`,type:"broll",assetId:asset.id,enabled:true,layer:5,startFrame:currentFrame,durationInFrames:duration,sourceStartFrame:0,fit:"cover",transform:DEFAULT_MOTION_TRANSFORM}},zh?"B-roll 已加入时间轴":"B-roll added to timeline")}}>{zh?"加入 B-roll":"Add B-roll"}</button>:null}{asset.kind==="audio"&&project?<button className="button small" disabled={Boolean(busy)} onClick={()=>{const currentFrame=usePlayerStore.getState().currentFrame;const duration=Math.max(1,Math.min(asset.durationInFrames??project.canvas.fps*3,project.canvas.durationInFrames-currentFrame));void persistCommand({type:"add-clip",trackId:"audio-main",clip:{id:`audio-${asset.id}-${Date.now()}`,type:"audio",assetId:asset.id,enabled:true,layer:0,startFrame:currentFrame,durationInFrames:duration,sourceStartFrame:0,volume:1,role:"sfx"}},zh?"音频已加入时间轴":"Audio added to timeline")}}>{zh?"加入音频":"Add Audio"}</button>:null}</div>):<p>{t("left.noAssets")}</p>}</div></section>:null}{mediaTab==="transcript"&&project?<ScriptEditor project={project} onProjectChange={publishProjectChange} onCommand={persistCommand}/>:null}{mediaTab==="library"?<CreativeAssetLibrary/>:null}</>:null}
    {tool==="captions"?<section className="os-section caption-browser"><div className="os-section-title"><span>{t("left.captions")}</span><small>{captionClips.length}</small></div>{captionClips.length?captionClips.slice(0,100).map(clip=><button key={clip.id} onClick={()=>useSelectionStore.getState().selectClip(clip.id)}><small>f{clip.startFrame}</small><span>{clip.text}</span></button>):<p>{t("left.noAssets")}</p>}</section>:null}
    {tool==="effects"&&project?<EffectLibrary project={project} onCommand={persistCommand} onProjectChange={publishProjectChange} mode="sidebar"/>:null}
    {tool==="brand"?<section className="os-section"><div className="os-section-title"><span>{zh?"视频品牌":"Video Brand"}</span><small>BRAND</small></div><p className="hint">{zh?"品牌、Linked Style 与项目级视觉设置继续使用右侧 Context Inspector。这里保持为品牌工作区入口，不复制第二套状态。":"Brand, Linked Styles and project-level visual settings continue to use the Context Inspector. This workspace does not create a second state system."}</p><button className="button small" disabled={!project} onClick={()=>{clearSelection();if(layout.inspectorCollapsed)toggleInspector();}}>{zh?"打开品牌参数":"Open Brand Inspector"}</button></section>:null}
    {tool==="project"?<div className="v21-project-create"><section className="os-section"><div className="os-section-title"><span>{zh?"新建项目":"New Project"}</span><small>UNIVERSAL</small></div><label className="os-field"><span>{zh?"项目名称":"Project name"}</span><input value={newProjectName} onChange={event=>setNewProjectName(event.target.value)}/></label><div className="v21-scenario-grid">{scenarios.map(item=><button key={item.id} className={`v21-scenario-card ${scenario===item.id?"active":""}`} onClick={()=>setScenario(item.id)}><strong>{zh?item.zh:item.en}</strong><small>{zh?item.detailZh:item.detailEn}</small></button>)}</div></section><section className="os-section"><div className="os-section-title"><span>{zh?"画布":"Canvas"}</span><small>{matchSourceCanvas?(zh?"匹配首个视频":"Match first video"):`${canvasWidth}×${canvasHeight}`}</small></div><button className={`v21-match-source ${matchSourceCanvas?"active":""}`} onClick={()=>setMatchSourceCanvas(value=>!value)}><strong>{zh?"匹配源视频尺寸":"Match Source Dimensions"}</strong><small>{zh?"项目先创建；导入第一条视频后自动按实际 probe 结果匹配 Width × Height。FPS 保持你选择的项目时间基准。":"Create the project first; the first imported video will set Width × Height from probe metadata. FPS stays an explicit project timebase."}</small></button><div className="v21-canvas-presets">{CANVAS_PRESETS.slice(0,7).map(item=><button key={item.id} className={!matchSourceCanvas&&item.width===canvasWidth&&item.height===canvasHeight?"active":""} onClick={()=>selectPreset(item.id)}>{item.label}<small>{item.width}×{item.height}</small></button>)}</div><label className="os-field"><span>{zh?"自定义尺寸":"Custom size"}</span><div className="v21-canvas-custom"><input type="number" min={16} max={16384} value={canvasWidth} onChange={event=>{setMatchSourceCanvas(false);setCanvasWidth(Math.max(16,Number(event.target.value)||16));}}/><span>×</span><input type="number" min={16} max={16384} value={canvasHeight} onChange={event=>{setMatchSourceCanvas(false);setCanvasHeight(Math.max(16,Number(event.target.value)||16));}}/></div></label><label className="os-field"><span>FPS</span><div className="v21-fps-row">{[24,25,30,50,60].map(value=><button key={value} className={canvasFps===value?"active":""} onClick={()=>setCanvasFps(value)}>{value}</button>)}<input aria-label="Custom FPS" type="number" min={1} max={120} value={canvasFps} onChange={event=>setCanvasFps(Math.min(120,Math.max(1,Number(event.target.value)||1)))}/></div></label><button className="v21-primary" disabled={!newProjectName.trim()||Boolean(busy)} onClick={()=>void createNewProject({name:newProjectName,width:canvasWidth,height:canvasHeight,fps:canvasFps,scenario})}>{zh?"创建项目":"Create Project"}</button></section>{project?<section className="os-section"><div className="os-section-title"><span>{zh?"当前画布":"Current Canvas"}</span><small>{canvas?.aspectLabel}</small></div><div className="v21-current-canvas-summary"><strong>{project.canvas.width}×{project.canvas.height}</strong><span>{canvas?.orientation} · {project.canvas.fps} fps</span></div><p className="hint">{zh?"修改现有项目画布属于高影响操作。请在右侧 Project Inspector 预览受影响元素后再 Apply。":"Changing an existing project canvas is high impact. Use the Project Inspector to preview affected visuals before Apply."}</p><button className="button small" onClick={()=>{clearSelection();if(layout.inspectorCollapsed)toggleInspector();}}>{zh?"打开画布参数":"Open Canvas Inspector"}</button></section>:null}{project?<section className="os-section"><VideoUsePanel project={project} onProjectChange={publishProjectChange}/></section>:null}<section className="os-section"><div className="os-section-title"><span>{t("left.projects")}</span><button onClick={()=>void refreshRecent()}>{t("left.refresh")}</button></div><div className="os-recent-list">{projects.slice(0,10).map(item=><button key={item.id} className={item.id===project?.project.id?"selected":""} onClick={()=>void openProject(item.id)}><strong>{item.name}</strong><small>rev {item.revision}</small></button>)}</div></section>{project?<section className="os-section"><label className="os-field"><span>{t("left.projectName")}</span><div className="os-inline"><input key={project.project.id} ref={renameInputRef} defaultValue={project.project.name}/><button disabled={Boolean(busy)} onClick={()=>void renameProject(renameInputRef.current?.value.trim())}>↵</button></div></label><button className="button small" onClick={exportProjectJson}>{t("app.exportJson")}</button><button className="button small" onClick={resetWorkspace}>{zh?"重置工作区":"Reset Workspace"}</button></section>:null}</div>:null}
  </div></div>;

  const viewer=<>{project?<><div className="v21-viewer-meta"><div className="v21-canvas-badge"><strong>{zh?"通用画布":"Universal Canvas"}</strong><span>{project.canvas.width}×{project.canvas.height}</span><span>{canvas?.aspectLabel}</span><span>{canvas?.orientation}</span></div><small>rev {project.project.revision}</small></div><StudioPreview project={project}/></>:<div className="empty-state os-empty"><span>V2.1</span><h2>{zh?"创建或打开项目":"Create or open a project"}</h2><p>{zh?"横屏、竖屏、方形、超宽和自定义画布都使用同一套编辑器。":"Landscape, portrait, square, ultrawide and custom canvases use the same editor."}</p></div>}</>;
  const inspector=<>{project?<EffectInspector project={project} onCommand={persistCommand}/>:<div className="inspector-empty"><h2>{t("inspector.title")}</h2><p>{t("preview.emptyBody")}</p></div>}</>;
  const timeline=<>{project?<Timeline project={project} onCommand={persistCommand}/>:<section className="timeline-placeholder"><strong>{t("timeline.title")}</strong></section>}</>;

  return <><input ref={fileInputRef} className="sr-only" type="file" accept="video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi,audio/*,.mp3,.wav,.m4a,.aac,.flac,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,application/x-subrip,.srt,text/vtt,.vtt" onChange={event=>{const file=event.target.files?.[0];event.currentTarget.value="";if(file)void uploadFile(file);}}/>{error?<div className="error-banner os-error" role="alert"><div><strong>{error.message}</strong>{error.action?<span>{error.action}</span>:null}</div>{error.retryable&&lastUpload&&project?<button className="button danger" onClick={()=>void uploadFile(lastUpload)}>Retry</button>:null}</div>:null}<ResizableWorkspaceShell topbar={topbar} rail={rail} content={content} viewer={viewer} inspector={inspector} timeline={timeline} onOpenProjects={()=>activateTool("project")}/></>;
};

export const StudioWorkspaceV21=(props:{initialProjects:ProjectSummary[]})=><StudioPreferencesProvider><WorkspaceLayoutProvider><WorkspaceInner {...props}/></WorkspaceLayoutProvider></StudioPreferencesProvider>;
