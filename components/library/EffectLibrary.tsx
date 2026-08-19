"use client";
import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";
import {EFFECT_REGISTRY} from "@/shared/effects/registry";
import {usePlayerStore} from "@/store/player-store";
import {VideoUsePanel} from "@/components/video-use/VideoUsePanel";
import {VisualPlannerPanel} from "@/components/planner/VisualPlannerPanel";
import {HyperFramesLibrary} from "./HyperFramesLibrary";

export const EffectLibrary=({project,onCommand,onProjectChange}:{project:Project;onCommand:(command:ProjectCommand,message:string)=>Promise<void>;onProjectChange:(project:Project)=>void})=>{
  const frame=usePlayerStore((state)=>state.currentFrame);
  return <>
    <div className="effect-library">
      <div className="panel-heading"><h2>Effects</h2><span className="asset-kind">Remotion</span></div>
      <div className="effect-list">{EFFECT_REGISTRY.map((effect)=><button className="effect-card" key={effect.id} onClick={()=>{const duration=Math.min(effect.defaultDurationInFrames,Math.max(1,project.canvas.durationInFrames-frame));void onCommand({type:"add-clip",trackId:"motion-main",clip:{id:`motion-${effect.id}-${Date.now()}`,type:"motion",engine:"remotion",effectId:effect.id,props:effect.defaults,startFrame:frame,durationInFrames:duration,enabled:true,layer:10}},`${effect.name} added at frame ${frame}`);}}><img alt="" src={effect.thumbnail}/><span><strong>{effect.name}</strong><small>{effect.category} · {effect.defaultDurationInFrames}f</small></span></button>)}</div>
    </div>
    <HyperFramesLibrary project={project} onProjectChange={onProjectChange}/>
    <VideoUsePanel project={project} onProjectChange={onProjectChange}/>
    <VisualPlannerPanel project={project} onProjectChange={onProjectChange}/>
  </>;
};
