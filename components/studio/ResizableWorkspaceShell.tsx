"use client";

import {useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type ReactNode} from "react";
import {WORKSPACE_LIMITS,updateWorkspaceLayout,type WorkspaceLayout} from "@/lib/studio/workspace-layout";
import {useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";

type ResizeKind="left"|"inspector"|"timeline";
type ResizeState={kind:ResizeKind;pointerId:number;startX:number;startY:number;startValue:number}|null;
type Props={topbar:ReactNode;rail:ReactNode;content:ReactNode;viewer:ReactNode;inspector:ReactNode;timeline:ReactNode};

export const ResizableWorkspaceShell=({topbar,rail,content,viewer,inspector,timeline}:Props)=>{
  const{layout,setLayout,toggleLeft,toggleInspector}=useWorkspaceLayout();
  const[drag,setDrag]=useState<ResizeState>(null);const[draft,setDraft]=useState<WorkspaceLayout|null>(null);const display=draft??layout;

  const beginResize=(event:ReactPointerEvent<HTMLDivElement>,kind:ResizeKind,startValue:number)=>{setDrag({kind,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startValue});setDraft(layout);event.currentTarget.setPointerCapture(event.pointerId);};
  const moveResize=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    let patch:Partial<WorkspaceLayout>={};
    if(drag.kind==="left")patch={leftWidth:drag.startValue+(event.clientX-drag.startX)};
    if(drag.kind==="inspector")patch={inspectorWidth:drag.startValue-(event.clientX-drag.startX)};
    if(drag.kind==="timeline")patch={timelineHeight:drag.startValue-(event.clientY-drag.startY)};
    setDraft(updateWorkspaceLayout(layout,patch));
  };
  const endResize=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(drag?.pointerId===event.pointerId&&draft)setLayout({leftWidth:draft.leftWidth,inspectorWidth:draft.inspectorWidth,timelineHeight:draft.timelineHeight});
    setDrag(null);setDraft(null);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const style={"--v21-left-width":`${display.leftWidth}px`,"--v21-inspector-width":`${display.inspectorWidth}px`,"--v21-timeline-height":`${display.timelineHeight}px`} as CSSProperties;

  return <main className="v21-workspace" style={style}>
    {topbar}
    <section className="v21-workspace-body"><div className="v21-upper-workspace">
      <aside className="v21-icon-rail">{rail}</aside>
      {!display.leftCollapsed?<aside className="v21-content-panel">{content}</aside>:null}
      <div className="v21-resizer v21-resizer-vertical" role="separator" aria-orientation="vertical" aria-label="Resize content panel" onDoubleClick={toggleLeft} onPointerDown={event=>beginResize(event,"left",display.leftWidth)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><span/><button type="button" tabIndex={-1} aria-label={display.leftCollapsed?"Expand content panel":"Collapse content panel"} onPointerDown={event=>event.stopPropagation()} onClick={toggleLeft}>{display.leftCollapsed?"›":"‹"}</button></div>
      <section className="v21-viewer-region">{viewer}</section>
      <div className="v21-resizer v21-resizer-vertical v21-resizer-right" role="separator" aria-orientation="vertical" aria-label="Resize inspector" onDoubleClick={toggleInspector} onPointerDown={event=>beginResize(event,"inspector",display.inspectorWidth)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><span/><button type="button" tabIndex={-1} aria-label={display.inspectorCollapsed?"Expand inspector":"Collapse inspector"} onPointerDown={event=>event.stopPropagation()} onClick={toggleInspector}>{display.inspectorCollapsed?"‹":"›"}</button></div>
      {!display.inspectorCollapsed?<aside className="v21-inspector-panel">{inspector}</aside>:null}
    </div><div className="v21-resizer v21-resizer-horizontal" role="separator" aria-orientation="horizontal" aria-label="Resize timeline" onPointerDown={event=>beginResize(event,"timeline",display.timelineHeight)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}><span/></div><section className="v21-timeline-region" style={{height:`${display.timelineHeight}px`}}>{timeline}</section></section>
    <span className="sr-only">Panel limits: {WORKSPACE_LIMITS.leftMin}-{WORKSPACE_LIMITS.leftMax}</span>
  </main>;
};
