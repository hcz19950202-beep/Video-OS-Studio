"use client";
import {useState} from "react";
import type {Project} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

export const VisualPlannerPanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const[plan,setPlan]=useState<VisualPlan|null>(null);
  const[selected,setSelected]=useState<Set<string>>(new Set());
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);

  const generate=async()=>{
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan`,{method:"POST"});
      const data=await response.json() as {plan?:VisualPlan;error?:string};
      if(!response.ok||!data.plan)throw new Error(data.error||"Visual Plan generation failed");
      setPlan(data.plan);setSelected(new Set(data.plan.slots.map((slot)=>slot.id)));
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const apply=async()=>{
    if(!plan)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/visual-plan/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,selectedIds:[...selected]})});
      const data=await response.json() as {project?:Project;error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||"Visual Plan apply failed");
      onProjectChange(data.project);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const toggle=(id:string)=>setSelected((current)=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});

  return <div className="visual-planner-panel">
    <div className="panel-heading"><h2>AI Visual Plan</h2><span className="asset-kind">review first</span></div>
    <button className="button small" disabled={busy} onClick={()=>void generate()}>{busy?"Working…":"Generate Plan"}</button>
    {plan?<div className="visual-slot-list">{plan.slots.length===0?<p className="hint">No strong visual moments were found. Keeping talking-head footage is valid.</p>:plan.slots.map((slot)=><label className="visual-slot" key={slot.id}><input type="checkbox" checked={selected.has(slot.id)} onChange={()=>toggle(slot.id)}/><span><strong>{slot.effectId}</strong><small>{slot.engine} · f{slot.startFrame} · {Math.round(slot.confidence*100)}%</small><em>{slot.reason}</em></span></label>)}</div>:null}
    {plan?<button className="button secondary small" disabled={busy||selected.size===0} onClick={()=>void apply()}>Apply Selected ({selected.size})</button>:null}
    <p className="hint">Current V1 planner is an explainable local fallback. A future model provider can replace the planner adapter without changing Project Commands or Timeline.</p>
    {error?<p className="render-error">{error}</p>:null}
  </div>;
};
