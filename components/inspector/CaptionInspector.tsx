"use client";

import type {ProjectCommand} from "@/lib/project/commands";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

export const CaptionInspector=({project,onCommand}:{project:Project;onCommand:(c:ProjectCommand,m:string)=>Promise<void>})=>{
  const id=useSelectionStore(state=>state.selectedClipId);
  const selectClip=useSelectionStore(state=>state.selectClip);
  const{t}=useStudioPreferences();
  const clip=project.tracks.flatMap(track=>track.clips).find(item=>item.id===id);
  if(!clip||clip.type!=="caption")return null;
  const update=(patch:{preset?:"primary"|"minimal"|"bold";emphasis?:"none"|"numbers"|"keywords"|"both";keywords?:string[]})=>void onCommand({type:"update-caption-style",clipId:clip.id,...patch},t("inspector.updated"));
  const updateTiming=(patch:{startFrame?:number;durationInFrames?:number})=>{
    const startFrame=Math.max(0,Math.min(project.canvas.durationInFrames-1,patch.startFrame??clip.startFrame));
    const durationInFrames=Math.max(1,Math.min(project.canvas.durationInFrames-startFrame,patch.durationInFrames??clip.durationInFrames));
    void onCommand({type:"update-clip-timing",clipId:clip.id,startFrame,durationInFrames},t("timeline.updated"));
  };
  return <div className="effect-inspector os-inspector">
    <header className="inspector-card-head"><small>{t("inspector.title")} · {clip.id.slice(0,14)}</small><div><span className="inspector-dot caption"/><h2>{t("caption.title")}</h2><em>{clip.preset}</em></div></header>
    <section className="inspector-section"><div className="inspector-section-title"><strong>{t("inspector.timing")}</strong><small>TIMING</small></div><div className="timing-grid"><label><span>{t("inspector.start")}</span><input type="number" min={0} max={project.canvas.durationInFrames-1} defaultValue={clip.startFrame} key={`${clip.id}-start-${clip.startFrame}`} onBlur={event=>updateTiming({startFrame:Number(event.target.value)})}/></label><label><span>{t("inspector.duration")}</span><input type="number" min={1} max={project.canvas.durationInFrames} defaultValue={clip.durationInFrames} key={`${clip.id}-duration-${clip.durationInFrames}`} onBlur={event=>updateTiming({durationInFrames:Number(event.target.value)})}/></label></div></section>
    <section className="inspector-section"><div className="inspector-section-title"><strong>{t("inspector.style")}</strong><small>STYLE</small></div><label className="inspector-field"><span>{t("caption.preset")}</span><select value={clip.preset} onChange={event=>update({preset:event.target.value as "primary"|"minimal"|"bold"})}><option value="primary">{t("caption.primary")}</option><option value="minimal">{t("caption.minimal")}</option><option value="bold">{t("caption.bold")}</option></select></label><label className="inspector-field"><span>{t("caption.emphasis")}</span><select value={clip.emphasis} onChange={event=>update({emphasis:event.target.value as "none"|"numbers"|"keywords"|"both"})}><option value="none">{t("caption.none")}</option><option value="numbers">{t("caption.numbers")}</option><option value="keywords">{t("caption.keywordsOnly")}</option><option value="both">{t("caption.both")}</option></select></label></section>
    <section className="inspector-section"><div className="inspector-section-title"><strong>{t("inspector.content")}</strong><small>CONTENT</small></div><label className="inspector-field"><span>{t("caption.keywords")}</span><input defaultValue={clip.keywords.join(", ")} onBlur={event=>update({keywords:event.target.value.split(",").map(value=>value.trim()).filter(Boolean)})}/></label><div className="caption-copy">{clip.text}</div></section>
    <button className="inspector-delete" onClick={()=>void onCommand({type:"remove-clip",clipId:clip.id},t("timeline.deleted")).then(()=>selectClip(null))}>▱ {t("inspector.delete")}</button>
  </div>;
};
