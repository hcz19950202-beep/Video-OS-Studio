"use client";

import {useState} from "react";
import {createOperationId} from "@/lib/client/project-mutations";
import {applyVideoUseEdl,prepareVideoUse} from "@/lib/client/video-use";
import type {VideoUseEdl} from "@/lib/video-use/edl";
import type {Project} from "@/schemas/project";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";

const sample=JSON.stringify({version:1,ranges:[{start:0,end:5,beat:"HOOK",reason:"Keep strongest opening"},{start:7.2,end:18,beat:"BODY",reason:"Remove false start between ranges"}]},null,2);

export const VideoUsePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const{locale,t}=useStudioPreferences();
  const[busy,setBusy]=useState(false);
  const[packed,setPacked]=useState("");
  const[preparedCount,setPreparedCount]=useState<number|null>(null);
  const[edl,setEdl]=useState(sample);
  const[error,setError]=useState<string|null>(null);

  const prepare=async()=>{setBusy(true);setError(null);try{const result=await prepareVideoUse(project.project.id,{expectedRevision:project.project.revision,operationId:createOperationId("video-use-prepare")});setPacked(result.packedText);setPreparedCount(result.scriptSegmentCount);onProjectChange(result.project);}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};
  const apply=async()=>{setBusy(true);setError(null);try{const parsed=JSON.parse(edl) as VideoUseEdl;const next=await applyVideoUseEdl(project.project.id,{expectedRevision:project.project.revision,operationId:createOperationId("video-use-edl"),edl:parsed});onProjectChange(next);}catch(caught){setError(caught instanceof Error?caught.message:String(caught));}finally{setBusy(false);}};

  return <details className="studio-tool-panel" open><summary><span><small>{t("videoUse.badge")}</small><strong>{t("videoUse.title")}</strong></span><em>⌄</em></summary><div className="studio-tool-body"><button className="button small" disabled={busy||!project.assets.some(asset=>asset.kind==="video")} onClick={()=>void prepare()}>{busy?t("videoUse.working"):t("videoUse.prepare")}</button>{preparedCount!==null?<p className="hint">{locale==="zh-CN"?`已生成 ${preparedCount} 个可编辑 Script 段落。`:`Created ${preparedCount} editable Script segments.`}</p>:null}{packed?<details className="packed-output"><summary>takes_packed.md</summary><pre>{packed}</pre></details>:null}<label className="tool-field"><span>{t("videoUse.edl")}</span><textarea value={edl} onChange={event=>setEdl(event.target.value)} rows={8}/></label><button className="button secondary small" disabled={busy} onClick={()=>void apply()}>{t("videoUse.apply")}</button><p className="hint">{t("videoUse.hint")}</p>{error?<p className="render-error">{error}</p>:null}</div></details>;
};