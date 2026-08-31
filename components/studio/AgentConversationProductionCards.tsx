"use client";

import {useEffect,useState} from "react";
import {getProductionWorkspace,listProductionMissions} from "@/lib/client/production-workspace";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";

const dynamicStates=new Set(["planning","running","retrying"]);

export const AgentConversationProductionCards=({projectId,zh,onOpenMission}:{projectId:string;zh:boolean;onOpenMission?:()=>void})=>{
  const[workspace,setWorkspace]=useState<ProductionWorkspaceSnapshot|null>(null);
  const[missionCount,setMissionCount]=useState(0);
  const[loading,setLoading]=useState(true);
  const[unavailable,setUnavailable]=useState(false);

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
  const qaFindings=workspace?.latestQA?.findings.length??0;

  return <section className="a4-agent-production-cards" data-testid="agent-production-cards">
    <article className="a4-agent-production-card" data-testid="agent-mission-card">
      <header><small>MISSION</small><strong>{loading?(zh?"读取中":"Loading"):workspace?workspace.activity.state:(unavailable?(zh?"状态不可用":"Unavailable"):(zh?"暂无任务":"No mission"))}</strong></header>
      {workspace?<><p>{workspace.mission.title}</p><span>{workspace.progress.completedSteps}/{workspace.progress.totalSteps} · {workspace.progress.percent.toFixed(1)}%</span><span>{zh?"最终就绪":"Final readiness"}: {workspace.finalRenderReadiness}</span>{stale?<em>{zh?"证据已过期，按 fail-closed 处理":"Evidence is stale; fail-closed"}</em>:null}</>:<p>{unavailable?(zh?"无法读取当前持久化 Mission 状态。":"Unable to read durable Mission state."):(zh?`当前项目有 ${missionCount} 个生产任务。`:`${missionCount} production missions for this project.`)}</p>}
      {onOpenMission?<button type="button" className="button secondary small" onClick={onOpenMission}>{zh?"任务详情":"Mission details"}</button>:null}
    </article>
    <article className="a4-agent-production-card" data-testid="agent-qa-card">
      <header><small>QA</small><strong>{workspace?workspace.qa.state:(zh?"暂无 QA":"No QA")}</strong></header>
      {workspace?<><p>{zh?"真实 QA 证据":"Durable QA evidence"} · {qaFindings}</p><span>PASS {workspace.qa.pass} · FAIL {workspace.qa.fail} · N/E {workspace.qa.notEvaluated}</span>{workspace.stale.qa?<em>{zh?"QA 与当前 Project revision 不一致":"QA does not match current Project revision"}</em>:null}</>:<p>{zh?"QA 卡片只读取 Production Workspace，不复制 QA 真相。":"This card reads Production Workspace only; it does not duplicate QA truth."}</p>}
      {onOpenMission&&workspace?<button type="button" className="button secondary small" onClick={onOpenMission}>{zh?"查看 QA 证据":"View QA evidence"}</button>:null}
    </article>
  </section>;
};
