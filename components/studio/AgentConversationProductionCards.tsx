"use client";

import {useEffect,useState} from "react";
import {getProductionWorkspace,listProductionMissions} from "@/lib/client/production-workspace";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";
import {useSelectionStore} from "@/store/selection-store";

const dynamicStates=new Set(["planning","running","retrying"]);

export const AgentConversationProductionCards=({projectId,zh,onOpenMission}:{projectId:string;zh:boolean;onOpenMission?:()=>void})=>{
  const[workspace,setWorkspace]=useState<ProductionWorkspaceSnapshot|null>(null);
  const[missionCount,setMissionCount]=useState(0);
  const[loading,setLoading]=useState(true);
  const[unavailable,setUnavailable]=useState(false);
  const selectContextTarget=useSelectionStore(state=>state.selectContextTarget);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{
        const missions=await listProductionMissions(projectId);
        if(!active)return;
        setMissionCount(missions.length);
        if(missions.length===0){setWorkspace(null);setUnavailable(false);setLoading(false);return;}
        const next=await getProductionWorkspace(projectId,missions[0].id);
        if(active){setWorkspace(next);setUnavailable(false);setLoading(false);}
      }catch{
        if(active){setWorkspace(null);setUnavailable(true);setLoading(false);}
      }
    };
    void load();
    return()=>{active=false;};
  },[projectId]);

  const missionId=workspace?.mission.id;
  const activityState=workspace?.activity.state;
  useEffect(()=>{
    if(!missionId||!activityState||!dynamicStates.has(activityState))return;
    let active=true;
    const timer=window.setInterval(()=>{
      void getProductionWorkspace(projectId,missionId).then(next=>{if(active&&next.mission.id===missionId)setWorkspace(next);}).catch(()=>undefined);
    },3000);
    return()=>{active=false;window.clearInterval(timer);};
  },[activityState,missionId,projectId]);

  const stale=Boolean(workspace&&(workspace.stale.plan||workspace.stale.execution||workspace.stale.qa));
  const qaFindings=workspace?.latestQA?.findings??[];
  const actionableFindings=qaFindings.filter(finding=>finding.status==="fail"||finding.status==="not-evaluated").slice(0,3);
  const repairActions=workspace?.latestQA?.repairProposal?.actions.slice(0,3)??[];
  const selectMissionStep=()=>{
    const stepId=workspace?.activity.stepId;
    if(!workspace||!stepId)return;
    selectContextTarget({kind:"mission-step",label:workspace.activity.title??`Mission step ${stepId}`,target:{missionId:workspace.mission.id,stepId}});
  };
  const selectFinding=(findingId:string,message:string)=>{
    const reportId=workspace?.latestQA?.id;
    if(!reportId)return;
    selectContextTarget({kind:"qa-finding",label:message.slice(0,120),target:{reportId,findingId}});
  };

  return <section className="a4-agent-production-cards" data-testid="agent-production-cards">
    <article className="a4-agent-production-card" data-testid="agent-mission-card">
      <header><small>MISSION</small><strong>{loading?(zh?"读取中":"Loading"):workspace?workspace.activity.state:(unavailable?(zh?"状态不可用":"Unavailable"):(zh?"暂无任务":"No mission"))}</strong></header>
      {workspace?<><p>{workspace.mission.title}</p><span>{workspace.progress.completedSteps}/{workspace.progress.totalSteps} · {workspace.progress.percent.toFixed(1)}%</span><span>{zh?"最终就绪":"Final readiness"}: {workspace.finalRenderReadiness}</span>{workspace.activity.title?<span>{zh?"当前":"Current"}: {workspace.activity.title}</span>:null}{stale?<em>{zh?"证据已过期，按 fail-closed 处理":"Evidence is stale; fail-closed"}</em>:null}</>:<p>{unavailable?(zh?"无法读取当前持久化 Mission 状态。":"Unable to read durable Mission state."):(zh?`当前项目有 ${missionCount} 个生产任务。`:`${missionCount} production missions for this project.`)}</p>}
      <div className="a4-agent-review-actions">{workspace?.activity.stepId?<button type="button" className="button secondary small" data-testid="select-mission-step-context" onClick={selectMissionStep}>@ {zh?"选择当前步骤":"Select current step"}</button>:null}{onOpenMission?<button type="button" className="button secondary small" onClick={onOpenMission}>{zh?"任务详情":"Mission details"}</button>:null}</div>
    </article>
    <article className="a4-agent-production-card" data-testid="agent-qa-card">
      <header><small>QA</small><strong>{workspace?workspace.qa.state:(zh?"暂无 QA":"No QA")}</strong></header>
      {workspace?<>
        <p>{zh?"真实 QA 证据":"Durable QA evidence"} · {qaFindings.length}</p>
        <span>PASS {workspace.qa.pass} · FAIL {workspace.qa.fail} · N/E {workspace.qa.notEvaluated}</span>
        {actionableFindings.length?<div className="a4-agent-qa-findings" data-testid="agent-qa-findings">{actionableFindings.map(finding=><span key={finding.id}><b>{finding.severity} · {finding.category}</b>{finding.message}<button type="button" className="button secondary small" data-testid={`select-qa-context-${finding.id}`} onClick={()=>selectFinding(finding.id,finding.message)}>@ {zh?"选择":"Select"}</button></span>)}</div>:null}
        {repairActions.length?<div className="a4-agent-qa-actions" data-testid="agent-qa-actions"><strong>{zh?"建议动作":"Repair actions"}</strong>{repairActions.map((action,index)=><span key={`${action.kind}-${index}`}><b>{action.kind}</b>{action.summary}</span>)}</div>:null}
        {workspace.latestQA?.repairProposal?.requiresReview?<em>{zh?"修复方案需要明确复核，不会由此卡片自动执行。":"Repair proposal requires explicit review and is never auto-executed from this card."}</em>:null}
        {workspace.stale.qa?<em>{zh?"QA 与当前 Project revision 不一致":"QA does not match current Project revision"}</em>:null}
      </>:<p>{zh?"QA 卡片只读取 Production Workspace，不复制 QA 真相。":"This card reads Production Workspace only; it does not duplicate QA truth."}</p>}
      {onOpenMission&&workspace?<button type="button" className="button secondary small" onClick={onOpenMission}>{zh?"查看 QA 证据":"View QA evidence"}</button>:null}
    </article>
  </section>;
};
