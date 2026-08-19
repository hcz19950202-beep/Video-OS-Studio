import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {HYPERFRAMES_EFFECTS} from "@/shared/hyperframes/registry";
import type {VisualPlan,VisualSlot} from "@/lib/visual-planner/schema";

type CaptionClip=Extract<Clip,{type:"caption"}>;
const hfDefaults=(id:"process-flow"|"map-route")=>structuredClone(HYPERFRAMES_EFFECTS.find((effect)=>effect.id===id)!.defaults) as Record<string,unknown>;
const clampDuration=(project:Project,startFrame:number,preferred:number)=>Math.max(1,Math.min(preferred,project.canvas.durationInFrames-startFrame));
const suffixLabel=(unit:string)=>({"天":"DAYS","小时":"HOURS","人":"PEOPLE","个月":"MONTHS"}[unit]??unit.toUpperCase());

export interface VisualPlannerAdapter{generate(project:Project):VisualPlan;}

export class RulesVisualPlannerAdapter implements VisualPlannerAdapter{
  generate(project:Project):VisualPlan{
    const captions=(project.tracks.find((track)=>track.id==="captions-main")?.clips??[]).filter((clip):clip is CaptionClip=>clip.type==="caption").sort((a,b)=>a.startFrame-b.startFrame);
    if(captions.length===0)throw new Error("Visual Planner needs Caption clips with timing. Import SRT/VTT or create captions before generating a plan.");
    const slots:VisualSlot[]=[];
    const minGap=Math.max(1,Math.round(project.canvas.fps*5));
    let lastStrong=-minGap;
    const push=(slot:VisualSlot,force=false)=>{if(!force&&slot.startFrame-lastStrong<minGap)return;slots.push(slot);lastStrong=slot.startFrame;};

    for(const caption of captions){
      const text=caption.text.trim();
      const lower=text.toLowerCase();
      const base={id:`slot-${caption.id}`,startFrame:caption.startFrame,spokenText:text};
      const isCta=/联系我们|联系我|发给我们|私信|咨询|contact us|send us|dm us|learn more|message us/i.test(text);
      const isRoute=(/(中国|china)/i.test(text)&&/(澳大利亚|australia)/i.test(text))||/shipping|logistics|运输|运到/i.test(text);
      const isProcess=/流程|步骤|第一步|第二步|process|steps?|how it works/i.test(text);
      const percent=text.match(/(\d{1,3}(?:\.\d+)?)\s*(%\+?|％\+?)/);
      const quantity=text.match(/(\d+(?:\.\d+)?)\s*(天|days?|小时|hours?|人|people|workers?|个月|months?)/i);

      if(isRoute){
        push({...base,engine:"hyperframes",effectId:"map-route",durationInFrames:clampDuration(project,caption.startFrame,120),purpose:"Explain geographic/logistics movement",reason:"The spoken line contains route or logistics language that benefits from spatial motion.",confidence:.9,props:hfDefaults("map-route")});continue;
      }
      if(isProcess){
        push({...base,engine:"hyperframes",effectId:"process-flow",durationInFrames:clampDuration(project,caption.startFrame,120),purpose:"Explain a multi-step process",reason:"The spoken line introduces a process or steps, which is clearer as a structured flow.",confidence:.86,props:hfDefaults("process-flow")});continue;
      }
      if(percent){
        const number=Number(percent[1]);
        push({...base,engine:"remotion",effectId:"metric-focus",durationInFrames:clampDuration(project,caption.startFrame,105),purpose:"Make percentage evidence memorable",reason:"The line contains a percentage, a high-priority proof type for motion.",confidence:.94,props:{title:"KEY METRIC",value:percent[1],unit:percent[2].replace("％","%"),accentColor:"#55d187",progress:Math.max(0,Math.min(100,number))}});continue;
      }
      if(quantity){
        push({...base,engine:"remotion",effectId:"big-number",durationInFrames:clampDuration(project,caption.startFrame,90),purpose:"Emphasize a concrete number",reason:"The line contains a time/count quantity that should become visual evidence.",confidence:.92,props:{label:"KEY NUMBER",value:quantity[1],suffix:suffixLabel(quantity[2]),accentColor:"#ffc400",fontSize:180,animationStyle:"scale"}});continue;
      }
      if(isCta){
        push({...base,engine:"remotion",effectId:"keyword-impact",durationInFrames:clampDuration(project,caption.startFrame,75),purpose:"Strengthen the call to action",reason:"The line is a CTA and benefits from one controlled visual emphasis.",confidence:.82,props:{text:text.slice(0,28),accentColor:"#ffc400",align:"center"}},true);continue;
      }
      if(lower.includes("延期")||lower.includes("delay")){
        push({...base,engine:"remotion",effectId:"keyword-impact",durationInFrames:clampDuration(project,caption.startFrame,75),purpose:"Emphasize the core pain",reason:"The line contains a high-value problem keyword.",confidence:.74,props:{text:"PROJECT DELAY",accentColor:"#ff6565",align:"left"}});
      }
    }
    return {version:1,projectId:project.project.id,generatedAt:new Date().toISOString(),source:"rules",slots};
  }
}
