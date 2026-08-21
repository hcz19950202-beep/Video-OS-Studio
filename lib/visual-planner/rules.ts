import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import type {Scene} from "@/schemas/scene";
import {HYPERFRAMES_EFFECTS} from "@/shared/hyperframes/registry";
import {computeVisualDensity,getMotionIntervals,type VisualInterval} from "@/lib/visual-planner/density";
import {VisualPlanSchema,type VisualPlan,type VisualSuggestion} from "@/lib/visual-planner/schema";

type CaptionClip=Extract<Clip,{type:"caption"}>;
type Candidate=Omit<VisualSuggestion,"id"|"sceneId"|"startFrame"|"endFrame"|"spokenText">&{preferredDuration:number};

const hfDefaults=(id:"process-flow"|"map-route")=>structuredClone(HYPERFRAMES_EFFECTS.find(effect=>effect.id===id)!.defaults) as Record<string,unknown>;
const suffixLabel=(unit:string)=>({"天":"DAYS","小时":"HOURS","人":"PEOPLE","个月":"MONTHS"}[unit]??unit.toUpperCase());
const sceneIntensity=(scene:Scene):"low"|"medium"|"high"=>scene.visualStrategy?.intensity??(["hook","proof","cta"].includes(scene.semanticType)?"high":["pain","problem","reframe","solution","process","comparison"].includes(scene.semanticType)?"medium":"low");
const minGapSeconds=(intensity:"low"|"medium"|"high")=>intensity==="high"?3:intensity==="medium"?5:7;
const sceneForFrame=(project:Project,frame:number)=>project.scenes.find(scene=>frame>=scene.startFrame&&frame<scene.endFrame);
const overlaps=(a:VisualInterval,b:VisualInterval)=>a.startFrame<b.endFrame&&b.startFrame<a.endFrame;
const nearestStartGap=(frame:number,intervals:VisualInterval[])=>intervals.length?Math.min(...intervals.map(interval=>Math.abs(interval.startFrame-frame))):Number.POSITIVE_INFINITY;
const spokenTextFor=(project:Project,startFrame:number,endFrame:number,fallback:string)=>{
  const words=project.script.segments.filter(segment=>segment.status==="active").flatMap(segment=>segment.words).filter(word=>word.endFrame>startFrame&&word.startFrame<endFrame).sort((a,b)=>a.startFrame-b.startFrame);
  const text=words.map(word=>word.text).join("").trim();
  return text||fallback;
};

