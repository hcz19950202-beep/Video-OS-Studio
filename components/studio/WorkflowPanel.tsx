"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {Project} from "@/schemas/project";
import type {WorkflowRun,WorkflowScenario,WorkflowStageExecution} from "@/lib/workflows/schema";
import type {WorkflowActivity} from "@/lib/workflows/activity";
import type {JobRecord} from "@/lib/jobs/schema";
import {toClientErrorState} from "@/lib/client/api";
import {getJob} from "@/lib/client/jobs";
import {loadStudioProject} from "@/lib/client/projects";
import {actOnWorkflow,createAndStartWorkflow,getWorkflow,getWorkflowActivity,listWorkflows,type WorkflowAction} from "@/lib/client/workflows";
import {workflowMessages,workflowRunStatusLabel,workflowStageLabel,workflowStageStatusLabel} from "@/lib/i18n/workflow";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

const SCENARIOS:WorkflowScenario[]=["talking-head","product-ad","explainer"];
const REPLAYABLE_STAGE_IDS=new Set(["TRANSCRIBE","SCRIPT_ANALYSIS","SCENE_DETECTION","CAPTION_GENERATION","VISUAL_PLANNING","MOTION_GENERATION","BROLL_ASSEMBLY","AUDIO_ASSEMBLY","TIMELINE_ASSEMBLY","PREVIEW"]);
const TERMINAL_RUNS=new Set(["completed","cancelled"]);
const scenarioLabel=(scenario:WorkflowScenario,zh:boolean)=>scenario==="talking-head"?(zh?"口播视频":"Talking Head"):scenario==="product-ad"?(zh?"产品广告":"Product Ad"):(zh?"解释视频":"Explainer");
const statusGlyph=(status:WorkflowStageExecution["status"])=>status==="completed"?"✓":status==="running"?"●":status==="waiting_review"?"◉":status==="failed"?"!":status==="interrupted"?"!":status==="invalidated"?"↻":status==="ready"?"→":status==="cancelled"?"×":status==="skipped"?"–":"○";

type WorkflowDiscovery={latest:WorkflowRun|null;activity:WorkflowActivity[]};

