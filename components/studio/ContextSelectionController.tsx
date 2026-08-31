"use client";

import {useEffect,useRef,useState} from "react";
import type {Project} from "@/schemas/project";
import {usePlayerStore} from "@/store/player-store";
import {useSelectionStore} from "@/store/selection-store";

type Region={left:number;top:number;width:number;height:number};
type Drag={shell:HTMLElement;startX:number;startY:number;frame:number};

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const normalizePoint=(event:PointerEvent,rect:DOMRect)=>({x:clamp01((event.clientX-rect.left)/Math.max(1,rect.width)),y:clamp01((event.clientY-rect.top)/Math.max(1,rect.height))});

export const ContextSelectionController=({project}:{project:Project|null})=>{
  const mode=useSelectionStore(state=>state.contextSelectionMode);
  const selectContextTarget=useSelectionStore(state=>state.selectContextTarget);
  const setContextSelectionMode=useSelectionStore(state=>state.setContextSelectionMode);
  const dragRef=useRef<Drag|null>(null);
  const[region,setRegion]=useState<Region|null>(null);

  useEffect(()=>{
    if(!mode||!project){dragRef.current=null;setRegion(null);return;}

    const finishViewerRegion=(event:PointerEvent,drag:Drag)=>{
      const rect=drag.shell.getBoundingClientRect();
      const end=normalizePoint(event,rect);
      let x=Math.min(drag.startX,end.x);
      let y=Math.min(drag.startY,end.y);
      let width=Math.abs(end.x-drag.startX);
      let height=Math.abs(end.y-drag.startY);
      const minimum=.01;
      if(width<minimum){x=clamp01(x-minimum/2);width=Math.min(minimum,1-x);}
      if(height<minimum){y=clamp01(y-minimum/2);height=Math.min(minimum,1-y);}
      width=Math.min(width,1-x);
      height=Math.min(height,1-y);
      selectContextTarget({kind:"viewer-region",label:`Viewer region · frame ${drag.frame}`,target:{frame:drag.frame,x,y,width,height}});
      setRegion({left:rect.left+x*rect.width,top:rect.top+y*rect.height,width:width*rect.width,height:height*rect.height});
    };

    const onPointerDown=(event:PointerEvent)=>{
      if(event.button!==0)return;
      const target=event.target instanceof Element?event.target:null;
      if(!target)return;

      const ruler=target.closest(".timeline-ruler");
      if(ruler instanceof HTMLElement&&!target.closest(".timeline-marker")){
        const rect=ruler.getBoundingClientRect();
        const ratio=clamp01((event.clientX-rect.left)/Math.max(1,rect.width));
        const frame=Math.min(project.canvas.durationInFrames-1,Math.max(0,Math.round(ratio*(project.canvas.durationInFrames-1))));
        event.preventDefault();event.stopPropagation();
        usePlayerStore.getState().requestSeek(frame);
        selectContextTarget({kind:"timeline-point",label:`Timeline · frame ${frame}`,target:{frame}});
        setRegion(null);
        return;
      }

      const shell=target.closest(".player-shell");
      if(shell instanceof HTMLElement&&!target.closest("button,input,textarea,select")){
        const rect=shell.getBoundingClientRect();
        const start=normalizePoint(event,rect);
        const frame=Math.min(project.canvas.durationInFrames-1,Math.max(0,usePlayerStore.getState().currentFrame));
        event.preventDefault();event.stopPropagation();
        dragRef.current={shell,startX:start.x,startY:start.y,frame};
        setRegion({left:event.clientX,top:event.clientY,width:1,height:1});
      }
    };

    const onPointerMove=(event:PointerEvent)=>{
      const drag=dragRef.current;if(!drag)return;
      const rect=drag.shell.getBoundingClientRect();
      const end=normalizePoint(event,rect);
      event.preventDefault();event.stopPropagation();
      setRegion({
        left:rect.left+Math.min(drag.startX,end.x)*rect.width,
        top:rect.top+Math.min(drag.startY,end.y)*rect.height,
        width:Math.max(1,Math.abs(end.x-drag.startX)*rect.width),
        height:Math.max(1,Math.abs(end.y-drag.startY)*rect.height),
      });
    };

    const onPointerUp=(event:PointerEvent)=>{
      const drag=dragRef.current;if(!drag)return;
      event.preventDefault();event.stopPropagation();
      dragRef.current=null;
      finishViewerRegion(event,drag);
    };

    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      dragRef.current=null;setRegion(null);setContextSelectionMode(false);
    };

    document.addEventListener("pointerdown",onPointerDown,true);
    document.addEventListener("pointermove",onPointerMove,true);
    document.addEventListener("pointerup",onPointerUp,true);
    document.addEventListener("keydown",onKeyDown,true);
    return()=>{
      document.removeEventListener("pointerdown",onPointerDown,true);
      document.removeEventListener("pointermove",onPointerMove,true);
      document.removeEventListener("pointerup",onPointerUp,true);
      document.removeEventListener("keydown",onKeyDown,true);
      dragRef.current=null;
    };
  },[mode,project,selectContextTarget,setContextSelectionMode]);

  if(!mode||!project)return null;
  return <>
    <div className="a5-context-selection-indicator" data-testid="context-selection-controller" aria-live="polite">Selection Mode · Esc to exit</div>
    {region?<div className="a5-viewer-region-selection" data-testid="viewer-context-region" style={{left:region.left,top:region.top,width:region.width,height:region.height}} aria-hidden="true"/>:null}
  </>;
};
