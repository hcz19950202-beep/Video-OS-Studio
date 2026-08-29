"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {ProductionCampaignDashboard} from "@/lib/production/campaign/dashboard";
import styles from "@/components/campaign/CampaignDashboard.module.css";

type Action=
  |{action:"enqueue"}
  |{action:"run"}
  |{action:"resume"}
  |{action:"retry-failed"}
  |{action:"archive"}
  |{action:"cancel-mission";projectId:string;missionId:string};

type ErrorBody={message?:string};

export function CampaignDashboardClient({initialDashboard}:{initialDashboard:ProductionCampaignDashboard}){
  const[dashboard,setDashboard]=useState(initialDashboard);
  const[busy,setBusy]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const campaign=dashboard.campaign;

  const refresh=useCallback(async()=>{
    const response=await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}`,{cache:"no-store"});
    if(!response.ok)throw new Error("Campaign dashboard refresh failed.");
    const body=await response.json() as {dashboard:ProductionCampaignDashboard};
    setDashboard(body.dashboard);
  },[campaign.id]);

  useEffect(()=>{
    if(!busy)return;
    const timer=window.setInterval(()=>{void refresh().catch(()=>undefined);},1500);
    return()=>window.clearInterval(timer);
  },[busy,refresh]);

  const runAction=async(action:Action)=>{
    setBusy(action.action);
    setError(null);
    try{
      const response=await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(action),
      });
      if(!response.ok){
        const body=await response.json().catch(()=>({})) as ErrorBody;
        throw new Error(body.message??"Campaign action failed.");
      }
      const body=await response.json() as {dashboard:ProductionCampaignDashboard};
      setDashboard(body.dashboard);
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Campaign action failed.");
      await refresh().catch(()=>undefined);
    }finally{setBusy(null);}
  };

  const counts=useMemo(()=>{
    const result={completed:0,running:0,attention:0,pending:0};
    for(const item of campaign.missions){
      if(item.status==="completed")result.completed+=1;
      else if(item.status==="running")result.running+=1;
      else if(item.status==="waiting-review"||item.status==="blocked"||item.status==="failed")result.attention+=1;
      else result.pending+=1;
    }
    return result;
  },[campaign.missions]);

  const shared=[
    ...campaign.sharedReferences.assetIds.map(id=>`asset:${id}`),
    ...campaign.sharedReferences.policyIds.map(id=>`policy:${id}`),
    ...campaign.sharedReferences.skillIds.map(id=>`skill:${id}`),
    ...campaign.sharedReferences.exportTemplateIds.map(id=>`export:${id}`),
  ];
  const canArchive=!(["running","queued","archived"] as const).includes(campaign.status as "running"|"queued"|"archived");

  return <main className={styles.page}><div className={styles.shell}>
    <nav className={styles.nav}><Link href="/">← Video OS Studio</Link><Link href="/campaigns">All Campaigns</Link></nav>
    <header className={styles.header}><div><div className={styles.eyebrow}>Production Campaign · revision {campaign.revision}</div><h1>{campaign.title}</h1><div className={styles.muted}>{campaign.brief??"Batch production across isolated Project truth."}</div></div><div className={styles.actions}>
      <button className={styles.button} disabled={Boolean(busy)} onClick={()=>void refresh().catch(()=>setError("Campaign dashboard refresh failed."))}>Refresh</button>
      {campaign.status==="draft"?<button className={styles.button} disabled={Boolean(busy)} onClick={()=>void runAction({action:"enqueue"})}>Enqueue</button>:null}
      {campaign.status==="draft"||campaign.status==="queued"?<button className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy)} onClick={()=>void runAction({action:"run"})}>{busy==="run"?"Running…":"Run Campaign"}</button>:null}
      {campaign.status==="waiting-review"||campaign.status==="blocked"?<button className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy)} onClick={()=>void runAction({action:"resume"})}>Resume after review/fix</button>:null}
      {campaign.status==="failed"?<button className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy)} onClick={()=>void runAction({action:"retry-failed"})}>Retry failed Missions</button>:null}
      {canArchive?<button className={styles.button} disabled={Boolean(busy)} onClick={()=>void runAction({action:"archive"})}>Archive</button>:null}
    </div></header>
    {error?<div className={styles.error} role="alert">{error}</div>:null}
    <div className={styles.grid}>
      <div className={styles.stat}><span className={styles.muted}>Campaign status</span><strong><span className={styles.status} data-status={campaign.status}>{campaign.status}</span></strong></div>
      <div className={styles.stat}><span className={styles.muted}>Completed</span><strong>{counts.completed}/{campaign.missions.length}</strong></div>
      <div className={styles.stat}><span className={styles.muted}>Running</span><strong>{counts.running}</strong></div>
      <div className={styles.stat}><span className={styles.muted}>Needs attention</span><strong>{counts.attention}</strong></div>
    </div>
    <section className={styles.panel}><div className={styles.panelTitle}><strong>Shared logical references</strong><span className={styles.muted}>Concurrency {campaign.maxConcurrency}</span></div><div className={styles.refs}>{shared.length?shared.map(ref=><span key={ref} className={styles.ref}>{ref}</span>):<span className={styles.muted}>No shared references.</span>}</div></section>
    <section className={styles.panel}><div className={styles.panelTitle}><strong>Mission production state</strong><span className={styles.muted}>{counts.pending} pending/cancelled</span></div><div className={styles.missionList}>{dashboard.missions.map(item=>{
      const live=item.live;
      const run=item.run;
      const cancellable=run.status==="pending"||run.status==="running"||run.status==="waiting-review"||run.status==="blocked";
      return <article className={styles.card} key={`${run.projectId}:${run.missionId}`}><div className={styles.missionHeader}><div><div className={styles.eyebrow}>{run.projectId}</div><h2>{run.missionId}</h2></div><div className={styles.actions}><span className={styles.status} data-status={run.status}>{run.status}</span>{cancellable?<button className={`${styles.button} ${styles.danger}`} disabled={Boolean(busy)} onClick={()=>void runAction({action:"cancel-mission",projectId:run.projectId,missionId:run.missionId})}>Cancel Mission</button>:null}</div></div>
        <div className={styles.missionMeta}><div className={styles.metaItem}><span>Live activity</span><strong>{live?.activity??"unavailable"}</strong></div><div className={styles.metaItem}><span>Progress</span><strong>{live?`${live.progressPercent}%`:"—"}</strong></div><div className={styles.metaItem}><span>QA</span><strong>{live?.qaState??"—"}</strong></div><div className={styles.metaItem}><span>Final readiness</span><strong>{live?.finalRenderReadiness??"—"}</strong></div><div className={styles.metaItem}><span>Project revision</span><strong>{live?.projectRevision??"—"}{live?.stale?" · stale":""}</strong></div></div>
        <div className={styles.progress}><span style={{width:`${live?.progressPercent??0}%`}}/></div>
        {run.currentStep?<div className={styles.message}>Current step: {run.currentStep}</div>:null}
        {run.blocker?<div className={styles.message}>Blocked: {run.blocker}</div>:null}
        {run.error?<div className={styles.message}>Failure: {run.error.code} · {run.error.message}</div>:null}
        {item.unavailable?<div className={styles.message}>{item.unavailable.message}</div>:null}
      </article>;
    })}</div></section>
  </div></main>;
}
