"use client";

import type {AgentExecutionMode,AgentProposalPreview,AgentSession} from "@/lib/ai";
import type {AgentProviderRuntimeStatus} from "@/lib/client/agent";
import {AgentConversationProductionCards} from "@/components/studio/AgentConversationProductionCards";

export type AgentConversationActivity={id:string;label:string;status:"running"|"success"|"error"};

type Props={
  zh:boolean;
  projectId:string;
  projectName:string;
  selectedSceneId:string|null;
  selectedClipId:string|null;
  selectedScriptRange:{startWordId:string;endWordId:string}|null;
  provider:AgentProviderRuntimeStatus|null;
  sessions:AgentSession[];
  sessionId:string|null;
  executionMode:AgentExecutionMode;
  busy:boolean;
  proposalBusy:string|null;
  messages:AgentSession["messages"];
  lastPrompt:string;
  streamText:string;
  activity:AgentConversationActivity[];
  proposals:AgentSession["proposals"];
  previews:Record<string,AgentProposalPreview>;
  changeSelections:Record<string,Set<string>>;
  error:string|null;
  input:string;
  onSelectSession:(id:string)=>void;
  onCreateSession:()=>void;
  onExecutionModeChange:(mode:AgentExecutionMode)=>void;
  onReviewProposal:(proposalId:string)=>void;
  onRejectProposal:(proposalId:string)=>void;
  onApplyProposal:(proposalId:string,applyAll:boolean)=>void;
  onToggleChange:(proposalId:string,changeId:string,allIds:string[])=>void;
  onSend:(prompt?:string)=>void;
  onCancel:()=>void;
  onInputChange:(value:string)=>void;
  onOpenMission?:()=>void;
};

const compactTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});};

const AgentSessionSelector=({zh,provider,sessions,sessionId,busy,proposalBusy,onSelectSession,onCreateSession}:Pick<Props,"zh"|"provider"|"sessions"|"sessionId"|"busy"|"proposalBusy"|"onSelectSession"|"onCreateSession">)=>
  <section className="a4-agent-toolbar">
    <div><small>UNIFIED AGENT · CONVERSATION</small><strong>{zh?"Agent 对话":"Agent Conversation"}</strong></div>
    <div className="a4-agent-toolbar-actions">
      <select aria-label={zh?"Agent 会话":"Agent session"} value={sessionId??""} disabled={busy||Boolean(proposalBusy)||sessions.length===0} onChange={event=>onSelectSession(event.target.value)}>
        {sessions.length===0?<option value="">{zh?"暂无会话":"No sessions"}</option>:sessions.map(item=><option key={item.id} value={item.id}>{compactTime(item.updatedAt)} · {item.messages.find(message=>message.role==="user")?.content.slice(0,28)||item.id.slice(0,8)}</option>)}
      </select>
      <button type="button" className="button small" disabled={busy||Boolean(proposalBusy)||provider?.configured===false} onClick={onCreateSession}>{zh?"新会话":"New session"}</button>
    </div>
  </section>;

const AgentConversationMessages=({zh,messages,busy,lastPrompt,streamText}:Pick<Props,"zh"|"messages"|"busy"|"lastPrompt"|"streamText">)=>
  <section className="a4-agent-conversation" aria-live="polite" data-testid="agent-conversation-list">
    {messages.length===0&&!busy?<div className="a4-agent-empty"><strong>{zh?"直接告诉 Agent 你想完成什么":"Tell the Agent what outcome you want"}</strong><p>{zh?"无需先选择 Mission、Agent、Composer 或 Workflow。需要的能力会在同一对话中呈现为工具活动、方案和生产状态。":"You do not need to choose Mission, Agent, Composer, or Workflow first. The conversation exposes tools, proposals, and production state as needed."}</p></div>:null}
    {messages.map(message=><article key={message.id} className={`a4-agent-message ${message.role}`}><header><strong>{message.role==="user"?(zh?"你":"You"):(zh?"Agent":"Agent")}</strong><small>{compactTime(message.createdAt)}</small></header><p>{message.content}</p></article>)}
    {busy&&lastPrompt?<article className="a4-agent-message user pending"><header><strong>{zh?"你":"You"}</strong><small>{zh?"发送中":"sending"}</small></header><p>{lastPrompt}</p></article>:null}
    {streamText?<article className="a4-agent-message assistant streaming"><header><strong>Agent</strong><small>{zh?"生成中":"streaming"}</small></header><p>{streamText}</p></article>:null}
  </section>;