export const WorkflowPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();const zh=locale==="zh-CN";const m=workflowMessages(locale);
  const[scenario,setScenario]=useState<WorkflowScenario>(SCENARIOS.includes(project.workflow.scenario as WorkflowScenario)?project.workflow.scenario as WorkflowScenario:"talking-head");
  const[workflow,setWorkflow]=useState<WorkflowRun|null>(null);const[activity,setActivity]=useState<WorkflowActivity[]>([]);const[currentJob,setCurrentJob]=useState<JobRecord|null>(null);
  const[busyAction,setBusyAction]=useState<string|null>(null);const[error,setError]=useState<string>("");const[notice,setNotice]=useState<string>("");
  const activeProjectIdRef=useRef(project.project.id);activeProjectIdRef.current=project.project.id;
  const isActiveProject=useCallback((expectedProjectId:string)=>activeProjectIdRef.current===expectedProjectId,[]);

  const videoAssets=useMemo(()=>project.assets.filter(asset=>asset.kind==="video"),[project.assets]);
  const sourceVideo=useMemo(()=>{
    const activeClip=project.tracks.find(track=>track.id==="video-main")?.clips.find(clip=>clip.type==="video");
    return(activeClip?videoAssets.find(asset=>asset.id===activeClip.assetId):undefined)??videoAssets[0];
  },[project.tracks,videoAssets]);

  const syncProject=useCallback(async(run:WorkflowRun,expectedProjectId=project.project.id)=>{
    if(!isActiveProject(expectedProjectId)||run.lastKnownProjectRevision<=project.project.revision)return;
    const latest=await loadStudioProject(expectedProjectId);
    if(!isActiveProject(expectedProjectId))return;
    onProjectChange(latest);setNotice(m.projectUpdated);
  },[isActiveProject,m.projectUpdated,onProjectChange,project.project.id,project.project.revision]);

  const refreshRun=useCallback(async(workflowId:string,withActivity=true)=>{
    const expectedProjectId=project.project.id;
    const run=await getWorkflow(workflowId);
    if(!isActiveProject(expectedProjectId))return run;
    setWorkflow(run);await syncProject(run,expectedProjectId);
    if(!isActiveProject(expectedProjectId))return run;
    const active=run.currentStageId?run.stageExecutions.find(stage=>stage.stageId===run.currentStageId):run.stageExecutions.find(stage=>stage.status==="running");
    const jobId=active?.jobIds.at(-1);
    if(jobId){try{const job=(await getJob(jobId)).job;if(isActiveProject(expectedProjectId))setCurrentJob(job);}catch{if(isActiveProject(expectedProjectId))setCurrentJob(null);}}else setCurrentJob(null);
    if(withActivity){try{const nextActivity=await getWorkflowActivity(workflowId);if(isActiveProject(expectedProjectId))setActivity(nextActivity);}catch{if(isActiveProject(expectedProjectId))setActivity([]);}}
    return run;
  },[isActiveProject,project.project.id,syncProject]);

  const loadDiscovery=useCallback(async():Promise<WorkflowDiscovery>=>{
    const runs=await listWorkflows(project.project.id);
    const latest=runs.find(run=>run.definitionVersion==="2"&&run.definitionId.startsWith("video-production-"))??null;
    if(!latest)return{latest:null,activity:[]};
    try{return{latest,activity:await getWorkflowActivity(latest.id)};}catch{return{latest,activity:[]};}
  },[project.project.id]);

  const discover=useCallback(async()=>{
    const expectedProjectId=project.project.id;
    try{
      const next=await loadDiscovery();
      if(!isActiveProject(expectedProjectId))return;
      setWorkflow(next.latest);setActivity(next.activity);setCurrentJob(null);setError("");
      if(next.latest)await syncProject(next.latest,expectedProjectId);
    }catch(cause){if(isActiveProject(expectedProjectId))setError(toClientErrorState(cause).message);}
  },[isActiveProject,loadDiscovery,project.project.id,syncProject]);

  useEffect(()=>{
    let cancelled=false;const expectedProjectId=project.project.id;
    void loadDiscovery().then(async next=>{
      if(cancelled||!isActiveProject(expectedProjectId))return;
      setWorkflow(next.latest);setActivity(next.activity);setCurrentJob(null);setError("");setNotice("");
      if(next.latest)await syncProject(next.latest,expectedProjectId);
    }).catch(cause=>{if(!cancelled&&isActiveProject(expectedProjectId))setError(toClientErrorState(cause).message);});
    return()=>{cancelled=true;};
  },[isActiveProject,loadDiscovery,project.project.id,syncProject]);
  const workflowId=workflow?.id;const workflowStatus=workflow?.status;
  useEffect(()=>{
    if(!workflowId||!workflowStatus||TERMINAL_RUNS.has(workflowStatus))return;
    const delay=workflowStatus==="running"?1000:workflowStatus==="waiting_review"?2500:3500;
    const timer=window.setInterval(()=>{void refreshRun(workflowId,false).catch(cause=>{if(isActiveProject(project.project.id))setError(toClientErrorState(cause).message);});},delay);
    return()=>window.clearInterval(timer);
  },[isActiveProject,project.project.id,refreshRun,workflowId,workflowStatus]);

  const runAction=async(action:WorkflowAction)=>{
    if(!workflow)return;const expectedProjectId=project.project.id;setBusyAction(action.action);setError("");setNotice("");
    try{const next=await actOnWorkflow(workflow.id,action);if(!isActiveProject(expectedProjectId))return;setWorkflow(next);await syncProject(next,expectedProjectId);if(isActiveProject(expectedProjectId))await refreshRun(next.id);}
    catch(cause){if(isActiveProject(expectedProjectId))setError(toClientErrorState(cause).message);}finally{if(isActiveProject(expectedProjectId))setBusyAction(null);}
  };
  const generate=async()=>{
    if(!sourceVideo){setError(m.noVideo);return;}const expectedProjectId=project.project.id;setBusyAction("generate");setError("");setNotice("");
    try{
      const next=await createAndStartWorkflow({projectId:expectedProjectId,scenario,sourceAssetIds:[sourceVideo.id],expectedProjectRevision:project.project.revision});if(!isActiveProject(expectedProjectId))return;setWorkflow(next);await refreshRun(next.id);
    }catch(cause){if(isActiveProject(expectedProjectId)){setError(toClientErrorState(cause).message);await discover();}}finally{if(isActiveProject(expectedProjectId))setBusyAction(null);}
  };

  if(!workflow)return <div className="v22-workflow-panel" data-workflow-state="empty">
    <section className="v22-workflow-hero"><small>VIDEO OS · WORKFLOW RUNTIME</small><h3>{m.title}</h3><p>{m.subtitle}</p></section>
    <section className="v22-workflow-start-card">
      <label><span>{m.scenario}</span><div className="v22-scenario-switch">{SCENARIOS.map(item=><button type="button" key={item} className={scenario===item?"active":""} onClick={()=>setScenario(item)}>{scenarioLabel(item,zh)}</button>)}</div></label>
      <div className="v22-source-row"><span>{m.source}</span><strong>{sourceVideo?.label??sourceVideo?.originalName??sourceVideo?.id??m.noVideo}</strong></div>
      <button type="button" className="button primary v22-generate" disabled={!sourceVideo||busyAction!==null} onClick={()=>void generate()}>{busyAction==="generate"?m.generating:m.generate}</button>
      {error?<div className="v22-workflow-error" role="alert">{error}</div>:null}
    </section>
  </div>;

  const activeCheckpoint=workflow.checkpoints.find(checkpoint=>checkpoint.status==="waiting_review");
  const failedStage=workflow.stageExecutions.find(stage=>stage.status==="failed"||stage.status==="interrupted");
  const finalStage=workflow.stageExecutions.find(stage=>stage.stageId==="FINAL_RENDER");const finalJobId=finalStage?.jobIds.at(-1);const finalArtifact=workflow.artifacts.find(artifact=>artifact.stageId==="FINAL_RENDER"&&artifact.kind==="final-render");
  const canCancel=!TERMINAL_RUNS.has(workflow.status);const canNew=TERMINAL_RUNS.has(workflow.status);

  return <div className="v22-workflow-panel" data-workflow-state={workflow.status}>
    <section className="v22-workflow-run-head">
      <div><small>WORKFLOW · {scenarioLabel(workflow.scenario,zh)}</small><h3>{m.title}</h3><span className={`v22-run-status ${workflow.status}`}>{workflowRunStatusLabel(locale,workflow.status)}</span></div>
      <div className="v22-run-meta"><span>{m.revision}</span><strong>{workflow.lastKnownProjectRevision}</strong><code title={workflow.id}>{workflow.id.slice(0,8)}</code></div>
    </section>

    {notice?<div className="v22-workflow-notice" role="status">{notice}</div>:null}{error?<div className="v22-workflow-error" role="alert">{error}</div>:null}

    {workflow.status==="waiting_review"&&activeCheckpoint?<section className="v22-review-card" data-review-stage={activeCheckpoint.stageId}>
      <small>{m.waiting}</small><h4>{activeCheckpoint.stageId==="CONTENT_REVIEW"?m.reviewContent:m.reviewAssembly}</h4><p>{m.reviewHint}</p>
      <div className="v22-review-actions"><button className="button primary" disabled={busyAction!==null} onClick={()=>void runAction({action:"approve",checkpointId:activeCheckpoint.id})}>{m.approve}</button><span>{m.selectReplay}</span></div>
    </section>:null}

    <section className="v22-workflow-stages"><header><strong>{m.stages}</strong><button className="button small" disabled={busyAction!==null} onClick={()=>void refreshRun(workflow.id)}>{m.refresh}</button></header>
      <div className="v22-stage-list">{workflow.stageExecutions.map(stage=>{
        const canReplay=workflow.status==="waiting_review"&&stage.status==="completed"&&REPLAYABLE_STAGE_IDS.has(stage.stageId);
        return <div className={`v22-stage-row ${stage.status}`} data-workflow-stage={stage.stageId} key={stage.stageId}>
          <span className="v22-stage-glyph">{statusGlyph(stage.status)}</span><div className="v22-stage-copy"><strong>{workflowStageLabel(locale,stage.stageId)}</strong><small>{workflowStageStatusLabel(locale,stage.status)}{stage.attempt?` · ${m.attempt} ${stage.attempt}`:""}{stage.jobIds.length?` · ${m.jobs} ${stage.jobIds.length}`:""}</small>{stage.error?<em>{stage.error.message}</em>:null}</div>
          {canReplay?<button className="button small" disabled={busyAction!==null} onClick={()=>void runAction({action:"replay",stageId:stage.stageId})}>{m.replay}</button>:null}
        </div>;
      })}</div>
    </section>

    {currentJob?<section className="v22-current-job"><small>{m.currentJob}</small><strong>{currentJob.type}</strong><span>{currentJob.status} · {Math.round(currentJob.progress*100)}%</span><code title={currentJob.id}>{currentJob.id}</code></section>:null}

    <section className="v22-workflow-controls">
      {workflow.status==="pending"?<button className="button primary" disabled={busyAction!==null} onClick={()=>void runAction({action:"start"})}>{m.generate}</button>:null}
      {workflow.status==="running"?<button className="button" disabled={busyAction!==null} onClick={()=>void runAction({action:"pause"})}>{m.pause}</button>:null}
      {workflow.status==="paused"?<button className="button primary" disabled={busyAction!==null} onClick={()=>void runAction({action:"resume"})}>{m.resume}</button>:null}
      {(workflow.status==="failed"||workflow.status==="interrupted")&&failedStage?<button className="button primary" disabled={busyAction!==null||failedStage.error?.retryable===false} onClick={()=>void runAction({action:"retry",stageId:failedStage.stageId})}>{m.retry}</button>:null}
      {canCancel?<button className="button danger" disabled={busyAction!==null} onClick={()=>void runAction({action:"cancel"})}>{m.cancel}</button>:null}
      {canNew?<button className="button primary" disabled={!sourceVideo||busyAction!==null} onClick={()=>void generate()}>{m.generate}</button>:null}
    </section>

    {workflow.status==="completed"&&finalJobId?<section className="v22-final-card"><small>{m.final}</small><strong>{finalArtifact?.relativePath??finalJobId}</strong><a className="button primary" href={`/api/renders/${encodeURIComponent(finalJobId)}/output`}>{zh?"下载 MP4":"Download MP4"}</a></section>:null}

    <section className="v22-workflow-activity"><header><strong>{m.activity}</strong><span>{activity.length}</span></header>{activity.length?<div>{activity.slice(-10).reverse().map(item=><p key={item.id}><time>{new Date(item.at).toLocaleTimeString(locale)}</time><span>{item.event}</span>{item.stageId?<code>{workflowStageLabel(locale,item.stageId)}</code>:null}</p>)}</div>:<p className="hint">—</p>}</section>
  </div>;
};