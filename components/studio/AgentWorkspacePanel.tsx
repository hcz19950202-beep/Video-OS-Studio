"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {DEFAULT_AGENT_EXECUTION_MODE,type AgentExecutionMode} from "@/lib/ai/execution-mode";
import {attachContextSelection,contextReferenceKey,contextSelectionKey,type ContextSelectionTarget} from "@/lib/ai/context-selection";
import type {AgentProposalPreview,AgentSelectionSnapshot,AgentSession,ContextReference} from "@/lib/ai";
import {applyAgentProposal,createAgentSession,listAgentSessions,openAgentSession,rejectAgentProposal,reviewAgentProposal,runAgentTurn,type AgentProviderRuntimeStatus,type AgentTurnStreamEvent} from "@/lib/client/agent";
import {loadStudioProject} from "@/lib/client/projects";
import type {Project} from "@/schemas/project";
import {useHistoryStore} from "@/store/history-store";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {AgentConversationSurface,type AgentConversationActivity} from "@/components/studio/AgentConversationSurface";

export const AgentWorkspacePanel=({project,onProjectChange,onOpenMission}:{project:Project;onProjectChange:(project:Project)=>void;onOpenMission?:()=>void})=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const pushHistory=useHistoryStore(state=>state.push);
  const selectedClipIds=useSelectionStore(state=>state.selectedClipIds);
  const selectedClipId=useSelectionStore(state=>state.selectedClipId);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const selectedContextTarget=useSelectionStore(state=>state.selectedContextTarget);
  const contextSelectionMode=useSelectionStore(state=>state.contextSelectionMode);
  const toggleContextSelectionMode=useSelectionStore(state=>state.toggleContextSelectionMode);
  const selection=useMemo<Partial<AgentSelectionSnapshot>>(()=>({
    selectedClipIds,
    selectedSceneId:selectedSceneId??null,
    selectedScriptRange:selectedScriptRange??null,
  }),[selectedClipIds,selectedSceneId,selectedScriptRange]);

  const[sessions,setSessions]=useState<AgentSession[]>([]);
  const[session,setSession]=useState<AgentSession|null>(null);
  const[provider,setProvider]=useState<AgentProviderRuntimeStatus|null>(null);
  const[input,setInput]=useState("");
  const[executionMode,setExecutionMode]=useState<AgentExecutionMode>(DEFAULT_AGENT_EXECUTION_MODE);
  const[busy,setBusy]=useState(false);
  const[proposalBusy,setProposalBusy]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[streamText,setStreamText]=useState("");
  const[activity,setActivity]=useState<AgentConversationActivity[]>([]);
  const[lastPrompt,setLastPrompt]=useState("");
  const[previews,setPreviews]=useState<Record<string,AgentProposalPreview>>({});
  const[changeSelections,setChangeSelections]=useState<Record<string,Set<string>>>({});
  const[draftContextReferences,setDraftContextReferences]=useState<ContextReference[]>([]);
  const[pendingContextReferences,setPendingContextReferences]=useState<ContextReference[]>([]);
  const abortRef=useRef<AbortController|null>(null);

  const syncSession=(next:AgentSession)=>{setSession(next);setSessions(current=>[next,...current.filter(item=>item.id!==next.id)]);};

  const attachTarget=(target:ContextSelectionTarget)=>setDraftContextReferences(current=>{
    const scoped=current.filter(reference=>reference.projectId===project.project.id);
    const key=contextSelectionKey(target);
    const index=scoped.findIndex(reference=>contextReferenceKey(reference)===key);
    if(index>=0&&scoped[index]?.baseProjectRevision===project.project.revision)return scoped;
    const reference=attachContextSelection({selection:target,projectId:project.project.id,baseProjectRevision:project.project.revision});
    if(index<0)return[...scoped,reference];
    const next=[...scoped];next[index]=reference;return next;
  });

  useEffect(()=>{
    let lastVersion=useSelectionStore.getState().contextSelectionVersion;
    return useSelectionStore.subscribe(state=>{
      if(state.contextSelectionVersion===lastVersion)return;
      lastVersion=state.contextSelectionVersion;
      if(!state.contextSelectionMode||!state.selectedContextTarget)return;
      const target=state.selectedContextTarget;
      setDraftContextReferences(current=>{
        const scoped=current.filter(reference=>reference.projectId===project.project.id);
        const key=contextSelectionKey(target);
        const index=scoped.findIndex(reference=>contextReferenceKey(reference)===key);
        if(index>=0&&scoped[index]?.baseProjectRevision===project.project.revision)return scoped;
        const reference=attachContextSelection({selection:target,projectId:project.project.id,baseProjectRevision:project.project.revision});
        if(index<0)return[...scoped,reference];
        const next=[...scoped];next[index]=reference;return next;
      });
    });
  },[project.project.id,project.project.revision]);

  const visibleDraftContextReferences=draftContextReferences.filter(reference=>reference.projectId===project.project.id);
  const visiblePendingContextReferences=pendingContextReferences.filter(reference=>reference.projectId===project.project.id);
  const addCurrentContext=()=>attachTarget(selectedContextTarget??{kind:"project",label:project.project.name,target:{}});
  const removeContext=(referenceId:string)=>setDraftContextReferences(current=>current.filter(reference=>reference.id!==referenceId));

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
    const sentContextReferences=draftContextReferences.filter(reference=>reference.projectId===project.project.id);
    setBusy(true);setError(null);setStreamText("");setActivity([]);setLastPrompt(prompt);setInput("");setPreviews({});setChangeSelections({});setPendingContextReferences(sentContextReferences);
    const controller=new AbortController();abortRef.current=controller;
    try{
      let target=session;
      if(!target){target=await createAgentSession(project.project.id,selection);syncSession(target);}
      let autoApplied=false;
      const next=await runAgentTurn({
        projectId:project.project.id,
        sessionId:target.id,
        userContent:prompt,
        executionMode,
        selection,
        contextReferences:sentContextReferences,
        signal:controller.signal,
        onEvent:event=>{
          observe(event);
          if(event.event==="proposal-auto-applied")autoApplied=true;
        },
      });
      syncSession(next);
      if(autoApplied){
        const before=structuredClone(project);
        const appliedProject=await loadStudioProject(project.project.id);
        if(appliedProject.project.revision!==before.project.revision){
          onProjectChange(appliedProject);
          pushHistory({projectId:project.project.id,label:"Agent Auto Apply · safe edit",before,after:appliedProject});
        }
      }
      const sentIds=new Set(sentContextReferences.map(reference=>reference.id));
      setDraftContextReferences(current=>current.filter(reference=>!sentIds.has(reference.id)));
      setStreamText("");
    }catch(caught){
      if(controller.signal.aborted)setError(zh?"本轮已取消。":"Turn cancelled.");
      else setError(caught instanceof Error?caught.message:String(caught));
      try{await refresh();}catch{}
    }finally{if(abortRef.current===controller)abortRef.current=null;setPendingContextReferences([]);setBusy(false);}
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

  return <AgentConversationSurface
    zh={zh}
    projectId={project.project.id}
    projectName={project.project.name}
    currentProjectRevision={project.project.revision}
    selectedSceneId={selectedSceneId??null}
    selectedClipId={selectedClipId??null}
    selectedScriptRange={selectedScriptRange??null}
    selectedContextTarget={selectedContextTarget}
    contextSelectionMode={contextSelectionMode}
    draftContextReferences={visibleDraftContextReferences}
    pendingContextReferences={visiblePendingContextReferences}
    provider={provider}
    sessions={sessions}
    sessionId={session?.id??null}
    executionMode={executionMode}
    busy={busy}
    proposalBusy={proposalBusy}
    messages={messages}
    turns={session?.turns??[]}
    lastPrompt={lastPrompt}
    streamText={streamText}
    activity={shownActivity}
    proposals={reviewable}
    previews={previews}
    changeSelections={changeSelections}
    error={error}
    input={input}
    onSelectSession={id=>void selectSession(id)}
    onCreateSession={()=>void createSession()}
    onExecutionModeChange={setExecutionMode}
    onReviewProposal={proposalId=>void reviewProposal(proposalId)}
    onRejectProposal={proposalId=>void rejectProposal(proposalId)}
    onApplyProposal={(proposalId,applyAll)=>void applyProposal(proposalId,applyAll)}
    onToggleChange={toggleChange}
    onSend={prompt=>void send(prompt)}
    onCancel={cancel}
    onInputChange={setInput}
    onToggleContextSelectionMode={toggleContextSelectionMode}
    onAddCurrentContext={addCurrentContext}
    onRemoveContext={removeContext}
    onOpenMission={onOpenMission}
  />;
};
