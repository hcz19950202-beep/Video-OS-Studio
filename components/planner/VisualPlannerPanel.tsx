"use client";

import {useMemo,useState} from "react";
import {applyVisualPlan,generateVisualPlan} from "@/lib/client/planner";
import {createOperationId} from "@/lib/client/project-mutations";
import type {Project} from "@/schemas/project";
import {buildVisualPlanDiff} from "@/lib/visual-planner/diff";
import type {VisualPlan} from "@/lib/visual-planner/schema";
import {useHistoryStore} from "@/store/history-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useProjectStudioPrefs} from "@/components/studio/useProjectStudioPrefs";

type Activity={stage:string;message:string};
const engineLabel=(engine:string,effectId?:string)=>engine==="none"?"NONE":`${engine.toUpperCase()}${effectId?` · ${effectId}`:""}`;

export const VisualPlannerPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{t}=useStudioPreferences();
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

  const generate=async()=>{setBusy(true);setError(null);setActivity([{stage:"context",message:`${project.canvas.width}×${project.canvas.height} · ${safeArea.label}`},{stage:"analyze",message:t("planner.director.activity.analyze")}]);try{const nextPlan=await generateVisualPlan(project.project.id,{intent,safeArea:{profileId:safeArea.id,...safeArea.insets}});const actionable=nextPlan.suggestions.filter(item=>item.recommendation.engine!=="none").length;setPlan(nextPlan);setSelected(new Set(nextPlan.suggestions.filter(suggestion=>suggestion.recommendation.engine!=="none").map(suggestion=>suggestion.id)));setApplied(new Set());setLastTransaction(null);setActivity(current=>[...current,{stage:"plan",message:t("planner.director.activity.plan",{suggestions:nextPlan.suggestions.length,actionable})},{stage:"review",message:t("planner.director.activity.review")}]);}catch(caught){const message=caught instanceof Error?caught.message:String(caught);setError(message);setActivity(current=>[...current,{stage:"error",message}]);}finally{setBusy(false);}};
  const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});

  const apply=async()=>{if(!plan||selected.size===0)return;setBusy(true);setError(null);setActivity(current=>[...current,{stage:"apply",message:t("planner.director.activity.apply",{selected:selected.size})}]);try{const before=structuredClone(project);const data=await applyVisualPlan(project.project.id,{expectedRevision:project.project.revision,operationId:createOperationId("ai-director"),plan,selectedIds:[...selected]});onProjectChange(data.project);if(data.project.project.revision!==before.project.revision)pushHistory({projectId:project.project.id,label:`AI Director · ${data.appliedIds?.length??selected.size} suggestions`,before,after:data.project});setApplied(current=>new Set([...current,...(data.appliedIds??[])]));setSelected(new Set());setLastTransaction(data.transactionId??null);setActivity(current=>[...current,{stage:"done",message:t("planner.director.activity.done",{transaction:data.transactionId??"no-op",applied:data.appliedIds?.length??0})}]);}catch(caught){const message=caught instanceof Error?caught.message:String(caught);setError(message);setActivity(current=>[...current,{stage:"error",message}]);}finally{setBusy(false);}};

  const density=(value:number)=>Number.isFinite(value)?value.toFixed(1):"0.0";

  return <div className="ai-composer-completion">
    <section className="ai-composer-block ai-composer-prompt"><header><strong>{t("planner.director.prompt")}</strong><small>{t("planner.director.safeArea")}: {safeArea.label}</small></header><textarea value={intent} onChange={event=>setIntent(event.target.value)} placeholder={t("planner.director.promptHint")}/><div className="ai-director-actions"><button className="button small" disabled={busy||project.scenes.length===0} onClick={()=>void generate()}>{busy?t("planner.director.working"):plan?t("planner.director.reanalyze"):t("planner.director.analyze")}</button>{plan?<small>{t("planner.director.source")}: {plan.source==="provider"?t("planner.director.provider"):t("planner.director.rules")}</small>:null}</div>{project.scenes.length===0?<p className="hint">{t("planner.director.noScenes")}</p>:null}</section>

    {plan?<section className="ai-composer-block"><header><strong>{t("planner.director.plan")}</strong><small>{plan.context?.intent?`“${plan.context.intent.slice(0,80)}”`:"RULES"}</small></header><div className="ai-plan-summary"><div><small>{t("planner.director.actionable")}</small><strong>{planStats.actionable}</strong></div><div><small>{t("planner.director.holds")}</small><strong>{planStats.holds}</strong></div><div><small>{t("planner.director.placed")}</small><strong>{planStats.placed}</strong></div></div></section>:null}

    {activity.length?<section className="ai-composer-block"><header><strong>{t("planner.director.activity")}</strong><small>{activity.length}</small></header><ol className="ai-activity-list">{activity.map((item,index)=><li key={`${item.stage}-${index}`}><strong>{item.stage}</strong><span>{item.message}</span></li>)}</ol></section>:null}

    <details className="studio-tool-panel ai-director-panel" open>
      <summary><span><small>AI DIRECTOR · M5</small><strong>{t("planner.director.title")}</strong></span><em>⌄</em></summary>
      <div className="studio-tool-body ai-director-body">
        {plan?<>
          <div className="ai-director-review-head"><strong>{t("planner.director.review")}</strong><span>{plan.suggestions.length} {t("planner.director.suggestions")} · {selected.size} {t("planner.director.selected")}</span></div>
          <div className="ai-scene-groups">{sceneGroups.map(({scene,suggestions})=><section className="ai-scene-group" key={scene.id}>
            <header><span><strong>{scene.name}</strong><small>{scene.semanticType.toUpperCase()} · {scene.visualStrategy?.intensity?.toUpperCase()??"AUTO"}</small></span><em>{suggestions.length}</em></header>
            <div className="ai-suggestion-list">{suggestions.map(suggestion=>{const actionable=suggestion.recommendation.engine!=="none";const isApplied=applied.has(suggestion.id);const placement=suggestion.recommendation.placement;return <article className={`ai-suggestion ${!actionable?"density-hold":""} ${isApplied?"is-applied":""}`} key={suggestion.id}>
              <label className="ai-suggestion-main"><input type="checkbox" disabled={!actionable||isApplied} checked={selected.has(suggestion.id)} onChange={()=>toggle(suggestion.id)}/><span className="ai-suggestion-copy"><span className="ai-suggestion-badges"><b>{suggestion.semanticType.toUpperCase()}</b><b>{actionable?engineLabel(suggestion.recommendation.engine,suggestion.recommendation.effectId):t("planner.director.hold")}</b><i>{Math.round(suggestion.confidence*100)}%</i>{isApplied?<i>{t("planner.director.applied")}</i>:null}</span><strong>{suggestion.spokenText}</strong><small>f{suggestion.startFrame}–{suggestion.endFrame} · {suggestion.endFrame-suggestion.startFrame} {t("planner.director.frames")}</small>{placement?<small>{t("planner.director.placement")}: x {Math.round(placement.x*100)}% · y {Math.round(placement.y*100)}% · {placement.scale.toFixed(2)}× · {placement.anchor}</small>:null}</span></label>
              <details className="ai-suggestion-detail"><summary>{t("planner.director.reason")} · {t("planner.director.alternatives")}</summary><div><p><b>{t("planner.director.reason")}</b>{suggestion.reason}</p><p><b>{t("planner.director.confidence")}</b>{Math.round(suggestion.confidence*100)}%</p>{placement?.rationale?<p><b>{t("planner.director.placement")}</b>{placement.rationale}</p>:null}<div><b>{t("planner.director.alternatives")}</b>{suggestion.alternatives.length?<ul>{suggestion.alternatives.map((alternative,index)=><li key={`${alternative.engine}-${alternative.effectId??index}`}><strong>{engineLabel(alternative.engine,alternative.effectId)}</strong>{alternative.reason?<span>{alternative.reason}</span>:null}</li>)}</ul>:<span>{t("planner.director.alternativesNone")}</span>}</div></div></details>
            </article>;})}</div>
          </section>)}</div>

          {diff?<section className="ai-change-preview"><header><strong>{t("planner.director.preview")}</strong><small>PREVIEW DIFF</small></header><div className="ai-diff-counts"><span><b>{diff.add.length}</b>{t("planner.director.add")}</span><span><b>{diff.remove.length}</b>{t("planner.director.remove")}</span><span><b>{diff.shorten.length}</b>{t("planner.director.shorten")}</span><span><b>{diff.styleChanges.length}</b>{t("planner.director.style")}</span></div><div className="ai-density-row"><span><small>{t("planner.director.density")}</small><strong>{density(diff.densityBefore.cardsPerMinute)} → {density(diff.densityAfter.cardsPerMinute)} / min</strong></span><span><small>{t("planner.director.peak")}</small><strong>{diff.densityBefore.peakConcurrency} → {diff.densityAfter.peakConcurrency}</strong></span><span><small>{t("planner.director.cards")}</small><strong>{diff.densityBefore.motionCards} → {diff.densityAfter.motionCards}</strong></span></div>{diff.add.length===0?<p className="hint">{t("planner.director.diffClean")}</p>:null}</section>:null}

          <div className="ai-apply-bar"><button className="button secondary small" disabled={busy||selected.size===0||!diff?.add.length} onClick={()=>void apply()}>{t("planner.director.apply")} ({selected.size})</button><span>{t("planner.director.undoHint")}</span></div>
          {lastTransaction?<p className="ai-transaction-id">TX · {lastTransaction}</p>:null}
        </>:null}
        {error?<p className="render-error">{error}</p>:null}
      </div>
    </details>
  </div>;
};