const AgentToolActivity=({zh,busy,activity}:Pick<Props,"zh"|"busy"|"activity">)=>activity.length?<section className="a4-agent-activity" data-testid="agent-tool-activity"><header><strong>{zh?"工具活动":"Tool activity"}</strong><small>{busy?zh?"进行中":"running":zh?"最近一轮":"latest turn"}</small></header>{activity.map(item=><div key={item.id}><span>{item.label}</span><em data-status={item.status}>{item.status}</em></div>)}</section>:null;

const AgentProposalItem=({zh,proposal,preview,selectedChanges,proposalBusy,busy,onReviewProposal,onRejectProposal,onApplyProposal,onToggleChange,onSend}:{
  zh:boolean;
  proposal:AgentSession["proposals"][number];
  preview:AgentProposalPreview|undefined;
  selectedChanges:Set<string>;
  proposalBusy:string|null;
  busy:boolean;
  onReviewProposal:(proposalId:string)=>void;
  onRejectProposal:(proposalId:string)=>void;
  onApplyProposal:(proposalId:string,applyAll:boolean)=>void;
  onToggleChange:(proposalId:string,changeId:string,allIds:string[])=>void;
  onSend:(prompt?:string)=>void;
})=>{
  const allChangeIds=preview?.operations.flatMap(operation=>operation.selectableChangeIds)??[];
  const workflowOperation=preview?.operations.find(operation=>operation.workflowAction);
  const workflowAction=workflowOperation?.workflowAction;
  return <section className={`a4-agent-proposal ${proposal.status}`} data-testid="agent-proposal-item">
    <header><span><small>{proposal.status==="stale"?"STALE PROPOSAL":proposal.status==="reviewed"?"REVIEWED PROPOSAL":"PROPOSAL READY"}</small><strong>{proposal.title}</strong></span><em>rev {proposal.baseProjectRevision}</em></header>
    <p>{proposal.summary}</p>
    {proposal.rationale.length?<ul>{proposal.rationale.map((item,index)=><li key={`${proposal.id}-r-${index}`}>{item}</li>)}</ul>:null}
    <div className="a4-agent-operations">{proposal.operations.map(operation=><div key={operation.id}><b>{operation.kind}</b><span>{operation.summary}</span></div>)}</div>
    {proposal.warnings.map((warning,index)=><p className="a4-agent-warning" key={`${proposal.id}-w-${index}`}>{warning}</p>)}
    {proposal.status==="stale"?<div className="a4-agent-stale"><p className="a4-agent-warning">{zh?"Project 或 Workflow 状态已发生变化。这个方案不能应用。":"The Project or Workflow state changed after this proposal. It cannot be applied."}</p><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onSend(zh?"Project 或 Workflow 状态已更新。请读取最新上下文，并基于我上一轮的目标重新生成一个新的可审查方案，不要直接执行修改。":"The Project or Workflow state changed. Read the latest context and re-plan my previous goal as a fresh reviewable proposal. Do not execute changes directly.")}>{zh?"基于最新版本重新规划":"Re-plan latest"}</button></div>:<>
      {!preview?<div className="a4-agent-review-actions"><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onReviewProposal(proposal.id)}>{proposalBusy===proposal.id?(zh?"检查中…":"Reviewing…"):(zh?"Review / Diff":"Review / Diff")}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onRejectProposal(proposal.id)}>{zh?"Reject":"Reject"}</button></div>:null}
      {preview?<section className="a4-agent-diff"><header><strong>{workflowAction?(zh?"Workflow 操作确认":"Workflow Action Review"):(zh?"结构化变更预览":"Structured change preview")}</strong><small>rev {preview.baseProjectRevision} → {preview.currentProjectRevision}</small></header>{workflowAction?<><div className="a5-agent-workflow-action"><strong>{zh?"Workflow 操作":"Workflow Action"}</strong><p><b>{workflowAction.action}</b></p>{workflowAction.workflowId?<p>Workflow · {workflowAction.workflowId}</p>:null}{workflowAction.scenario?<p>{zh?"场景":"Scenario"} · {workflowAction.scenario}</p>:null}{workflowAction.currentStatus?<p>{zh?"当前状态":"Current status"} · {workflowAction.currentStatus}</p>:null}{workflowAction.stageId?<p>Stage · {workflowAction.stageId}</p>:null}{workflowAction.checkpointId?<p>Checkpoint · {workflowAction.checkpointId}</p>:null}{workflowAction.sourceAssetIds?.length?<p>{zh?"源素材":"Source assets"} · {workflowAction.sourceAssetIds.join(", ")}</p>:null}<small>{zh?"确认后只会调用现有 WorkflowService / WorkflowRunner，不会由 Agent 直接改写 Workflow JSON。":"Confirmation calls the existing WorkflowService / WorkflowRunner only; the Agent never writes Workflow JSON directly."}</small></div><div className="a4-agent-review-actions"><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onApplyProposal(proposal.id,true)}>{proposalBusy===proposal.id?(zh?"执行中…":"Applying…"):(zh?"确认 Workflow 操作":"Confirm Workflow Action")}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onRejectProposal(proposal.id)}>{zh?"Reject":"Reject"}</button></div></>:<>{preview.operations.map(operation=>{const diff=operation.visualPlanDiff;return <div className="a4-agent-diff-operation" key={operation.operationId}><div className="a4-agent-diff-counts"><span><b>{diff?.add.length??0}</b>{zh?"新增":"add"}</span><span><b>{diff?.remove.length??0}</b>{zh?"移除":"remove"}</span><span><b>{diff?.shorten.length??0}</b>{zh?"缩短":"shorten"}</span><span><b>{diff?.styleChanges.length??0}</b>{zh?"样式":"style"}</span></div>{operation.selectableChangeIds.map(changeId=>{const added=diff?.add.find(item=>item.suggestionId===changeId);return <label className="a4-agent-change" key={changeId}><input type="checkbox" checked={selectedChanges.has(changeId)} onChange={()=>onToggleChange(proposal.id,changeId,allChangeIds)}/><span><strong>{changeId}</strong><small>{added?`${added.engine}${added.effectId?` · ${added.effectId}`:""} · f${added.startFrame}–${added.endFrame}`:(zh?"保留为无直接新增的方案项":"proposal item with no direct add")}</small></span></label>;})}</div>})}<div className="a4-agent-review-actions"><button type="button" className="button small" disabled={busy||Boolean(proposalBusy)||selectedChanges.size===0} onClick={()=>onApplyProposal(proposal.id,false)}>{`Apply Selected (${selectedChanges.size})`}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onApplyProposal(proposal.id,true)}>{zh?"Apply All":"Apply All"}</button><button type="button" className="button secondary small" disabled={busy||Boolean(proposalBusy)} onClick={()=>onRejectProposal(proposal.id)}>{zh?"Reject":"Reject"}</button></div></>}</section>:null}
    </>}
  </section>;
};

