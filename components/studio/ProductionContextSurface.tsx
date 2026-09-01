"use client";

import {useEffect,useMemo,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {getProductionWorkspace,listProductionMissions} from "@/lib/client/production-workspace";
import type {ProductionMission} from "@/lib/production/mission/schema";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

export type ProductionContextMode="mission"|"qa";
const dynamicStates=new Set(["planning","running","retrying","repairing"]);
const percent=(value:number)=>`${Math.max(0,Math.min(100,value)).toFixed(1)}%`;
const shortId=(value:string)=>value.length>22?`${value.slice(0,9)}…${value.slice(-7)}`:value;

export const ProductionContextSurface=({project,mode}:{project:Project;mode:ProductionContextMode})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const[missions,setMissions]=useState<ProductionMission[]>([]);
  const[selectedMissionId,setSelectedMissionId]=useState("");
  const[workspace,setWorkspace]=useState<ProductionWorkspaceSnapshot|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  const selectContextTarget=useSelectionStore(state=>state.selectContextTarget);
  const setContextSelectionMode=useSelectionStore(state=>state.setContextSelectionMode);
  const projectId=project.project.id;

  useEffect(()=>{
    let active=true;
    setLoading(true);setError(null);setWorkspace(null);
    void listProductionMissions(projectId).then(async next=>{
      if(!active)return;
      setMissions(next);
      const missionId=next[0]?.id??"";
      setSelectedMissionId(missionId);
      if(!missionId){setLoading(false);return;}
      const snapshot=await getProductionWorkspace(projectId,missionId);
      if(active){setWorkspace(snapshot);setLoading(false);}
    }).catch(caught=>{if(active){setError(caught instanceof Error?caught.message:String(caught));setLoading(false);}});
    return()=>{active=false;};
  },[projectId]);

  useEffect(()=>{
    if(!selectedMissionId)return;
    let active=true;
    setLoading(true);setError(null);
    void getProductionWorkspace(projectId,selectedMissionId).then(next=>{if(active){setWorkspace(next);setLoading(false);}}).catch(caught=>{if(active){setError(caught instanceof Error?caught.message:String(caught));setLoading(false);}});
    return()=>{active=false;};
  },[projectId,selectedMissionId]);

  const activityState=workspace?.activity.state;
  useEffect(()=>{
    if(!selectedMissionId||!activityState||!dynamicStates.has(activityState))return;
    let active=true;
    const timer=window.setInterval(()=>{
      void getProductionWorkspace(projectId,selectedMissionId).then(next=>{if(active&&next.mission.id===selectedMissionId)setWorkspace(next);}).catch(()=>undefined);
    },3000);
    return()=>{active=false;window.clearInterval(timer);};
  },[activityState,projectId,selectedMissionId]);

  const executionByStep=useMemo(()=>new Map(workspace?.execution?.steps.map(step=>[step.stepId,step])??[]),[workspace?.execution]);
  const sceneById=useMemo(()=>new Map(project.scenes.map(scene=>[scene.id,scene])),[project.scenes]);
  const repairActionByFinding=useMemo(()=>{
    const map=new Map<string,NonNullable<ProductionWorkspaceSnapshot["latestQA"]>["repairProposal"] extends infer T?T:never>();
    return map;
  },[]);
  const findingLocations=useMemo(()=>{
    const result=new Map<string,{sceneId:string;sceneName:string;startFrame:number}>();
    for(const action of workspace?.latestQA?.repairProposal?.actions??[]){
      if(!action.sceneId)continue;
      const scene=sceneById.get(action.sceneId);
      if(!scene)continue;
      for(const findingId of action.findingIds)if(!result.has(findingId))result.set(findingId,{sceneId:scene.id,sceneName:scene.name,startFrame:scene.startFrame});
    }
    return result;
  },[sceneById,workspace?.latestQA?.repairProposal?.actions]);

  const askAgentMissionStep=(stepId:string,title:string)=>{
    if(!workspace)return;
    setContextSelectionMode(true);
    selectContextTarget({kind:"mission-step",label:title,target:{missionId:workspace.mission.id,stepId}});
  };
  const askAgentFinding=(findingId:string,message:string)=>{
    const reportId=workspace?.latestQA?.id;
    if(!reportId)return;
    setContextSelectionMode(true);
    selectContextTarget({kind:"qa-finding",label:message.slice(0,120),target:{reportId,findingId}});
  };

  if(error)return <div className={styles.productionContextState} role="alert">{error}</div>;
  if(loading&&!workspace)return <div className={styles.productionContextState}>{zh?"正在读取持久化生产状态…":"Loading durable production state…"}</div>;
  if(!workspace)return <div className={styles.productionContextState}>{zh?"当前项目还没有 Production Mission。":"No Production Mission exists for this project yet."}</div>;

  const stale=workspace.stale.plan||workspace.stale.execution||workspace.stale.qa;
  const findings=workspace.latestQA?.findings??[];
  const actions=workspace.latestQA?.repairProposal?.actions??[];

  return <section className={styles.productionContext} data-testid={`production-context-${mode}`}>
    <header className={styles.productionContextHeader}>
      <div><small>{mode==="mission"?"MISSION":"QA"}</small><strong>{workspace.mission.title}</strong></div>
      {missions.length>1?<select aria-label={zh?"生产任务":"Production mission"} value={selectedMissionId} onChange={event=>setSelectedMissionId(event.target.value)}>{missions.map(mission=><option key={mission.id} value={mission.id}>{mission.title} · {mission.status}</option>)}</select>:null}
    </header>

    {stale?<div className={styles.productionContextWarning}>{zh?"Project revision 与 Production 证据存在漂移；此处按 fail-closed 显示。":"Project revision has drifted from Production evidence; this surface fails closed."}</div>:null}

    {mode==="mission"?<>
      <div className={styles.productionContextStats}>
        <div><strong>{workspace.activity.state}</strong><span>{zh?"当前状态":"Activity"}</span></div>
        <div><strong>{percent(workspace.progress.percent)}</strong><span>{workspace.progress.completedSteps}/{workspace.progress.totalSteps}</span></div>
        <div><strong>{workspace.finalRenderReadiness}</strong><span>{zh?"最终就绪":"Readiness"}</span></div>
      </div>
      <div className={styles.productionContextSection}>
        <header><strong>{zh?"生产步骤":"Production steps"}</strong><span>Project rev {workspace.project.currentRevision}</span></header>
        {workspace.plan?.steps.length?workspace.plan.steps.map((step,index)=>{const execution=executionByStep.get(step.id);return <article className={styles.productionContextRow} key={step.id}>
          <div className={styles.productionContextIndex}>{index+1}</div>
          <div><strong>{step.title}</strong><span>{step.kind} · {step.owner} · {execution?.status??"planned"}</span><p>{step.objective}</p></div>
          <button type="button" className="button secondary small" data-testid={`ask-agent-mission-step-${step.id}`} onClick={()=>askAgentMissionStep(step.id,step.title)}>@ {zh?"问 Agent":"Ask Agent"}</button>
        </article>}):<p className={styles.productionContextEmpty}>{zh?"尚未生成 Production Plan。":"No Production Plan yet."}</p>}
      </div>
      <div className={styles.productionContextSection}>
        <header><strong>{zh?"证据":"Evidence"}</strong><span>{workspace.evidence.length}</span></header>
        <div className={styles.productionEvidenceList}>{workspace.evidence.length?workspace.evidence.slice(0,24).map(item=><span key={`${item.source}-${item.kind}-${item.id}`}>{item.kind} · {shortId(item.id)} · {item.source}</span>):<p className={styles.productionContextEmpty}>{zh?"暂无持久化证据。":"No durable evidence yet."}</p>}</div>
      </div>
    </>:<>
      <div className={styles.productionContextStats}>
        <div><strong>{workspace.qa.state}</strong><span>QA</span></div>
        <div><strong>{workspace.qa.pass}</strong><span>PASS</span></div>
        <div><strong>{workspace.qa.fail}/{workspace.qa.notEvaluated}</strong><span>FAIL / N-E</span></div>
      </div>
      {workspace.stale.qa?<div className={styles.productionContextWarning}>{zh?"QA report 与当前 Project revision 不一致。":"QA report does not match the current Project revision."}</div>:null}
      <div className={styles.productionContextSection}>
        <header><strong>{zh?"质量发现":"QA findings"}</strong><span>{findings.length}</span></header>
        {findings.length?findings.slice(0,32).map(finding=>{const location=findingLocations.get(finding.id);return <article className={styles.productionContextRow} key={finding.id} data-qa-status={finding.status}>
          <div className={styles.productionFindingStatus}>{finding.severity}</div>
          <div><strong>{finding.category} · {finding.status}</strong><p>{finding.message}</p>{location?<span>{location.sceneName} · f{location.startFrame}</span>:null}</div>
          <button type="button" className="button secondary small" data-testid={`ask-agent-qa-finding-${finding.id}`} onClick={()=>askAgentFinding(finding.id,finding.message)}>@ {zh?"问 Agent":"Ask Agent"}</button>
        </article>}):<p className={styles.productionContextEmpty}>{zh?"尚无 QA report。":"No QA report yet."}</p>}
      </div>
      <div className={styles.productionContextSection}>
        <header><strong>{zh?"修复建议":"Repair requests"}</strong><span>{actions.length}</span></header>
        {actions.length?<div className={styles.productionEvidenceList}>{actions.map((action,index)=><span key={`${action.kind}-${index}`}><b>{action.kind}</b> · {action.summary}{action.sceneId?` · ${sceneById.get(action.sceneId)?.name??action.sceneId}`:""}</span>)}</div>:<p className={styles.productionContextEmpty}>{zh?"当前没有 repair proposal。":"No repair proposal is available."}</p>}
        {workspace.latestQA?.repairProposal?.requiresReview?<div className={styles.productionContextWarning}>{zh?"Repair Proposal 需要明确复核；Context Dock 不会自动执行修复。":"Repair Proposal requires explicit review; Context Dock never executes it automatically."}</div>:null}
      </div>
    </>}
  </section>;
};
