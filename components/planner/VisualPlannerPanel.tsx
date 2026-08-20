"use client";

import {useState} from "react";
import type {Project} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const VisualPlannerPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{t}=useStudioPreferences();
  const[plan,setPlan]=useState<VisualPlan|null>(null);
  const[selected,setSelected]=useState<Set<string>>(new Set());
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const generate=async()=>{setBusy(true);setError(null);try{const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan`,{method:"POST"});const data=await response.json() as {plan?:VisualPlan;error?:string};if(!response.ok||!data.plan)throw new Error(data.error||"Visual Plan generation failed");setPlan(data.plan);setSelected(new Set(data.plan.slots.map(slot=>slot.id)));}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const apply=async()=>{if(!plan)return;setBusy(true);setError(null);try{const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,selectedIds:[...selected]})});const data=await response.json() as {project?:Project;error?:string};if(!response.ok||!data.project)throw new Error(data.error||"Visual Plan apply failed");onProjectChange(data.project);}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});

  return <details className="studio-tool-panel" open><summary><span><small>AI DIRECTOR</small><strong>{t("planner.title")}</strong></span><em>⌄</em></summary><div className="studio-tool-body"><button className="button small" disabled={busy} onClick={()=>void generate()}>{busy?t("videoUse.working"):t("planner.generate")}</button>{plan?<div className="visual-slot-list">{plan.slots.length===0?<p className="hint">{t("planner.empty")}</p>:plan.slots.map(slot=><label className="visual-slot" key={slot.id}><input type="checkbox" checked={selected.has(slot.id)} onChange={()=>toggle(slot.id)}/><span><strong>{slot.effectId}</strong><small>{slot.engine} · f{slot.startFrame} · {Math.round(slot.confidence*100)}%</small><em>{slot.reason}</em></span></label>)}</div>:null}{plan?<button className="button secondary small" disabled={busy||selected.size===0} onClick={()=>void apply()}>{t("planner.apply")} ({selected.size})</button>:null}<p className="hint">{t("planner.hint")}</p>{error?<p className="render-error">{error}</p>:null}</div></details>;
};
