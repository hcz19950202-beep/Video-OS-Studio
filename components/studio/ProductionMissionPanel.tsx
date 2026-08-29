"use client";

import {useEffect,useState} from "react";
import styles from "@/components/studio/ProductionMissionPanel.module.css";
import {cancelProductionMission,createProductionMission,getProductionWorkspace,listProductionMissions,updateProductionMission} from "@/lib/client/production-workspace";
import {toClientErrorState} from "@/lib/client/api";
import type {ProductionMission} from "@/lib/production/mission/schema";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";
import type {Project} from "@/schemas/project";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

const dynamicStates=new Set(["planning","running","retrying"]);
const shortId=(value:string)=>value.length>18?`${value.slice(0,8)}…${value.slice(-6)}`:value;
const percent=(value:number)=>`${Math.max(0,Math.min(100,value))}%`;

export const ProductionMissionPanel=({project}:{project:Project})=>{
  const{locale}=useStudioPreferences();const zh=locale==="zh-CN";
  const[missions,setMissions]=useState<ProductionMission[]>([]);
  const[selectedMissionId,setSelectedMissionId]=useState<string>("");
  const[workspace,setWorkspace]=useState<ProductionWorkspaceSnapshot|null>(null);
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const[creating,setCreating]=useState(false);
  const[title,setTitle]=useState("");
  const[brief,setBrief]=useState("");
  const[newMode,setNewMode]=useState<ProductionMission["autonomyPolicy"]["mode"]>("guided");
  const[newFinalReview,setNewFinalReview]=useState(true);

  const projectId=project.project.id;
  const pollingMissionId=workspace?.mission.id;
  const pollingState=workspace?.activity.state;

  const refreshList=async(preferredId?:string)=>{
    const next=await listProductionMissions(projectId);
    setMissions(next);
    setSelectedMissionId(current=>{
      const candidate=preferredId??current;
      if(candidate&&next.some(item=>item.id===candidate))return candidate;
      return next[0]?.id??"";
    });
    return next;
  };

  const refreshWorkspace=async(id=selectedMissionId)=>{
    if(!id){setWorkspace(null);return null;}
    const next=await getProductionWorkspace(projectId,id);setWorkspace(next);return next;
  };

  useEffect(()=>{
    let active=true;
    void listProductionMissions(projectId).then(next=>{
      if(!active)return;
      setMissions(next);setSelectedMissionId(next[0]?.id??"");
      if(next.length===0)setLoading(false);
    }).catch(caught=>{if(active){setError(toClientErrorState(caught).message);setLoading(false);}});
    return()=>{active=false;};
  },[projectId]);

  useEffect(()=>{
    if(!selectedMissionId)return;
    let active=true;
    void getProductionWorkspace(projectId,selectedMissionId).then(next=>{if(active)setWorkspace(next);}).catch(caught=>{if(active)setError(toClientErrorState(caught).message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[projectId,selectedMissionId]);

  useEffect(()=>{
    if(!pollingMissionId||!pollingState||!dynamicStates.has(pollingState))return;
    const timer=window.setInterval(()=>{void getProductionWorkspace(projectId,pollingMissionId).then(setWorkspace).catch(()=>undefined);},3000);
    return()=>window.clearInterval(timer);
  },[projectId,pollingMissionId,pollingState]);

  const createMission=async()=>{
    if(!title.trim()||!brief.trim()||busy)return;
    setBusy(true);setError(null);
    try{
      const mission=await createProductionMission(projectId,{title:title.trim(),brief:brief.trim(),autonomyPolicy:{mode:newMode,finalReviewRequired:newFinalReview}});
      setLoading(true);setWorkspace(null);
      await refreshList(mission.id);setTitle("");setBrief("");setCreating(false);
    }catch(caught){setError(toClientErrorState(caught).message);setLoading(false);}finally{setBusy(false);}
  };

  const updateAutonomy=async(mode:ProductionMission["autonomyPolicy"]["mode"],finalReviewRequired=workspace?.mission.autonomyPolicy.finalReviewRequired??true)=>{
    if(!workspace||busy)return;setBusy(true);setError(null);
    try{
      const next=await updateProductionMission(projectId,workspace.mission.id,{autonomyPolicy:{mode,finalReviewRequired}});setWorkspace(next);setMissions(current=>current.map(item=>item.id===next.mission.id?next.mission:item));
    }catch(caught){setError(toClientErrorState(caught).message);}finally{setBusy(false);}
  };

  const cancelMission=async()=>{
    if(!workspace||busy)return;setBusy(true);setError(null);
    try{const next=await cancelProductionMission(projectId,workspace.mission.id);setWorkspace(next);setMissions(current=>current.map(item=>item.id===next.mission.id?next.mission:item));}
    catch(caught){setError(toClientErrorState(caught).message);}finally{setBusy(false);}
  };

  const manualRefresh=async()=>{
    setLoading(true);setError(null);
    try{await refreshList(selectedMissionId);await refreshWorkspace(selectedMissionId);}catch(caught){setError(toClientErrorState(caught).message);}finally{setLoading(false);}
  };

  const selectMission=(missionId:string)=>{
    setError(null);setLoading(true);setWorkspace(null);setSelectedMissionId(missionId);
  };

  const executionByStep=new Map(workspace?.execution?.steps.map(step=>[step.stepId,step])??[]);
  const terminal=workspace?.mission.status==="completed"||workspace?.mission.status==="cancelled";

  return <div className={`${styles.root} b5c-mission-workspace`}>
    <section className="b5c-mission-toolbar">
      <div><small>AUTONOMOUS PRODUCTION · MISSION</small><strong>{zh?"生产任务工作区":"Production Mission Workspace"}</strong></div>
      <div className="b5c-mission-toolbar-actions">
        <select aria-label={zh?"生产任务":"Production mission"} value={selectedMissionId} disabled={busy||loading||missions.length===0} onChange={event=>selectMission(event.target.value)}>
          {missions.length===0?<option value="">{zh?"暂无生产任务":"No missions"}</option>:missions.map(item=><option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}
        </select>
        <button type="button" className="button small" disabled={busy} onClick={()=>void manualRefresh()}>{zh?"刷新":"Refresh"}</button>
        <button type="button" className="button small" disabled={busy} onClick={()=>setCreating(value=>!value)}>{zh?"新任务":"New mission"}</button>
      </div>
    </section>

    {creating?<section className="b5c-mission-create">
      <header><strong>{zh?"创建生产任务":"Create Production Mission"}</strong><small>{zh?"只创建目标与自治策略，不会自动执行。":"Creates durable intent and autonomy policy only; it does not start execution."}</small></header>
      <label>{zh?"任务名称":"Mission title"}<input value={title} maxLength={200} onChange={event=>setTitle(event.target.value)}/></label>
      <label>{zh?"生产目标 / 简报":"Production brief"}<textarea value={brief} maxLength={10000} rows={4} onChange={event=>setBrief(event.target.value)}/></label>
      <div className="b5c-mission-create-row"><label>{zh?"自治模式":"Autonomy mode"}<select value={newMode} onChange={event=>setNewMode(event.target.value as ProductionMission["autonomyPolicy"]["mode"])}><option value="assist">Assist</option><option value="guided">Guided</option><option value="auto">Auto</option><option value="full-production">Full Production</option></select></label><label className="b5c-check"><input type="checkbox" checked={newFinalReview} onChange={event=>setNewFinalReview(event.target.checked)}/>{zh?"最终成片必须复核":"Require final review"}</label></div>
      <div><button type="button" className="button small" disabled={busy||!title.trim()||!brief.trim()} onClick={()=>void createMission()}>{zh?"创建任务":"Create mission"}</button></div>
    </section>:null}

    {error?<div className="b5c-mission-error" role="alert">{error}</div>:null}
    {loading&&!workspace?<section className="b5c-mission-empty">{zh?"正在读取持久化生产状态…":"Loading durable production state…"}</section>:null}
    {!loading&&!workspace&&!creating?<section className="b5c-mission-empty"><strong>{zh?"还没有生产任务":"No Production Mission yet"}</strong><p>{zh?"创建任务后，这里会显示真实的 Plan、Execution、QA 与证据状态。":"Create a Mission to inspect its real Plan, Execution, QA, and evidence state here."}</p></section>:null}

    {workspace?<>
      <section className="b5c-mission-hero">
        <div><small>{workspace.activity.state.toUpperCase()}</small><h3>{workspace.mission.title}</h3><p>{workspace.mission.brief}</p></div>
        <div className="b5c-mission-hero-meta"><span>Project rev {workspace.project.currentRevision}</span><span>{zh?"最终状态":"Final readiness"}: {workspace.finalRenderReadiness}</span><span>QA: {workspace.qa.state}</span></div>
      </section>

      {workspace.stale.plan||workspace.stale.execution||workspace.stale.qa?<div className="b5c-mission-warning">{zh?"当前 Project 与计划 / 执行 / QA 证据存在版本漂移。工作区按 fail-closed 显示为 stale，不会把旧证据当成当前成片。":"Current Project revision has drifted from Plan, Execution, or QA evidence. The Workspace fails closed and will not present stale evidence as current output."}</div>:null}

      <section className="b5c-mission-grid">
        <article className="b5c-card"><header><small>{zh?"进度":"PROGRESS"}</small><strong>{workspace.progress.completedSteps}/{workspace.progress.totalSteps}</strong></header><div className="b5c-progress"><span style={{width:percent(workspace.progress.percent)}}/></div><p>{workspace.progress.percent.toFixed(1)}% · {workspace.activity.title??workspace.activity.state}</p></article>
        <article className="b5c-card"><header><small>{zh?"自治策略":"AUTONOMY"}</small><strong>{workspace.mission.autonomyPolicy.mode}</strong></header><select aria-label={zh?"自治模式":"Autonomy mode"} value={workspace.mission.autonomyPolicy.mode} disabled={busy||terminal} onChange={event=>void updateAutonomy(event.target.value as ProductionMission["autonomyPolicy"]["mode"])}><option value="assist">Assist</option><option value="guided">Guided</option><option value="auto">Auto</option><option value="full-production">Full Production</option></select><label className="b5c-check"><input type="checkbox" checked={workspace.mission.autonomyPolicy.finalReviewRequired} disabled={busy||terminal} onChange={event=>void updateAutonomy(workspace.mission.autonomyPolicy.mode,event.target.checked)}/>{zh?"最终复核":"Final review"}</label></article>
        <article className="b5c-card"><header><small>{zh?"当前活动":"CURRENT ACTIVITY"}</small><strong>{workspace.activity.state}</strong></header><p>{workspace.activity.title??(zh?"当前没有活动步骤":"No active step")}</p>{workspace.activity.stepId?<code>{workspace.activity.stepId}</code>:null}</article>
        <article className="b5c-card"><header><small>{zh?"最终成片":"FINAL OUTPUT"}</small><strong>{workspace.finalRenderReadiness}</strong></header><p>{zh?"由真实 render / QA / revision 证据派生，不使用浏览器模拟状态。":"Derived from durable render, QA, and revision evidence; never browser-simulated."}</p></article>
      </section>

      <section className="b5c-section"><header><div><small>PLAN</small><strong>{zh?"生产步骤":"Production steps"}</strong></div><em>{workspace.plan?`rev ${workspace.plan.baseProjectRevision}`:zh?"尚未生成 Plan":"No Plan yet"}</em></header>{workspace.plan?<div className="b5c-step-list">{workspace.plan.steps.map((step,index)=>{const state=executionByStep.get(step.id);return <article key={step.id} className={`b5c-step ${state?.status??"pending"}`}><b>{index+1}</b><div><strong>{step.title}</strong><small>{step.kind} · {step.owner} · {step.risk}</small><p>{step.objective}</p></div><em>{state?.status??"planned"}</em></article>;})}</div>:<p>{zh?"Mission 当前还没有关联的 immutable Production Plan。":"This Mission does not yet reference an immutable Production Plan."}</p>}</section>

      <section className="b5c-section"><header><div><small>REVIEW</small><strong>{zh?"复核检查点":"Review checkpoints"}</strong></div><em>{workspace.reviewCheckpoints.length}</em></header>{workspace.reviewCheckpoints.length?workspace.reviewCheckpoints.map(item=><article className="b5c-review" key={item.checkpoint.id}><div><strong>{item.title}</strong><small>{item.stepId} · {item.risk}</small><p>{item.checkpoint.reason}</p></div><em>{item.checkpoint.status}</em></article>):<p>{zh?"当前没有持久化复核检查点。":"No durable review checkpoint is currently recorded."}</p>}<p className="b5c-boundary-note">{zh?"B5c 只展示真实 checkpoint。当前 server runtime 尚未接入 concrete protected executor，因此这里不会伪造“批准并继续”按钮。":"B5c displays real checkpoints only. The server runtime does not yet expose a concrete protected executor, so this panel does not fake an Approve-and-continue action."}</p></section>

      <section className="b5c-mission-grid b5c-secondary-grid">
        <article className="b5c-card"><header><small>AGENT</small><strong>{zh?"会话引用":"Conversation refs"}</strong></header>{workspace.links.agentSessionIds.length?workspace.links.agentSessionIds.map(id=><code key={id}>{shortId(id)}</code>):<p>—</p>}<p>{zh?"完整会话继续由 Agent 工作区持有。":"Full conversation truth remains in the Agent workspace."}</p></article>
        <article className="b5c-card"><header><small>WORKFLOW / JOB</small><strong>{workspace.links.workflowRunIds.length} / {workspace.links.jobIds.length}</strong></header>{workspace.links.workflowRunIds.slice(0,4).map(id=><code key={id}>WF {shortId(id)}</code>)}{workspace.links.jobIds.slice(0,4).map(id=><code key={id}>JOB {shortId(id)}</code>)}</article>
        <article className="b5c-card"><header><small>SKILLS</small><strong>{workspace.skillsUsed.length}</strong></header>{workspace.skillsUsed.length?workspace.skillsUsed.map(id=><code key={id}>{id}</code>):<p>—</p>}</article>
        <article className="b5c-card"><header><small>EVIDENCE</small><strong>{workspace.evidence.length}</strong></header>{workspace.evidence.slice(0,8).map(item=><code key={`${item.source}-${item.kind}-${item.id}`}>{item.kind} · {shortId(item.id)}</code>)}</article>
      </section>

      <section className="b5c-section"><header><div><small>QA</small><strong>{zh?"质量检查":"Quality findings"}</strong></div><em>{workspace.qa.state} · {workspace.qa.pass}/{workspace.qa.fail}/{workspace.qa.notEvaluated}</em></header>{workspace.latestQA?<div className="b5c-qa-list">{workspace.latestQA.findings.map(item=><article key={item.id} className={`b5c-qa ${item.status}`}><div><strong>{item.message}</strong><small>{item.category} · {item.severity} · {item.id}</small></div><em>{item.status}</em></article>)}</div>:<p>{zh?"尚无 QA Report。":"No QA Report yet."}</p>}</section>

      <section className="b5c-mission-actions"><button type="button" className="button small" disabled={busy||terminal} onClick={()=>void cancelMission()}>{zh?"取消任务":"Cancel mission"}</button><small>{zh?"取消会写入 durable Mission 状态；不会删除 Project、Plan、Execution 或 QA 证据。":"Cancellation updates durable Mission state; it does not delete Project, Plan, Execution, or QA evidence."}</small></section>
    </>:null}
  </div>;
};
