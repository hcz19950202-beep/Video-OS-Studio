"use client";

import {useEffect,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {listAttributedProjectHistory} from "@/lib/client/project-history";
import type {AttributedProjectHistoryTransaction} from "@/lib/project/history-attribution-schema";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import styles from "@/components/studio/AgentNativeWorkspace.module.css";

const shortId=(value:string)=>value.length>20?`${value.slice(0,8)}…${value.slice(-6)}`:value;

export const ProjectHistorySurface=({project}:{project:Project})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const[transactions,setTransactions]=useState<AttributedProjectHistoryTransaction[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  const undoStack=useHistoryStore(state=>state.undoStack);
  const redoStack=useHistoryStore(state=>state.redoStack);
  const undoEntries=undoStack.filter(entry=>entry.projectId===project.project.id);
  const redoEntries=redoStack.filter(entry=>entry.projectId===project.project.id);

  useEffect(()=>{
    let active=true;
    void listAttributedProjectHistory(project.project.id).then(result=>{
      if(active){setTransactions(result.transactions);setError(null);setLoading(false);}
    }).catch(caught=>{
      if(active){setTransactions([]);setError(caught instanceof Error?caught.message:String(caught));setLoading(false);}
    });
    return()=>{active=false;};
  },[project.project.id,project.project.revision]);

  const originLabel=(transaction:AttributedProjectHistoryTransaction)=>{
    switch(transaction.origin?.kind){
      case"human":return zh?"人工":"Human";
      case"builtin-agent":return zh?"内置 Agent":"Built-in Agent";
      case"external-agent":return zh?"外部 Agent":"External Agent";
      case"mission":return "Mission";
      case"workflow":return "Workflow";
      default:return zh?"来源未知":"Unknown origin";
    }
  };
  const originEvidence=(transaction:AttributedProjectHistoryTransaction)=>{
    const origin=transaction.origin;
    if(!origin)return null;
    if(origin.kind==="builtin-agent"||origin.kind==="external-agent")return `session ${shortId(origin.sessionId)} · proposal ${shortId(origin.proposalId)}`;
    if(origin.kind==="mission")return `mission ${shortId(origin.missionId)}`;
    if(origin.kind==="workflow")return `workflow ${shortId(origin.workflowRunId)}`;
    return null;
  };

  return <div className={styles.unifiedHistory} data-testid="unified-project-history">
    <section className={styles.durableHistory}>
      <header><strong>{zh?"持久化逻辑历史":"Durable logical history"}</strong><span>{transactions.length}</span></header>
      {loading?<p>{zh?"正在读取…":"Loading…"}</p>:error?<p role="alert">{error}</p>:transactions.length?transactions.slice().reverse().slice(0,60).map(transaction=><article key={transaction.operationId}>
        <div><strong>{transaction.label}</strong><span>rev {transaction.beforeRevision} → {transaction.appliedRevision}</span></div>
        <div className={styles.historyOrigin}><b>{originLabel(transaction)}</b>{originEvidence(transaction)?<small>{originEvidence(transaction)}</small>:null}</div>
      </article>):<p>{zh?"暂无持久化逻辑事务。":"No durable logical transactions yet."}</p>}
      <p className={styles.historyNote}>{zh?"来源只在服务端有可信证据时记录；旧记录或无法证明来源的事务保持“来源未知”。":"Origin is recorded only when trusted server-side evidence exists. Legacy or unproven transactions remain Unknown."}</p>
    </section>

    <section className={styles.sessionHistory}>
      <header><strong>{zh?"当前会话撤销栈":"Current-session Undo stack"}</strong><span>{undoEntries.length}</span></header>
      {undoEntries.length?undoEntries.slice().reverse().slice(0,30).map((entry,index)=><span key={`${entry.label}-${index}`}>{entry.label}</span>):<p>{zh?"暂无可撤销记录。":"No Undo entries."}</p>}
      <header><strong>{zh?"当前会话重做栈":"Current-session Redo stack"}</strong><span>{redoEntries.length}</span></header>
      {redoEntries.length?redoEntries.slice().reverse().slice(0,30).map((entry,index)=><span key={`${entry.label}-${index}`}>{entry.label}</span>):<p>{zh?"暂无可重做记录。":"No Redo entries."}</p>}
    </section>
  </div>;
};
