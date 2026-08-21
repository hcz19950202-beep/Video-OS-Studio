"use client";

import type {ProjectCommandTransaction} from "@/lib/project/history";
import {DEFAULT_MOTION_TRANSFORM,type MotionTransform} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";

export const MultiInspector=({project,onTransaction}:{project:Project;onTransaction:(transaction:ProjectCommandTransaction,message:string)=>Promise<void>})=>{
  const ids=useSelectionStore(state=>state.selectedClipIds);
  const clips=project.tracks.flatMap(track=>track.clips).filter(clip=>ids.includes(clip.id));
  const motions=clips.filter(clip=>clip.type==="motion");
  const allMotion=clips.length>1&&motions.length===clips.length;
  const scales=motions.map(clip=>({...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})}).scale);
  const opacities=motions.map(clip=>({...DEFAULT_MOTION_TRANSFORM,...(clip.transform??{})}).opacity);
  const commonScale=scales.length&&scales.every(value=>value===scales[0])?scales[0]:null;
  const commonOpacity=opacities.length&&opacities.every(value=>value===opacities[0])?opacities[0]:null;
  const bulkTransform=(patch:Partial<MotionTransform>)=>{
    if(!allMotion)return;
    void onTransaction({id:`bulk-transform-${Date.now()}`,label:"Bulk update motion clips",commands:motions.map(clip=>({type:"update-motion-transform" as const,clipId:clip.id,transform:patch}))},"Bulk update applied");
  };
  const bulkStyle=(styleId:string|null)=>{
    if(!allMotion)return;
    void onTransaction({id:`bulk-style-${Date.now()}`,label:"Assign linked style",commands:motions.map(clip=>({type:"assign-linked-style" as const,clipId:clip.id,styleId}))},"Linked style assigned");
  };
  return <div className="os-inspector">
    <header className="inspector-card-head"><small>MULTI SELECT</small><div><h2>{clips.length} clips</h2><em>Common Properties</em></div></header>
    {allMotion?<section className="inspector-section">
      <div className="inspector-section-title"><strong>Motion Common</strong><small>{motions.length}</small></div>
      <div className="layout-number-grid">
        <label><span>Scale</span><input placeholder={commonScale===null?"Mixed":String(commonScale)} defaultValue={commonScale??undefined} onBlur={event=>event.target.value&&bulkTransform({scale:Number(event.target.value)})}/></label>
        <label><span>Opacity</span><input placeholder={commonOpacity===null?"Mixed":String(commonOpacity)} defaultValue={commonOpacity??undefined} onBlur={event=>event.target.value&&bulkTransform({opacity:Number(event.target.value)})}/></label>
      </div>
      <label className="inspector-field"><span>Linked Style</span><select defaultValue="" onChange={event=>bulkStyle(event.target.value||null)}><option value="">Mixed / None</option>{project.linkedStyles.filter(style=>style.target==="motion"||style.target==="cta").map(style=><option key={style.id} value={style.id}>{style.name}</option>)}</select></label>
      <small className="inspector-help">One bulk edit is committed as one Project transaction / one revision.</small>
    </section>:<section className="inspector-section"><p>Mixed clip types selected. M3 only exposes safe common properties; type-specific fields remain hidden.</p></section>}
  </div>;
};