const AgentErrorState=({zh,error,lastPrompt,busy,proposalBusy,onSend}:Pick<Props,"zh"|"error"|"lastPrompt"|"busy"|"proposalBusy"|"onSend">)=>error?<div className="a4-agent-error"><span>{error}</span>{lastPrompt&&!busy&&!proposalBusy?<button type="button" className="button small" onClick={()=>onSend(lastPrompt)}>{zh?"重试":"Retry"}</button>:null}</div>:null;

const executionModeHelp=(mode:AgentExecutionMode,zh:boolean)=>{
  if(mode==="plan-only")return zh?"只读、分析、搜索、规划和提案；不执行 Project 修改或高成本 Job。":"Read, analyze, search, plan and propose only; no Project mutation or costly Job execution.";
  if(mode==="apply-safe-edits")return zh?"仅应用层明确允许会话自动执行的低风险可逆修改可自动应用；R3/R4 仍需审批。":"Only application-approved reversible R2 tools with session-auto eligibility may auto-apply; R3/R4 still require approval.";
  return zh?"默认模式：读取、分析、规划和提案可自动进行；持久化修改仍先审查。":"Default: reads, analysis, planning and proposals may run automatically; durable mutations still require review.";
};

const AgentComposer=({zh,input,executionMode,busy,proposalBusy,provider,onInputChange,onExecutionModeChange,onSend,onCancel}:Pick<Props,"zh"|"input"|"executionMode"|"busy"|"proposalBusy"|"provider"|"onInputChange"|"onExecutionModeChange"|"onSend"|"onCancel">)=>
  <section className="a4-agent-composer">
    <div className="a4-agent-execution-mode" data-testid="agent-execution-mode">
      <label>{zh?"执行模式":"Execution mode"}<select aria-label={zh?"执行模式":"Execution mode"} value={executionMode} disabled={busy||Boolean(proposalBusy)} onChange={event=>onExecutionModeChange(event.target.value as AgentExecutionMode)}><option value="review-first">{zh?"先审查":"Review First"}</option><option value="apply-safe-edits">{zh?"应用安全编辑":"Apply Safe Edits"}</option><option value="plan-only">{zh?"仅规划":"Plan Only"}</option></select></label>
      <small>{executionModeHelp(executionMode,zh)}</small>
    </div>
    <textarea value={input} disabled={busy||Boolean(proposalBusy)||provider?.configured===false} onChange={event=>onInputChange(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();onSend();}}} placeholder={zh?"告诉 Agent 你想完成什么。Project / Workflow 的持久化修改仍遵守既有风险、revision、Review / Apply 边界。":"Tell the Agent what outcome you want. Durable Project / Workflow changes still obey the existing risk, revision, and Review / Apply boundaries."}/>
    <div><small>{zh?"Enter 发送 · Shift+Enter 换行":"Enter to send · Shift+Enter for newline"}</small>{busy?<button type="button" className="button secondary small" onClick={onCancel}>{zh?"取消":"Cancel"}</button>:<button type="button" className="button small" disabled={!input.trim()||Boolean(proposalBusy)||provider?.configured===false} onClick={()=>onSend()}>{zh?"发送":"Send"}</button>}</div>
  </section>;

