"use client";

import {useMemo,useState} from "react";
import type {Project} from "@/schemas/project";
import {buildVisualPlanDiff} from "@/lib/visual-planner/diff";
import type {VisualPlan,VisualPlanDiff} from "@/lib/visual-planner/schema";
import {useHistoryStore} from "@/store/history-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useProjectStudioPrefs} from "@/components/studio/useProjectStudioPrefs";

const copy={
  "zh-CN":{
    title:"AI 导演 V2",analyze:"分析场景",reanalyze:"重新分析",working:"分析中…",source:"规划来源",suggestions:"条建议",spoken:"原文",reason:"为什么",confidence:"置信度",alternatives:"备选方案",hold:"保持克制",applied:"已应用",preview:"变更预览",add:"添加",remove:"删除",shorten:"缩短",style:"样式",density:"动效密度",peak:"并发峰值",cards:"卡片",apply:"应用选中",undoHint:"本次 Apply = 1 次 Undo",empty:"当前 Scene 没有需要新增的视觉强化。",noScenes:"先完成 Script / Scene，再让 AI Director 做视觉编排。",selected:"已选",frames:"帧",none:"不新增视觉",provider:"AI Provider",rules:"规则引擎",after:"应用后",before:"当前",diffClean:"没有待应用变更",alternativesNone:"无备选",review:"Review Recommendations",prompt:"导演意图",promptHint:"例如：整体更克制，重点突出数字和证明，不要让同一时刻出现太多卡片。",plan:"执行计划",activity:"执行记录",actionable:"可执行",holds:"克制",placed:"已布局",placement:"布局",safeArea:"安全区",
  },
  "en-US":{
    title:"AI Director V2",analyze:"Analyze Scenes",reanalyze:"Re-analyze",working:"Analyzing…",source:"Plan source",suggestions:"suggestions",spoken:"Spoken text",reason:"Why",confidence:"Confidence",alternatives:"Alternatives",hold:"Density hold",applied:"Applied",preview:"Change Preview",add:"Add",remove:"Remove",shorten:"Shorten",style:"Style",density:"Motion density",peak:"Peak concurrency",cards:"cards",apply:"Apply Selected",undoHint:"One Apply = one Undo",empty:"No additional visual reinforcement is recommended for this Scene.",noScenes:"Finish Script / Scenes before asking AI Director to orchestrate visuals.",selected:"selected",frames:"frames",none:"No new visual",provider:"AI Provider",rules:"Rules engine",after:"After",before:"Current",diffClean:"No pending changes",alternativesNone:"No alternatives",review:"Review Recommendations",prompt:"Director intent",promptHint:"Example: keep it restrained, prioritize numbers and proof, and avoid too many cards at the same moment.",plan:"Plan",activity:"Activity",actionable:"Actionable",holds:"Holds",placed:"Placed",placement:"Placement",safeArea:"Safe area",
  },
} as const;

type ApplyResponse={project?:Project;diff?:VisualPlanDiff;transactionId?:string|null;appliedIds?:string[];error?:string};
type Activity={stage:string;message:string};
const engineLabel=(engine:string,effectId?:string)=>engine==="none"?"NONE":`${engine.toUpperCase()}${effectId?` · ${effectId}`:""}`;

