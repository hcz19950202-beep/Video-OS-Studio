"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {AgentProposalPreview,AgentSelectionSnapshot,AgentSession} from "@/lib/ai";
import {applyAgentProposal,createAgentSession,listAgentSessions,openAgentSession,rejectAgentProposal,reviewAgentProposal,runAgentTurn,type AgentProviderRuntimeStatus,type AgentTurnStreamEvent} from "@/lib/client/agent";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type Activity={id:string;label:string;status:"running"|"success"|"error"};
const compactTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};

export const AgentWorkspacePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const pushHistory=useHistoryStore(state=>state.push);
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const selection=useMemo<Partial<AgentSelectionSnapshot>>(()=>({
    selectedClipIds:selectedClipId?[selectedClipId]:[],
    selectedSceneId:selectedSceneId??null,
    selectedScriptRange:selectedScriptRange??null,
  }),[selectedClipId,selectedSceneId,selectedScriptRange]);

  const[sessions,setSessions]=useState<AgentSession[]>([]);
  const[session,setSession]=useState<AgentSession|null>(null);
  const[provider,setProvider]=useState<AgentProviderRuntimeStatus|null>(null);
  const[input,setInput]=useState("");
  const[busy,setBusy]=useState(false);
  const[proposalBusy,setProposalBusy]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[streamText,setStreamText]=useState("");
  const[activity,setActivity]=useState<Activity[]>([]);
  const[lastPrompt,setLastPrompt]=useState("");
  const[previews,setPreviews]=useState<Record<string,AgentProposalPreview>>({});
  const[changeSelections,setChangeSelections]=useState<Record<string,Set<string>>>({});
  const abortRef=useRef<AbortController|null>(null);

  const syncSession=(next:AgentSession)=>{setSession(next);setSessions(current=>[next,...current.filter(item=>item.id!==next.id)]);};

  const refresh=async()=>{
    const data=await listAgentSessions(project.project.id);
    setProvider(data.provider);
    setSessions(data.sessions);
    if(data.sessions.length===0){setSession(null);return;}
    const current=session&&data.sessions.some(item=>item.id===session.id)?session.id:data.sessions[0].id;
    if(data.provider.configured)setSession(await openAgentSession(project.project.id,current));
    else setSession(data.sessions.find(item=>item.id===current)??data.sessions[0]);
  };

  useEffect(()=>{
    let active=true;
    void listAgentSessions(project.project.id).then(async data=>{
      if(!active)return;
      setProvider(data.provider);setSessions(data.sessions);
      if(data.sessions.length===0){setSession(null);return;}
      if(data.provider.configured){
        try{const opened=await openAgentSession(project.project.id,data.sessions[0].id);if(active)setSession(opened);}catch{if(active)setSession(data.sessions[0]);}
      }else setSession(data.sessions[0]);
    }).catch(caught=>{if(active)setError(caught instanceof Error?caught.message:String(caught));});
    return()=>{active=false;abortRef.current?.abort();};
  },[project.project.id]);

  const createSession=async()=>{
    setBusy(true);setError(null);setActivity([]);setStreamText("");setPreviews({});setChangeSelections({});
    try{syncSession(await createAgentSession(project.project.id,selection));}
    catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const selectSession=async(id:string)=>{
    if(id===session?.id)return;
    setBusy(true);setError(null);setActivity([]);setStreamText("");setPreviews({});setChangeSelections({});
    try{syncSession(await openAgentSession(project.project.id,id));}
    catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const observe=(event:AgentTurnStreamEvent)=>{
    if(event.event==="text-delta")setStreamText(current=>current+String(event.data.text??""));
    else if(event.event==="tool-call"){
      const callId=String(event.data.callId??crypto.randomUUID());
      const toolId=String(event.data.toolId??"tool");
      setActivity(current=>[...current.filter(item=>item.id!==callId),{id:callId,label:toolId,status:"running"}]);
    }else if(event.event==="tool-result"){
      const callId=String(event.data.callId??"");
      const toolId=String(event.data.toolId??"tool");
      const status=event.data.status==="success"?"success":"error";
      setActivity(current=>[...current.filter(item=>item.id!==callId),{id:callId,label:toolId,status}]);
    }
  };

  const send=async(prompt=input.trim()||lastPrompt)=>{
    if(!prompt||busy||proposalBusy||provider?.configured===false)return;
    setBusy(true);setError(null);setStreamText("");setActivity([]);setLastPrompt(prompt);setInput("");setPreviews({});setChangeSelections({});
    const controller=new AbortController();abortRef.current=controller;
    try{
      let target=session;
      if(!target){target=await createAgentSession(project.project.id,selection);syncSession(target);}
      syncSession(await runAgentTurn({projectId:project.project.id,sessionId:target.id,userContent:prompt,selection,signal:controller.signal,onEvent:observe}));
      setStreamText("");
    }catch(caught){
      if(controller.signal.aborted)setError(zh?"本轮已取消。":"Turn cancelled.");
      else setError(caught instanceof Error?caught.message:String(caught));
      try{await refresh();}catch{}
    }finally{if(abortRef.current===controller)abortRef.current=null;setBusy(false);}
  };

  const reviewProposal=async(proposalId:string)=>{
    if(!session||busy||proposalBusy)return;
    setProposalBusy(proposalId);setError(null);
    try{
      const result=await reviewAgentProposal({projectId:project.project.id,sessionId:session.id,proposalId});
      syncSession(result.session);
      setPreviews(current=>({...current,[proposalId]:result.preview}));
      const selectable=result.preview.operations.flatMap(operation=>operation.selectableChangeIds);
      setChangeSelections(current=>({...current,[proposalId]:new Set(selectable)}));
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));try{syncSession(await openAgentSession(project.project.id,session.id));}catch{}}
    finally{setProposalBusy(null);}
  };

  const toggleChange=(proposalId:string,changeId:string,allIds:string[])=>setChangeSelections(current=>{
    const next=new Set(current[proposalId]??allIds);
    if(next.has(changeId))next.delete(changeId);else next.add(changeId);
    return{...current,[proposalId]:next};
  });

  const applyProposal=async(proposalId:string,applyAll:boolean)=>{
    if(!session||busy||proposalBusy)return;
    const proposal=session.proposals.find(item=>item.id===proposalId);
    const preview=previews[proposalId];
    if(!proposal||!preview)return;
    const selectable=preview.operations.flatMap(operation=>operation.selectableChangeIds);
    const selected=[...(changeSelections[proposalId]??new Set(selectable))];
    if(!applyAll&&selected.length===0)return;
    setProposalBusy(proposalId);setError(null);
    try{
      const before=structuredClone(project);
      const result=await applyAgentProposal({
        projectId:project.project.id,
        sessionId:session.id,
        proposalId,
        expectedRevision:proposal.baseProjectRevision,
        operationIds:preview.selectedOperationIds,
        ...(applyAll?{}:{changeIds:selected}),
      });
      onProjectChange(result.project);
      if(result.project.project.revision!==before.project.revision)pushHistory({projectId:project.project.id,label:`Agent Apply · ${result.appliedChangeIds.length} changes`,before,after:result.project});
      syncSession(result.session);
      setPreviews(current=>{const next={...current};delete next[proposalId];return next;});
      setChangeSelections(current=>{const next={...current};delete next[proposalId];return next;});
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));try{syncSession(await openAgentSession(project.project.id,session.id));}catch{}}
    finally{setProposalBusy(null);}
  };

  const rejectProposal=async(proposalId:string)=>{
    if(!session||busy||proposalBusy)return;
    setProposalBusy(proposalId);setError(null);
    try{syncSession((await rejectAgentProposal({projectId:project.project.id,sessionId:session.id,proposalId})).session);setPreviews(current=>{const next={...current};delete next[proposalId];return next;});}
    catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setProposalBusy(null);}
  };

  const cancel=()=>abortRef.current?.abort();
  const messages=session?.messages.filter(message=>message.role!=="tool")??[];
  const latestTurn=session?.turns.at(-1);
  const durableActivity=latestTurn?.toolExecutions.map(item=>({id:item.call.id,label:item.call.toolId,status:item.result.status==="success"?"success" as const:"error" as const}))??[];
  const shownActivity=activity.length?activity:durableActivity;
  const reviewable=session?.proposals.filter(item=>item.status==="draft"||item.status==="reviewed"||item.status==="stale")??[];

  return <div className="a4-agent-workspace">
    <section className="a4-agent-toolbar">
      <div><small>REAL AI DIRECTOR · AGENT</small><strong>{zh?"编辑 Agent":"Editing Agent"}</strong></div>
      <div className="a4-agent-toolbar-actions">
        <select aria-label={zh?"Agent 会话":"Agent session"} value={session?.id??""} disabled={busy||Boolean(proposalBusy)||sessions.length===0} onChange={event=>void selectSession(event.target.value)}>
          {sessions.length===0?<option value="">{zh?"暂无会话":"No sessions"}</option>:sessions.map(item=><option key={item.id} value={item.id}>{compactTime(item.updatedAt)} · {item.messages.find(message=>message.role==="user")?.content.slice(0,28)||item.id.slice(0,8)}</option>)}
        </select>
        <button type="button" className="button small" disabled={busy||Boolean(proposalBusy)||provider?.configured===false} onClick={()=>void createSession()}>{zh?"新会话":"New session"}</button>
      </div>
    </section>

    <section className="a4-agent-context">
      <span>@Project · {project.project.name}</span>
      {selectedSceneId?<span>@Scene · {selectedSceneId}</span>:null}
      {selectedClipId?<span>@Clip · {selectedClipId}</span>:null}
      {selectedScriptRange?<span>@Transcript · {selectedScriptRange.startWordId} → {selectedScriptRange.endWordId}</span>:null}
      <em>{provider?.configured?`${provider.providerId} · ${provider.model}`:zh?"Agent Plan 未配置":"Agent Plan not configured"}</em>
    </section>

    {provider&&provider.configured===false?<section className="a4-agent-empty"><strong>{zh?"Agent Provider 未配置":"Agent provider is not configured"}</strong><p>{zh?"Composer 与 Workflow 仍可使用。配置本机 Volcengine Agent Plan 后再启动 Agent 会话。":"Composer and Workflow remain available. Configure the local Volcengine Agent Plan runtime to use Agent sessions."}</p></section>:null}

    <section className="a4-agent-conversation" aria-live="polite">
      {messages.length===0&&!busy?<div className="a4-agent-empty"><strong>{zh?"从一个明确的剪辑目标开始":"Start with a concrete editing goal"}</strong><p>{zh?"例如：把开头 8 秒更有冲击力，但先给我看修改方案，不要直接应用。":"Example: make the first 8 seconds more impactful, but show the proposal before applying anything."}</p></div>:null}
      {messages.map(message=><article key={message.id} className={`a4-agent-message ${message.role}`}><header><strong>{message.role==="user"?(zh?"你":"You"):(zh?"Agent":"Agent")}</strong><small>{compactTime(message.createdAt)}</small></header><p>{message.content}</p></article>)}
      {busy&&lastPrompt?<article className="a4-agent-message user pending"><header><strong>{zh?"你":"You"}</strong><small>{zh?"发送中":"sending"}</small></header><p>{lastPrompt}</p></article>:null}
      {streamText?<article className="a4-agent-message assistant streaming"><header><strong>Agent</strong><small>{zh?"生成中":"streaming"}</small></header><p>{streamText}</p></article>:null}
    </section>

    {shownActivity.length?<section className="a4-agent-activity"><header><strong>{zh?"工具活动":"Tool activity"}</strong><small>{busy?zh?"进行中":"running":zh?"最近一轮":"latest turn"}</small></header>{shownActivity.map(item=><div key={item.id}><span>{item.label}</span><em data-status={item.status}>{item.status}</em></div>)}</section>:null}

    {reviewable.map(proposal=>{const preview=previews[proposal.id];const allChangeIds=preview?.operations.flatMap(operation=>operation.selectableChangeIds)??[];const selectedChanges=changeSelections[proposal.id]??new Set(allChangeIds);return <section className={`a4-agent-proposal ${proposal.status}`} key={proposal.id}>
      <header><span><small>{proposal.status==="stale"?"STALE PROPOSAL":proposal.status==="reviewed"?"REVIEWED PROPOSAL":"PROPOSAL READY"}</small><strong>{proposal.title}</strong></span><em>rev {proposal.baseProjectRevision}</em></header>
      <p>{proposal.summary}</p>
      {proposal.rationale.length?<ul>{proposal.rationale.map((item,index)=><li key={`${proposal.id}-r-${index}`}>{item}</li>)}</ul>:null}
      <div className="a4-agent-operations">{proposal.operations.map(operation=><div key={operation.id}><b>{operation.kind}</b><span>{operation.summary}</span></div>)}</div>
      {proposal.warnings.map((warning,index)=><p className="a4-agent-warning" key={`${proposal.id}-w-${index}`}>{warning}</p>)}
      {proposal.status==="stale"?<div className="a4-agent-stale"><p className="a4-agent-warning">{zh?"Project 已发生变化。这个方案不能应用。":"The Project changed after this proposal. It cannot be applied."}</p><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)} onClick={()=>void send(zh?"Project 已更新。请读取最新上下文，并基于我上一轮的目标重新生成一个新的可审查方案，不要直接修改 Project。":"The Project changed. Read the latest context and re-plan my previous editing goal as a fresh reviewable proposal. Do not mutate the Project directly.")}>{zh?"基于最新版本重新规划":"Re-plan latest"}</button></div>:<>
        {!preview?<div className="a4-agent-review-actions"><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)} onClick={()=>void reviewProposal(proposal.id)}>{proposalBusy===proposal.id?(zh?"检查中…":"Reviewing…"):(zh?"Review / Diff":"Review / Diff")}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>void rejectProposal(proposal.id)}>{zh?"Reject":"Reject"}</button></div>:null}
        {preview?<section className="a4-agent-diff"><header><strong>{zh?"结构化变更预览":"Structured change preview"}</strong><small>rev {preview.baseProjectRevision} → {preview.currentProjectRevision}</small></header>{preview.operations.map(operation=>{const diff=operation.visualPlanDiff;return <div className="a4-agent-diff-operation" key={operation.operationId}><div className="a4-agent-diff-counts"><span><b>{diff?.add.length??0}</b>{zh?"新增":"add"}</span><span><b>{diff?.remove.length??0}</b>{zh?"移除":"remove"}</span><span><b>{diff?.shorten.length??0}</b>{zh?"缩短":"shorten"}</span><span><b>{diff?.styleChanges.length??0}</b>{zh?"样式":"style"}</span></div>{operation.selectableChangeIds.map(changeId=>{const added=diff?.add.find(item=>item.suggestionId===changeId);return <label className="a4-agent-change" key={changeId}><input type="checkbox" checked={selectedChanges.has(changeId)} onChange={()=>toggleChange(proposal.id,changeId,allChangeIds)}/><span><strong>{changeId}</strong><small>{added?`${added.engine}${added.effectId?` · ${added.effectId}`:""} · f${added.startFrame}–${added.endFrame}`:(zh?"保留为无直接新增的方案项":"proposal item with no direct add")}</small></span></label>;})}</div>})}<div className="a4-agent-review-actions"><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)||selectedChanges.size===0} onClick={()=>void applyProposal(proposal.id,false)}>{zh?`Apply Selected (${selectedChanges.size})`:`Apply Selected (${selectedChanges.size})`}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>void applyProposal(proposal.id,true)}>{zh?"Apply All":"Apply All"}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>void rejectProposal(proposal.id)}>{zh?"Reject":"Reject"}</button></div></section>:null}
      </>}
    </section>;})}

    {error?<div className="a4-agent-error"><span>{error}</span>{lastPrompt&&!busy&&!proposalBusy?<button type="button" className="button small" onClick={()=>void send(lastPrompt)}>{zh?"重试":"Retry"}</button>:null}</div>:null}

    <section className="a4-agent-composer">
      <textarea value={input} disabled={busy||Boolean(proposalBusy)||provider?.configured===false} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void send();}}} placeholder={zh?"告诉 Agent 你想怎么剪。所有 Project 修改都必须先 Review / Apply。":"Tell the Agent what you want to edit. Every Project mutation still requires Review / Apply."}/>
      <div><small>{zh?"Enter 发送 · Shift+Enter 换行":"Enter to send · Shift+Enter for newline"}</small>{busy?<button type="button" className="button secondary small" onClick={cancel}>{zh?"取消":"Cancel"}</button>:<button type="button" className="button small" disabled={!input.trim()||Boolean(proposalBusy)||provider?.configured===false} onClick={()=>void send()}>{zh?"发送":"Send"}</button>}</div>
    </section>
  </div>;
};