export const AgentConversationSurface=(props:Props)=>{
  const{zh,projectId,projectName,selectedSceneId,selectedClipId,selectedScriptRange,provider,sessions,sessionId,executionMode,busy,proposalBusy,messages,lastPrompt,streamText,activity,proposals,previews,changeSelections,error,input}=props;
  return <div className="a4-agent-workspace" data-agent-surface="conversation" data-testid="unified-agent-conversation">
    <AgentSessionSelector {...props}/>
    <section className="a4-agent-context">
      <span>@Project · {projectName}</span>
      {selectedSceneId?<span>@Scene · {selectedSceneId}</span>:null}
      {selectedClipId?<span>@Clip · {selectedClipId}</span>:null}
      {selectedScriptRange?<span>@Transcript · {selectedScriptRange.startWordId} → {selectedScriptRange.endWordId}</span>:null}
      <em>{provider?.configured?`${provider.providerId} · ${provider.model}`:zh?"Agent Plan 未配置":"Agent Plan not configured"}</em>
    </section>
    <AgentConversationProductionCards projectId={projectId} zh={zh} onOpenMission={props.onOpenMission}/>
    {provider&&provider.configured===false?<section className="a4-agent-empty"><strong>{zh?"Agent Provider 未配置":"Agent provider is not configured"}</strong><p>{zh?"高级 Composer 与 Workflow 仍可使用。配置本机 Volcengine Agent Plan 后再启动 Agent 会话。":"Advanced Composer and Workflow remain available. Configure the local Volcengine Agent Plan runtime to use Agent sessions."}</p></section>:null}
    <AgentConversationMessages zh={zh} messages={messages} busy={busy} lastPrompt={lastPrompt} streamText={streamText}/>
    <AgentToolActivity zh={zh} busy={busy} activity={activity}/>
    {proposals.map(proposal=><AgentProposalItem key={proposal.id} zh={zh} proposal={proposal} preview={previews[proposal.id]} selectedChanges={changeSelections[proposal.id]??new Set(previews[proposal.id]?.operations.flatMap(operation=>operation.selectableChangeIds)??[])} proposalBusy={proposalBusy} busy={busy} onReviewProposal={props.onReviewProposal} onRejectProposal={props.onRejectProposal} onApplyProposal={props.onApplyProposal} onToggleChange={props.onToggleChange} onSend={props.onSend}/>)}
    <AgentErrorState zh={zh} error={error} lastPrompt={lastPrompt} busy={busy} proposalBusy={proposalBusy} onSend={props.onSend}/>
    <AgentComposer zh={zh} input={input} executionMode={executionMode} busy={busy} proposalBusy={proposalBusy} provider={provider} onInputChange={props.onInputChange} onExecutionModeChange={props.onExecutionModeChange} onSend={props.onSend} onCancel={props.onCancel}/>
  </div>;
};
