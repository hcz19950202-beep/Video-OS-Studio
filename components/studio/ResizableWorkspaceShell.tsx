"use client";

import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent as ReactKeyboardEvent,type PointerEvent as ReactPointerEvent,type ReactNode} from "react";
import {WORKSPACE_LIMITS,updateWorkspaceLayout,type WorkspaceLayout} from "@/lib/studio/workspace-layout";
import {useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";
import {AgentNativeLeftPanel,type AgentNativeSurface} from "@/components/studio/AgentNativeLeftPanel";
import {AgentNativeContextDock,type AgentNativeContextTab} from "@/components/studio/AgentNativeContextDock";
import {AgentNativeCommandStrip} from "@/components/studio/AgentNativeCommandStrip";
import {useWorkspaceHandoffStore} from "@/store/workspace-handoff-store";
import {useSelectionStore} from "@/store/selection-store";

type ResizeKind="left"|"inspector"|"timeline";
type ResizeState={kind:ResizeKind;pointerId:number;startX:number;startY:number;startValue:number}|null;
type Props={topbar:ReactNode;rail:ReactNode;content:ReactNode;viewer:ReactNode;inspector:ReactNode;timeline:ReactNode;onOpenProjects:()=>void};

export const ResizableWorkspaceShell=({topbar,rail,content,viewer,inspector,timeline,onOpenProjects}:Props)=>{
  const{layout,setLayout,toggleLeft,toggleInspector,toggleTimeline}=useWorkspaceLayout();
  const preferredMissionId=useWorkspaceHandoffStore(state=>state.preferredMissionId);
  const selectionVersion=useSelectionStore(state=>state.contextSelectionVersion);
  const selectionTargetKind=useSelectionStore(state=>state.selectedContextTarget?.kind??null);
  const observedSelectionVersion=useRef(selectionVersion);
  const clearHandoff=()=>useWorkspaceHandoffStore.getState().setPreferredMissionId(null);
  const[drag,setDrag]=useState<ResizeState>(null);const[draft,setDraft]=useState<WorkspaceLayout|null>(null);const[leftSurface,setLeftSurface]=useState<AgentNativeSurface>("agent");const[contextTab,setContextTab]=useState<AgentNativeContextTab>("inspector");const effectiveContextTab=preferredMissionId?"mission":contextTab;const display=draft??layout;
  useEffect(()=>{
    const previousVersion=observedSelectionVersion.current;
    observedSelectionVersion.current=selectionVersion;
    if(selectionVersion!==previousVersion&&selectionTargetKind==="clip"&&layout.inspectorCollapsed)setLayout({inspectorCollapsed:false});
  },[layout.inspectorCollapsed,selectionTargetKind,selectionVersion,setLayout]);
  const beginResize=(event:ReactPointerEvent<HTMLDivElement>,kind:ResizeKind,startValue:number)=>{setDrag({kind,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startValue});setDraft(layout);event.currentTarget.setPointerCapture(event.pointerId);};
  const moveResize=(event:ReactPointerEvent<HTMLDivElement>)=>{if(!drag||drag.pointerId!==event.pointerId)return;let patch:Partial<WorkspaceLayout>={};if(drag.kind==="left")patch={leftWidth:drag.startValue+(event.clientX-drag.startX)};if(drag.kind==="inspector")patch={inspectorWidth:drag.startValue-(event.clientX-drag.startX)};if(drag.kind==="timeline")patch={timelineHeight:drag.startValue-(event.clientY-drag.startY)};setDraft(updateWorkspaceLayout(layout,patch));};
  const endResize=(event:ReactPointerEvent<HTMLDivElement>)=>{if(drag?.pointerId===event.pointerId&&draft)setLayout({leftWidth:draft.leftWidth,inspectorWidth:draft.inspectorWidth,timelineHeight:draft.timelineHeight});setDrag(null);setDraft(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
  const keyResize=(event:ReactKeyboardEvent<HTMLDivElement>,kind:ResizeKind)=>{const step=event.shiftKey?40:10;let patch:Partial<WorkspaceLayout>|null=null;if(kind==="left"&&(event.key==="ArrowLeft"||event.key==="ArrowRight"))patch={leftWidth:layout.leftWidth+(event.key==="ArrowRight"?step:-step)};if(kind==="inspector"&&(event.key==="ArrowLeft"||event.key==="ArrowRight"))patch={inspectorWidth:layout.inspectorWidth+(event.key==="ArrowLeft"?step:-step)};if(kind==="timeline"&&(event.key==="ArrowUp"||event.key==="ArrowDown"))patch={timelineHeight:layout.timelineHeight+(event.key==="ArrowUp"?step:-step)};if(patch){event.preventDefault();setLayout(patch);}};
  const openProjects=()=>{clearHandoff();setLeftSurface("tools");onOpenProjects();};
  const openCampaigns=()=>{clearHandoff();window.location.assign("/campaigns");};
  const openHistory=()=>{clearHandoff();setContextTab("history");if(layout.inspectorCollapsed)toggleInspector();};
  const changeContextTab=(tab:AgentNativeContextTab)=>{clearHandoff();setContextTab(tab);};
  const style={"--v21-left-width":`${display.leftWidth}px`,"--v21-inspector-width":`${display.inspectorWidth}px`,"--v21-timeline-height":`${display.timelineCollapsed?0:display.timelineHeight}px`} as CSSProperties;

  return <main className="v21-workspace" style={style} data-workspace-version="2.5-c1">
    {topbar}
    <AgentNativeCommandStrip onOpenProjects={openProjects} onOpenCampaigns={openCampaigns} onOpenHistory={openHistory}/>
    <section className="v21-workspace-body"><div className="v21-upper-workspace">
      {!display.leftCollapsed?<aside className="v21-content-panel" data-workspace-region="agent"><AgentNativeLeftPanel legacyRail={rail} legacyContent={content} surface={leftSurface} onSurfaceChange={setLeftSurface}/></aside>:null}
      <div className="v21-resizer v21-resizer-vertical" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="Resize Agent Workspace" aria-valuemin={WORKSPACE_LIMITS.leftMin} aria-valuemax={WORKSPACE_LIMITS.leftMax} aria-valuenow={Math.round(display.leftWidth)} onKeyDown={event=>keyResize(event,"left")} onDoubleClick={toggleLeft} onPointerDown={event=>beginResize(event,"left",display.leftWidth)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><span/><button type="button" aria-label={display.leftCollapsed?"Expand Agent Workspace":"Collapse Agent Workspace"} onPointerDown={event=>event.stopPropagation()} onClick={toggleLeft}>{display.leftCollapsed?"›":"‹"}</button></div>
      <section className="v21-viewer-region" data-workspace-region="viewer">{viewer}</section>
      <div className="v21-resizer v21-resizer-vertical v21-resizer-right" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="Resize Context Dock" aria-valuemin={WORKSPACE_LIMITS.inspectorMin} aria-valuemax={WORKSPACE_LIMITS.inspectorMax} aria-valuenow={Math.round(display.inspectorWidth)} onKeyDown={event=>keyResize(event,"inspector")} onDoubleClick={toggleInspector} onPointerDown={event=>beginResize(event,"inspector",display.inspectorWidth)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><span/><button type="button" aria-label={display.inspectorCollapsed?"Expand Context Dock":"Collapse Context Dock"} onPointerDown={event=>event.stopPropagation()} onClick={toggleInspector}>{display.inspectorCollapsed?"‹":"›"}</button></div>
      {!display.inspectorCollapsed?<aside className="v21-inspector-panel" data-workspace-region="context"><AgentNativeContextDock inspector={inspector} tab={effectiveContextTab} onTabChange={changeContextTab} preferredMissionId={preferredMissionId??undefined}/></aside>:null}
    </div>
    <div className="v21-resizer v21-resizer-horizontal" role="separator" tabIndex={0} aria-orientation="horizontal" aria-label="Resize Timeline" aria-valuemin={WORKSPACE_LIMITS.timelineMin} aria-valuemax={WORKSPACE_LIMITS.timelineMax} aria-valuenow={display.timelineCollapsed?0:Math.round(display.timelineHeight)} onKeyDown={event=>keyResize(event,"timeline")} onDoubleClick={toggleTimeline} onPointerDown={display.timelineCollapsed?undefined:event=>beginResize(event,"timeline",display.timelineHeight)} onPointerMove={display.timelineCollapsed?undefined:moveResize} onPointerUp={display.timelineCollapsed?undefined:endResize} onPointerCancel={display.timelineCollapsed?undefined:endResize}><span/><button type="button" aria-label={display.timelineCollapsed?"Expand Timeline":"Collapse Timeline"} onPointerDown={event=>event.stopPropagation()} onClick={toggleTimeline}>{display.timelineCollapsed?"⌃":"⌄"}</button></div>
    {!display.timelineCollapsed?<section className="v21-timeline-region" data-workspace-region="timeline" style={{height:`${display.timelineHeight}px`}}>{timeline}</section>:null}</section>
    <span className="sr-only">Panel limits: {WORKSPACE_LIMITS.leftMin}-{WORKSPACE_LIMITS.leftMax}</span>
  </main>;
};