export const VisualPlannerPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale}=useStudioPreferences();const l=copy[locale];
  const{safeArea}=useProjectStudioPrefs(project.project.id);
  const pushHistory=useHistoryStore(state=>state.push);
  const[plan,setPlan]=useState<VisualPlan|null>(null);
  const[selected,setSelected]=useState<Set<string>>(new Set());
  const[applied,setApplied]=useState<Set<string>>(new Set());
  const[lastTransaction,setLastTransaction]=useState<string|null>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const[intent,setIntent]=useState("");
  const[activity,setActivity]=useState<Activity[]>([]);

  const diff=useMemo(()=>plan?buildVisualPlanDiff(project,plan,[...selected]):null,[plan,project,selected]);
  const sceneGroups=useMemo(()=>project.scenes.map(scene=>({scene,suggestions:plan?.suggestions.filter(suggestion=>suggestion.sceneId===scene.id)??[]})).filter(group=>group.suggestions.length>0),[plan,project.scenes]);
  const planStats=useMemo(()=>({actionable:plan?.suggestions.filter(item=>item.recommendation.engine!=="none").length??0,holds:plan?.suggestions.filter(item=>item.recommendation.engine==="none").length??0,placed:plan?.suggestions.filter(item=>Boolean(item.recommendation.placement)).length??0}),[plan]);

  const generate=async()=>{setBusy(true);setError(null);setActivity([{stage:"context",message:`${project.canvas.width}×${project.canvas.height} · ${safeArea.label}`},{stage:"analyze",message:locale==="zh-CN"?"读取 Scene、字幕、现有视觉密度与空间占位":"Read Scenes, captions, existing density and spatial occupancy"}]);try{const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({context:{intent,safeArea:{profileId:safeArea.id,...safeArea.insets}}})});const data=await response.json() as{plan?:VisualPlan;error?:string};if(!response.ok||!data.plan)throw new Error(data.error||"AI Director plan generation failed");setPlan(data.plan);setSelected(new Set(data.plan.suggestions.filter(suggestion=>suggestion.recommendation.engine!=="none").map(suggestion=>suggestion.id)));setApplied(new Set());setLastTransaction(null);setActivity(current=>[...current,{stage:"plan",message:`${data.plan!.suggestions.length} suggestions · ${data.plan!.suggestions.filter(item=>item.recommendation.engine!=="none").length} actionable`},{stage:"review",message:locale==="zh-CN"?"等待用户 Review / Deselect / Apply":"Waiting for Review / Deselect / Apply"}]);}catch(caught){const message=caught instanceof Error?caught.message:String(caught);setError(message);setActivity(current=>[...current,{stage:"error",message}]);}finally{setBusy(false);}};
  const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});

  const apply=async()=>{if(!plan||selected.size===0)return;setBusy(true);setError(null);setActivity(current=>[...current,{stage:"apply",message:`${selected.size} selected suggestion(s)`}]);try{const before=structuredClone(project);const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,selectedIds:[...selected]})});const data=await response.json() as ApplyResponse;if(!response.ok||!data.project)throw new Error(data.error||"AI Director apply failed");onProjectChange(data.project);if(data.project.project.revision!==before.project.revision)pushHistory({projectId:project.project.id,label:`AI Director · ${data.appliedIds?.length??selected.size} suggestions`,before,after:data.project});setApplied(current=>new Set([...current,...(data.appliedIds??[])]));setSelected(new Set());setLastTransaction(data.transactionId??null);setActivity(current=>[...current,{stage:"done",message:`Transaction ${data.transactionId??"no-op"} · ${data.appliedIds?.length??0} applied`}]);}catch(caught){const message=caught instanceof Error?caught.message:String(caught);setError(message);setActivity(current=>[...current,{stage:"error",message}]);}finally{setBusy(false);}};

  const density=(value:number)=>Number.isFinite(value)?value.toFixed(1):"0.0";

  return <div className="ai-composer-completion">
    <section className="ai-composer-block ai-composer-prompt"><header><strong>{l.prompt}</strong><small>{l.safeArea}: {safeArea.label}</small></header><textarea value={intent} onChange={event=>setIntent(event.target.value)} placeholder={l.promptHint}/><div className="ai-director-actions"><button className="button small" disabled={busy||project.scenes.length===0} onClick={()=>void generate()}>{busy?l.working:plan?l.reanalyze:l.analyze}</button>{plan?<small>{l.source}: {plan.source==="provider"?l.provider:l.rules}</small>:null}</div>{project.scenes.length===0?<p className="hint">{l.noScenes}</p>:null}</section>

    {plan?<section className="ai-composer-block"><header><strong>{l.plan}</strong><small>{plan.context?.intent?`“${plan.context.intent.slice(0,80)}”`:"RULES"}</small></header><div className="ai-plan-summary"><div><small>{l.actionable}</small><strong>{planStats.actionable}</strong></div><div><small>{l.holds}</small><strong>{planStats.holds}</strong></div><div><small>{l.placed}</small><strong>{planStats.placed}</strong></div></div></section>:null}

    {activity.length?<section className="ai-composer-block"><header><strong>{l.activity}</strong><small>{activity.length}</small></header><ol className="ai-activity-list">{activity.map((item,index)=><li key={`${item.stage}-${index}`}><strong>{item.stage}</strong><span>{item.message}</span></li>)}</ol></section>:null}

    <details className="studio-tool-panel ai-director-panel" open>
      <summary><span><small>AI DIRECTOR · M5</small><strong>{l.title}</strong></span><em>⌄</em></summary>
      <div className="studio-tool-body ai-director-body">
        {plan?<>
          <div className="ai-director-review-head"><strong>{l.review}</strong><span>{plan.suggestions.length} {l.suggestions} · {selected.size} {l.selected}</span></div>
          <div className="ai-scene-groups">{sceneGroups.map(({scene,suggestions})=><section className="ai-scene-group" key={scene.id}>
            <header><span><strong>{scene.name}</strong><small>{scene.semanticType.toUpperCase()} · {scene.visualStrategy?.intensity?.toUpperCase()??"AUTO"}</small></span><em>{suggestions.length}</em></header>
            <div className="ai-suggestion-list">{suggestions.map(suggestion=>{const actionable=suggestion.recommendation.engine!=="none";const isApplied=applied.has(suggestion.id);const placement=suggestion.recommendation.placement;return <article className={`ai-suggestion ${!actionable?"density-hold":""} ${isApplied?"is-applied":""}`} key={suggestion.id}>
              <label className="ai-suggestion-main"><input type="checkbox" disabled={!actionable||isApplied} checked={selected.has(suggestion.id)} onChange={()=>toggle(suggestion.id)}/><span className="ai-suggestion-copy"><span className="ai-suggestion-badges"><b>{suggestion.semanticType.toUpperCase()}</b><b>{actionable?engineLabel(suggestion.recommendation.engine,suggestion.recommendation.effectId):l.hold}</b><i>{Math.round(suggestion.confidence*100)}%</i>{isApplied?<i>{l.applied}</i>:null}</span><strong>{suggestion.spokenText}</strong><small>f{suggestion.startFrame}–{suggestion.endFrame} · {suggestion.endFrame-suggestion.startFrame} {l.frames}</small>{placement?<small>{l.placement}: x {Math.round(placement.x*100)}% · y {Math.round(placement.y*100)}% · {placement.scale.toFixed(2)}× · {placement.anchor}</small>:null}</span></label>
              <details className="ai-suggestion-detail"><summary>{l.reason} · {l.alternatives}</summary><div><p><b>{l.reason}</b>{suggestion.reason}</p><p><b>{l.confidence}</b>{Math.round(suggestion.confidence*100)}%</p>{placement?.rationale?<p><b>{l.placement}</b>{placement.rationale}</p>:null}<div><b>{l.alternatives}</b>{suggestion.alternatives.length?<ul>{suggestion.alternatives.map((alternative,index)=><li key={`${alternative.engine}-${alternative.effectId??index}`}><strong>{engineLabel(alternative.engine,alternative.effectId)}</strong>{alternative.reason?<span>{alternative.reason}</span>:null}</li>)}</ul>:<span>{l.alternativesNone}</span>}</div></div></details>
            </article>;})}</div>
          </section>)}</div>

          {diff?<section className="ai-change-preview"><header><strong>{l.preview}</strong><small>PREVIEW DIFF</small></header><div className="ai-diff-counts"><span><b>{diff.add.length}</b>{l.add}</span><span><b>{diff.remove.length}</b>{l.remove}</span><span><b>{diff.shorten.length}</b>{l.shorten}</span><span><b>{diff.styleChanges.length}</b>{l.style}</span></div><div className="ai-density-row"><span><small>{l.density}</small><strong>{density(diff.densityBefore.cardsPerMinute)} → {density(diff.densityAfter.cardsPerMinute)} / min</strong></span><span><small>{l.peak}</small><strong>{diff.densityBefore.peakConcurrency} → {diff.densityAfter.peakConcurrency}</strong></span><span><small>{l.cards}</small><strong>{diff.densityBefore.motionCards} → {diff.densityAfter.motionCards}</strong></span></div>{diff.add.length===0?<p className="hint">{l.diffClean}</p>:null}</section>:null}

          <div className="ai-apply-bar"><button className="button secondary small" disabled={busy||selected.size===0||!diff?.add.length} onClick={()=>void apply()}>{l.apply} ({selected.size})</button><span>{l.undoHint}</span></div>
          {lastTransaction?<p className="ai-transaction-id">TX · {lastTransaction}</p>:null}
        </>:null}
        {error?<p className="render-error">{error}</p>:null}
      </div>
    </details>
  </div>;
};