const candidateFor=(project:Project,scene:Scene,text:string):Candidate|null=>{
  const lower=text.toLowerCase();
  const isCta=/联系我们|联系我|发给我们|私信|咨询|contact us|send us|dm us|learn more|message us/i.test(text)||scene.semanticType==="cta";
  const isRoute=((/(中国|china)/i.test(text)&&/(澳大利亚|australia)/i.test(text))||/shipping|logistics|运输|运到|路线|route/i.test(text));
  const isProcess=/流程|步骤|第一步|第二步|process|steps?|how it works/i.test(text)||scene.semanticType==="process";
  const percent=text.match(/(\d{1,3}(?:\.\d+)?)\s*(%\+?|％\+?)/);
  const quantity=text.match(/(\d+(?:\.\d+)?)\s*(天|days?|小时|hours?|人|people|workers?|个月|months?)/i);
  const isComparison=/对比|相比|更快|更低|versus|\bvs\.?\b|compared with|compare/i.test(text)||scene.semanticType==="comparison";
  const isProof=/证明|证据|案例|认证|符合|通过|proof|evidence|certified|compliant/i.test(text)||scene.semanticType==="proof";
  const painKeyword=/延期|延误|人工|成本|delay|labor|labour|cost/i.test(text);
  const accent=project.brand.colors.primary;

  // Strong factual evidence outranks the Scene template. Scene semantics resolve ambiguous narrative keywords below.
  if(percent){const number=Number(percent[1]);return{semanticType:"percentage",preferredDuration:105,recommendation:{engine:"remotion",effectId:"metric-focus",props:{title:"KEY METRIC",value:percent[1],unit:percent[2].replace("％","%"),accentColor:accent,progress:Math.max(0,Math.min(100,number))}},reason:`The spoken line contains percentage proof inside ${scene.name}; strong numeric evidence takes priority over the Scene template.`,confidence:.95,alternatives:[{engine:"remotion",effectId:"big-number",reason:"Use a simpler numeric card if progress framing is not needed."},{engine:"none",reason:"Leave the proof spoken-only if the surrounding scene is already visually dense."}]};}
  if(quantity)return{semanticType:"number",preferredDuration:90,recommendation:{engine:"remotion",effectId:"big-number",props:{label:"KEY NUMBER",value:quantity[1],suffix:suffixLabel(quantity[2]),accentColor:accent,fontSize:180,animationStyle:"scale"}},reason:`The line contains a concrete time/count quantity in ${scene.name}; strong numeric evidence takes priority over the Scene template.`,confidence:.93,alternatives:[{engine:"remotion",effectId:"metric-focus",reason:"Use a metric treatment when the number represents measured performance."},{engine:"none",reason:"Keep it verbal when another visual event is already carrying the same point."}]};

  // Explicit Scene meaning outranks ambiguous route/process keywords.
  if(scene.semanticType==="process")return{semanticType:"process",preferredDuration:120,recommendation:{engine:"hyperframes",effectId:"process-flow",props:hfDefaults("process-flow")},reason:`${scene.name} is explicitly classified as PROCESS, so Scene meaning takes priority over incidental route/logistics words.`,confidence:.9,alternatives:[{engine:"broll",reason:"Use process footage if it explains the steps more concretely."},{engine:"remotion",effectId:"keyword-impact",reason:"Use one concise emphasis when a full process card would be too heavy."}]};
  if(isRoute)return{semanticType:"map",preferredDuration:120,recommendation:{engine:"hyperframes",effectId:"map-route",props:hfDefaults("map-route")},reason:`Scene ${scene.name} contains geographic/logistics movement that benefits from spatial explanation.`,confidence:.9,alternatives:[{engine:"broll",reason:"Use real logistics footage when a suitable asset is available."},{engine:"remotion",effectId:"keyword-impact",reason:"Use a lightweight text emphasis when route animation is unnecessary."}]};
  if(isProcess)return{semanticType:"process",preferredDuration:120,recommendation:{engine:"hyperframes",effectId:"process-flow",props:hfDefaults("process-flow")},reason:`${scene.name} is process-oriented, so a structured flow makes the spoken steps easier to scan.`,confidence:.88,alternatives:[{engine:"broll",reason:"Use process footage if it explains the steps more concretely."},{engine:"remotion",effectId:"keyword-impact",reason:"Use one concise emphasis when a full process card would be too heavy."}]};
  if(isCta)return{semanticType:"cta",preferredDuration:75,recommendation:{engine:"remotion",effectId:"keyword-impact",props:{text:text.slice(0,28),accentColor:accent,align:"center"}},reason:`${scene.name} is a CTA moment and benefits from one controlled action emphasis.`,confidence:.86,alternatives:[{engine:"remotion",effectId:"lower-third",reason:"Use a quieter persistent CTA when a full impact card is too strong."},{engine:"none",reason:"Keep the CTA clean if the final seconds already contain strong branding."}]};
  if(isComparison)return{semanticType:"comparison",preferredDuration:75,recommendation:{engine:"remotion",effectId:"keyword-impact",props:{text:text.slice(0,28),accentColor:accent,align:"center"}},reason:`${scene.name} frames a comparison; one concise contrast cue helps the viewer understand the decision point.`,confidence:.8,alternatives:[{engine:"broll",reason:"Use side-by-side or contextual footage when appropriate assets exist."},{engine:"none",reason:"Avoid another card if the comparison is already obvious on screen."}]};
  if(isProof)return{semanticType:"proof",preferredDuration:75,recommendation:{engine:"remotion",effectId:"keyword-impact",props:{text:text.slice(0,28),accentColor:project.brand.colors.success,align:"left"}},reason:`${scene.name} is proof-oriented; a restrained proof cue can reinforce credibility without adding another full data card.`,confidence:.78,alternatives:[{engine:"broll",reason:"Use documentary proof footage when a credible source asset is available."},{engine:"none",reason:"Leave proof unembellished when the evidence is already visible."}]};
  if(painKeyword||scene.semanticType==="pain"||scene.semanticType==="problem"||scene.semanticType==="hook")return{semanticType:"keyword",preferredDuration:75,recommendation:{engine:"remotion",effectId:"keyword-impact",props:{text:text.slice(0,28),accentColor:project.brand.colors.danger,align:"left"}},reason:`${scene.name} contains a high-value pain/hook keyword that can anchor attention with one brief emphasis.`,confidence:.72,alternatives:[{engine:"none",reason:"Skip the emphasis when the scene already has enough visual events."}]};
  if(lower.includes("重点")||lower.includes("key point"))return{semanticType:"keyword",preferredDuration:75,recommendation:{engine:"remotion",effectId:"keyword-impact",props:{text:text.slice(0,28),accentColor:accent,align:"center"}},reason:"The speaker explicitly marks this as a key point.",confidence:.7,alternatives:[{engine:"none",reason:"Keep the line spoken-only when density is already high."}]};
  return null;
};

