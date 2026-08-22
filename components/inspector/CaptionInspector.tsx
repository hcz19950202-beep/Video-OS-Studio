"use client";

import type {KeyboardEvent} from "react";
import type {ProjectCommand} from "@/lib/project/commands";
import type {CaptionVisualStyle} from "@/schemas/clip";
import type {Project} from "@/schemas/project";
import {useSelectionStore} from "@/store/selection-store";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {LinkedStyleControls} from "./LinkedStyleControls";
import {m3Label} from "./m3-i18n";

const consume=(promise:Promise<void>)=>{void promise.catch(()=>undefined);};
const blurOnEnter=(event:KeyboardEvent<HTMLInputElement>)=>{if(event.key==="Enter")event.currentTarget.blur();};
const sameStrings=(left:string[],right:string[])=>left.length===right.length&&left.every((value,index)=>value===right[index]);

export const CaptionInspector=({project,onCommand}:{project:Project;onCommand:(c:ProjectCommand,m:string)=>Promise<void>})=>{
  const id=useSelectionStore(state=>state.selectedClipId);
  const selectClip=useSelectionStore(state=>state.selectClip);
  const{locale,t}=useStudioPreferences();
  const clip=project.tracks.flatMap(track=>track.clips).find(item=>item.id===id);
  if(!clip||clip.type!=="caption")return null;

  const label=(key:Parameters<typeof m3Label>[1])=>m3Label(locale,key);
  const style=clip.style??{};
  const update=(patch:{preset?:"primary"|"minimal"|"bold";emphasis?:"none"|"numbers"|"keywords"|"both";keywords?:string[];style?:CaptionVisualStyle})=>
    onCommand({type:"update-caption-style",clipId:clip.id,...patch},t("inspector.updated"));
  const commitStyle=<K extends keyof CaptionVisualStyle>(key:K,value:CaptionVisualStyle[K],displayedCurrent:CaptionVisualStyle[K])=>{
    if(value===displayedCurrent)return;
    consume(update({style:{[key]:value}} as {style:CaptionVisualStyle}));
  };
  const updateTiming=(patch:{startFrame?:number;durationInFrames?:number})=>{
    if(patch.startFrame!==undefined){
      const startFrame=Math.max(0,Math.min(project.canvas.durationInFrames-1,patch.startFrame));
      if(startFrame===clip.startFrame)return;
      const maxDuration=Math.max(1,project.canvas.durationInFrames-startFrame);
      const durationInFrames=Math.min(clip.durationInFrames,maxDuration);
      consume(onCommand({type:"update-clip-timing",clipId:clip.id,startFrame,...(durationInFrames===clip.durationInFrames?{}:{durationInFrames})},t("timeline.updated")));
      return;
    }
    if(patch.durationInFrames!==undefined){
      const durationInFrames=Math.max(1,Math.min(project.canvas.durationInFrames-clip.startFrame,patch.durationInFrames));
      if(durationInFrames===clip.durationInFrames)return;
      consume(onCommand({type:"update-clip-timing",clipId:clip.id,durationInFrames},t("timeline.updated")));
    }
  };

  const fontSize=style.fontSize??50;
  const fontWeight=style.fontWeight??850;
  const lineHeight=style.lineHeight??1.25;
  const maxWidth=style.maxWidth??86;
  const fontFamily=style.fontFamily??project.brand.typography.captionFont;
  const fill=style.fill??project.brand.colors.text;

  return <div className="effect-inspector os-inspector">
    <header className="inspector-card-head"><small>{t("inspector.title")} · {clip.id.slice(0,14)}</small><div><span className="inspector-dot caption"/><h2>{t("caption.title")}</h2><em>{clip.preset}</em></div></header>
    <div data-inspector-section="linked"><LinkedStyleControls project={project} clip={clip} onCommand={onCommand}/></div>

    <section className="inspector-section" data-inspector-section="timing"><div className="inspector-section-title"><strong>{t("inspector.timing")}</strong><small>TIMING</small></div><div className="timing-grid">
      <label><span>{t("inspector.start")}</span><input type="number" min={0} max={project.canvas.durationInFrames-1} defaultValue={clip.startFrame} key={`${clip.id}-start-${clip.startFrame}`} onKeyDown={blurOnEnter} onBlur={event=>updateTiming({startFrame:Number(event.target.value)})}/></label>
      <label><span>{t("inspector.duration")}</span><input type="number" min={1} max={project.canvas.durationInFrames} defaultValue={clip.durationInFrames} key={`${clip.id}-duration-${clip.durationInFrames}`} onKeyDown={blurOnEnter} onBlur={event=>updateTiming({durationInFrames:Number(event.target.value)})}/></label>
    </div></section>

    <section className="inspector-section" data-inspector-section="content"><div className="inspector-section-title"><strong>{t("inspector.content")}</strong><small>{label("content")}</small></div>
      <label className="inspector-field"><span>{t("caption.keywords")}</span><input defaultValue={clip.keywords.join(", ")} key={`${clip.id}-keywords-${clip.keywords.join("|")}`} onKeyDown={blurOnEnter} onBlur={event=>{const keywords=event.target.value.split(",").map(value=>value.trim()).filter(Boolean);if(!sameStrings(keywords,clip.keywords))consume(update({keywords}));}}/></label>
      <div className="caption-copy">{clip.text}</div>
    </section>

    <section className="inspector-section" data-inspector-section="typography"><div className="inspector-section-title"><strong>{locale==="zh-CN"?"排版":"Typography"}</strong><small>TYPE</small></div>
      <div className="layout-number-grid">
        <label><span>{label("fontSize")}</span><input type="number" min={12} max={240} defaultValue={fontSize} key={`${clip.id}-fontSize-${fontSize}`} onKeyDown={blurOnEnter} onBlur={event=>commitStyle("fontSize",Number(event.target.value),fontSize)}/></label>
        <label><span>{label("fontWeight")}</span><input type="number" min={100} max={1000} step={100} defaultValue={fontWeight} key={`${clip.id}-fontWeight-${fontWeight}`} onKeyDown={blurOnEnter} onBlur={event=>commitStyle("fontWeight",Number(event.target.value),fontWeight)}/></label>
        <label><span>{label("lineHeight")}</span><input type="number" min={.7} max={3} step={.05} defaultValue={lineHeight} key={`${clip.id}-lineHeight-${lineHeight}`} onKeyDown={blurOnEnter} onBlur={event=>commitStyle("lineHeight",Number(event.target.value),lineHeight)}/></label>
        <label><span>{label("maxWidth")}</span><input type="number" min={20} max={100} defaultValue={maxWidth} key={`${clip.id}-maxWidth-${maxWidth}`} onKeyDown={blurOnEnter} onBlur={event=>commitStyle("maxWidth",Number(event.target.value),maxWidth)}/></label>
      </div>
      <label className="inspector-field"><span>{label("font")}</span><input defaultValue={fontFamily} key={`${clip.id}-font-${fontFamily}`} onKeyDown={blurOnEnter} onBlur={event=>{const value=event.target.value||project.brand.typography.captionFont;commitStyle("fontFamily",value,fontFamily);}}/></label>
    </section>

    <section className="inspector-section" data-inspector-section="style"><div className="inspector-section-title"><strong>{t("inspector.style")}</strong><small>{label("style")}</small></div>
      <label className="inspector-field"><span>{t("caption.preset")}</span><select value={clip.preset} onChange={event=>{const preset=event.target.value as "primary"|"minimal"|"bold";if(preset!==clip.preset)consume(update({preset}));}}><option value="primary">{t("caption.primary")}</option><option value="minimal">{t("caption.minimal")}</option><option value="bold">{t("caption.bold")}</option></select></label>
      <label className="inspector-field"><span>{t("caption.emphasis")}</span><select value={clip.emphasis} onChange={event=>{const emphasis=event.target.value as "none"|"numbers"|"keywords"|"both";if(emphasis!==clip.emphasis)consume(update({emphasis}));}}><option value="none">{t("caption.none")}</option><option value="numbers">{t("caption.numbers")}</option><option value="keywords">{t("caption.keywordsOnly")}</option><option value="both">{t("caption.both")}</option></select></label>
      <label className="inspector-field"><span>{label("fill")}</span><input type="color" defaultValue={fill} key={`${clip.id}-fill-${fill}`} onBlur={event=>commitStyle("fill",event.target.value,fill)}/></label>
      <label className="inspector-field"><span>{label("stroke")}</span><input defaultValue={style.stroke??""} key={`${clip.id}-stroke-${style.stroke??""}`} placeholder="#000000" onKeyDown={blurOnEnter} onBlur={event=>{const value=event.target.value;if(value&&value!==style.stroke)consume(update({style:{stroke:value}}));}}/></label>
      <label className="inspector-field"><span>{label("shadow")}</span><input defaultValue={style.shadow??""} key={`${clip.id}-shadow-${style.shadow??""}`} placeholder="0 4px 18px #000" onKeyDown={blurOnEnter} onBlur={event=>{const value=event.target.value;if(value&&value!==style.shadow)consume(update({style:{shadow:value}}));}}/></label>
      <label className="inspector-field"><span>{label("background")}</span><input defaultValue={style.background??""} key={`${clip.id}-background-${style.background??""}`} placeholder="rgba(0,0,0,.68)" onKeyDown={blurOnEnter} onBlur={event=>{const value=event.target.value;if(value&&value!==style.background)consume(update({style:{background:value}}));}}/></label>
    </section>

    <section className="inspector-section" data-inspector-section="transform"><div className="inspector-section-title"><strong>{locale==="zh-CN"?"布局":"Layout"}</strong><small>TRANSFORM</small></div>
      <label className="inspector-field"><span>{label("position")}</span><select value={style.position??"bottom"} onChange={event=>{const position=event.target.value as "top"|"center"|"bottom";if(position!==(style.position??"bottom"))consume(update({style:{position}}));}}><option value="top">{label("top")}</option><option value="center">{label("center")}</option><option value="bottom">{label("bottom")}</option></select></label>
      <label className="inspector-field"><span>{label("alignment")}</span><select value={style.alignment??"center"} onChange={event=>{const alignment=event.target.value as "left"|"center"|"right";if(alignment!==(style.alignment??"center"))consume(update({style:{alignment}}));}}><option value="left">{label("left")}</option><option value="center">{label("center")}</option><option value="right">{label("right")}</option></select></label>
    </section>

    <button className="inspector-delete" onClick={()=>consume(onCommand({type:"remove-clip",clipId:clip.id},t("timeline.deleted")).then(()=>selectClip(null)))}>▱ {t("inspector.delete")}</button>
  </div>;
};
