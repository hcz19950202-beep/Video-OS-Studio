"use client";

import {useRef,type PointerEvent as ReactPointerEvent,type ReactNode} from "react";
import {WORKSPACE_LIMITS} from "@/lib/studio/workspace-layout";
import {useWorkspaceLayout} from "@/components/studio/WorkspaceLayoutProvider";

type ResizeKind="left"|"inspector"|"timeline";
type ResizeState={kind:ResizeKind;pointerId:number;startX:number;startY:number;startValue:number}|null;

type Props={
  topbar:ReactNode;
  rail:ReactNode;
  content:ReactNode;
  viewer:ReactNode;
  inspector:ReactNode;
  timeline:ReactNode;
};

export const ResizableWorkspaceShell=({topbar,rail,content,viewer,inspector,timeline}:Props)=>{
  const{layout,setLayout,toggleLeft,toggleInspector}=useWorkspaceLayout();
  const dragRef=useRef<ResizeState>(null);

  const start=(kind:ResizeKind,startValue:number)=>(event:ReactPointerEvent<HTMLDivElement>)=>{
    dragRef.current={kind,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startValue};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(drag.kind==="left")setLayout({leftWidth:drag.startValue+(event.clientX-drag.startX)});
    if(drag.kind==="inspector")setLayout({inspectorWidth:drag.startValue-(event.clientX-drag.startX)});
    if(drag.kind==="timeline")setLayout({timelineHeight:drag.startValue-(event.clientY-drag.startY)});
  };
  const stop=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(dragRef.current?.pointerId===event.pointerId)dragRef.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <main className="v21-workspace" style={{"--v21-left-width":`${layout.leftWidth}px`,"--v21-inspector-width":`${layout.inspectorWidth}px`,"--v21-timeline-height":`${layout.timelineHeight}px`} as React.CSSProperties}>
    {topbar}
    <section className="v21-workspace-body">
      <div className="v21-upper-workspace">
        <aside className="v21-icon-rail">{rail}</aside>
        {!layout.leftCollapsed?<aside className="v21-content-panel">{content}</aside>:null}
        <div className="v21-resizer v21-resizer-vertical" role="separator" aria-orientation="vertical" aria-label="Resize content panel" onDoubleClick={toggleLeft} onPointerDown={start("left",layout.leftWidth)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span/><button type="button" tabIndex={-1} aria-label={layout.leftCollapsed?"Expand content panel":"Collapse content panel"} onPointerDown={event=>event.stopPropagation()} onClick={toggleLeft}>{layout.leftCollapsed?"›":"‹"}</button></div>
        <section className="v21-viewer-region">{viewer}</section>
        <div className="v21-resizer v21-resizer-vertical v21-resizer-right" role="separator" aria-orientation="vertical" aria-label="Resize inspector" onDoubleClick={toggleInspector} onPointerDown={start("inspector",layout.inspectorWidth)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span/><button type="button" tabIndex={-1} aria-label={layout.inspectorCollapsed?"Expand inspector":"Collapse inspector"} onPointerDown={event=>event.stopPropagation()} onClick={toggleInspector}>{layout.inspectorCollapsed?"‹":"›"}</button></div>
        {!layout.inspectorCollapsed?<aside className="v21-inspector-panel">{inspector}</aside>:null}
      </div>
      <div className="v21-resizer v21-resizer-horizontal" role="separator" aria-orientation="horizontal" aria-label="Resize timeline" onPointerDown={start("timeline",layout.timelineHeight)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span/></div>
      <section className="v21-timeline-region" style={{height:`${layout.timelineHeight}px`}}>{timeline}</section>
    </section>
    <span className="sr-only">Panel limits: {WORKSPACE_LIMITS.leftMin}-{WORKSPACE_LIMITS.leftMax}</span>
  </main>;
};