export interface VisualPlannerAdapter{generate(project:Project):VisualPlan;}

export class RulesVisualPlannerAdapter implements VisualPlannerAdapter{
  generate(project:Project):VisualPlan{
    const captions=(project.tracks.find(track=>track.id==="captions-main")?.clips??[]).filter((clip):clip is CaptionClip=>clip.type==="caption").sort((a,b)=>a.startFrame-b.startFrame);
    if(captions.length===0)throw new Error("AI Director needs timed Caption clips. Import SRT/VTT or create captions first.");
    if(project.scenes.length===0)throw new Error("AI Director V2 needs Scenes. Generate or create Scenes before planning visuals.");

    const densityBefore=computeVisualDensity(project);
    const existing=getMotionIntervals(project);
    const accepted:VisualInterval[]=[];
    const suggestions:VisualSuggestion[]=[];

    for(const caption of captions){
      const scene=sceneForFrame(project,caption.startFrame);if(!scene)continue;
      const text=caption.text.trim();if(!text)continue;
      const candidate=candidateFor(project,scene,text);if(!candidate)continue;
      const endFrame=Math.min(project.canvas.durationInFrames,scene.endFrame,caption.startFrame+candidate.preferredDuration);
      if(endFrame<=caption.startFrame)continue;
      const interval={startFrame:caption.startFrame,endFrame};
      const intensity=sceneIntensity(scene);
      const minGap=Math.round(project.canvas.fps*minGapSeconds(intensity));
      const prior=[...existing,...accepted];
      const nearExisting=nearestStartGap(interval.startFrame,prior)<minGap;
      const concurrent=prior.filter(other=>overlaps(other,interval)).length;
      const projected=computeVisualDensity(project,[...accepted,interval]);
      const densityBlocked=nearExisting||concurrent>=2||projected.cardsPerMinute>8;
      const id=`suggest-${scene.id}-${caption.id}`;
      const spokenText=spokenTextFor(project,caption.startFrame,endFrame,text);

      if(densityBlocked){
        const causes=[nearExisting?`visual event gap is below ${minGapSeconds(intensity)}s`:null,concurrent>=2?"projected concurrency would exceed 2":null,projected.cardsPerMinute>8?"projected density would exceed 8 cards/min":null].filter(Boolean).join("; ");
        suggestions.push({id,sceneId:scene.id,startFrame:caption.startFrame,endFrame,spokenText,semanticType:candidate.semanticType,recommendation:{engine:"none"},reason:`Density guard: ${causes}. The content is visually meaningful, but adding another card here would over-edit the scene.`,confidence:Math.max(.65,candidate.confidence-.08),alternatives:[{engine:candidate.recommendation.engine,effectId:candidate.recommendation.effectId,reason:"Original content-driven recommendation; apply manually only if you intentionally want higher density."},...candidate.alternatives]});
        continue;
      }

      suggestions.push({id,sceneId:scene.id,startFrame:caption.startFrame,endFrame,spokenText,semanticType:candidate.semanticType,recommendation:candidate.recommendation,reason:`${candidate.reason} Scene intensity is ${intensity}; density guard allows this event.`,confidence:candidate.confidence,alternatives:candidate.alternatives});
      if(candidate.recommendation.engine==="remotion"||candidate.recommendation.engine==="hyperframes")accepted.push(interval);
    }

    return VisualPlanSchema.parse({version:2,projectId:project.project.id,generatedAt:new Date().toISOString(),source:"rules",suggestions,densityBefore});
  }
}
