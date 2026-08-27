"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {AgentSelectionSnapshot,AgentSession} from "@/lib/ai";
import {createAgentSession,listAgentSessions,openAgentSession,runAgentTurn,type AgentProviderRuntimeStatus,type AgentTurnStreamEvent} from "@/lib/client/agent";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

type Activity={id:string;label:string;status:"running"|"success"|"error"};
const compactTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};

export const AgentWorkspacePanel=({project}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
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
  const[error,setError]=useState<string|null>(null);
  const[streamText,setStreamText]=useState("");
  const[activity,setActivity]=useState<Activity[]>([]);
  const[lastPrompt,setLastPrompt]=useState("");
  const abortRef=useRef<AbortController|null>(null);

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
    setError(null);
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
    setBusy(true);setError(null);setActivity([]);setStreamText("");
    try{
      const created=await createAgentSession(project.project.id,selection);
      setSession(created);setSessions(current=>[created,...current.filter(item=>item.id!==created.id)]);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const selectSession=async(id:string)=>{
    if(id===session?.id)return;
    setBusy(true);setError(null);setActivity([]);setStreamText("");
    try{setSession(await openAgentSession(project.project.id,id));}
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
    if(!prompt||busy||provider?.configured===false)return;
    setBusy(true);setError(null);setStreamText("");setActivity([]);setLastPrompt(prompt);setInput("");
    const controller=new AbortController();abortRef.current=controller;
    try{
      let target=session;
      if(!target){target=await createAgentSession(project.project.id,selection);setSession(target);setSessions(current=>[target!,...current]);}
      const updated=await runAgentTurn({projectId:project.project.id,sessionId:target.id,userContent:prompt,selection,signal:controller.signal,onEvent:observe});
      setSession(updated);setSessions(current=>[updated,...current.filter(item=>item.id!==updated.id)]);setStreamText("");
    }catch(caught){
      if(controller.signal.aborted)setError(zh?"本轮已取消。":"Turn cancelled.");
      else setError(caught instanceof Error?caught.message:String(caught));
      try{await refresh();}catch{}
    }finally{if(abortRef.current===controller)abortRef.current=null;setBusy(false);}
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
        <select aria-label={zh?"Agent 会话":"Agent session"} value={session?.id??""} disabled={busy||sessions.length===0} onChange={event=>void selectSession(event.target.value)}>
          {sessions.length===0?<option value="">{zh?"暂无会话":"No sessions"}</option>:sessions.map(item=><option key={item.id} value={item.id}>{compactTime(item.updatedAt)} · {item.messages.find(message=>message.role==="user")?.content.slice(0,28)||item.id.slice(0,8)}</option>)}
        </select>
        <button type="button" className="button small" disabled={busy||provider?.configured===false} onClick={()=>void createSession()}>{zh?"新会话":"New session"}</button>
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

    {reviewable.map(proposal=><section className={`a4-agent-proposal ${proposal.status}`} key={proposal.id}>
      <header><span><small>{proposal.status==="stale"?"STALE PROPOSAL":"PROPOSAL READY"}</small><strong>{proposal.title}</strong></span><em>rev {proposal.baseProjectRevision}</em></header>
      <p>{proposal.summary}</p>
      {proposal.rationale.length?<ul>{proposal.rationale.map((item,index)=><li key={`${proposal.id}-r-${index}`}>{item}</li>)}</ul>:null}
      <div className="a4-agent-operations">{proposal.operations.map(operation=><div key={operation.id}><b>{operation.kind}</b><span>{operation.summary}</span></div>)}</div>
      {proposal.warnings.map((warning,index)=><p className="a4-agent-warning" key={`${proposal.id}-w-${index}`}>{warning}</p>)}
      {proposal.status==="stale"?<p className="a4-agent-warning">{zh?"Project 已发生变化。这个方案不能应用，请让 Agent 基于最新 revision 重新规划。":"The Project changed after this proposal. It cannot be applied; ask the Agent to re-plan against the latest revision."}</p>:<div className="a4-agent-review-placeholder"><span>{zh?"Review / Diff / Apply 正在接入此卡片，当前不会自动修改 Project。":"Review / Diff / Apply attaches here; the Agent still cannot mutate the Project automatically."}</span></div>}
    </section>)}

    {error?<div className="a4-agent-error"><span>{error}</span>{lastPrompt&&!busy?<button type="button" className="button small" onClick={()=>void send(lastPrompt)}>{zh?"重试":"Retry"}</button>:null}</div>:null}

    <section className="a4-agent-composer">
      <textarea value={input} disabled={busy||provider?.configured===false} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void send();}}} placeholder={zh?"告诉 Agent 你想怎么剪。所有 Project 修改都必须先 Review / Apply。":"Tell the Agent what you want to edit. Every Project mutation still requires Review / Apply."}/>
      <div><small>{zh?"Enter 发送 · Shift+Enter 换行":"Enter to send · Shift+Enter for newline"}</small>{busy?<button type="button" className="button secondary small" onClick={cancel}>{zh?"取消":"Cancel"}</button>:<button type="button" className="button small" disabled={!input.trim()||provider?.configured===false} onClick={()=>void send()}>{zh?"发送":"Send"}</button>}</div>
    </section>
  </div>;
};
