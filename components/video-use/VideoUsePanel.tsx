"use client";
import {useState} from "react";
import type {Project} from "@/schemas/project";

const sample=JSON.stringify({version:1,ranges:[{start:0,end:5,beat:"HOOK",reason:"Keep strongest opening"},{start:7.2,end:18,beat:"BODY",reason:"Remove false start between ranges"}]},null,2);

export const VideoUsePanel=({project,onProjectChange}:{project:Project;onProjectChange:(project:Project)=>void})=>{
  const[busy,setBusy]=useState(false);
  const[packed,setPacked]=useState("");
  const[edl,setEdl]=useState(sample);
  const[error,setError]=useState<string|null>(null);

  const prepare=async()=>{
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/video-use/prepare`,{method:"POST"});
      const data=await response.json() as {result?:{packedText:string};error?:string};
      if(!response.ok||!data.result)throw new Error(data.error||"video-use prepare failed");
      setPacked(data.result.packedText);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  const apply=async()=>{
    setBusy(true);setError(null);
    try{
      const parsed=JSON.parse(edl) as unknown;
      const response=await fetch(`/api/projects/${encodeURIComponent(project.project.id)}/video-use/apply-edl`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed)});
      const data=await response.json() as {project?:Project;error?:string};
      if(!response.ok||!data.project)throw new Error(data.error||"EDL apply failed");
      onProjectChange(data.project);
    }catch(caught){setError(caught instanceof Error?caught.message:String(caught));}
    finally{setBusy(false);}
  };

  return <div className="video-use-panel">
    <div className="panel-heading"><h2>video-use</h2><span className="asset-kind">rough cut</span></div>
    <button className="button small" disabled={busy||!project.assets.some((asset)=>asset.kind==="video")} onClick={()=>void prepare()}>{busy?"Working…":"Transcribe + Pack"}</button>
    {packed?<details open><summary>takes_packed.md</summary><pre>{packed}</pre></details>:null}
    <label><span>Confirmed EDL JSON</span><textarea value={edl} onChange={(event)=>setEdl(event.target.value)} rows={10}/></label>
    <button className="button secondary small" disabled={busy} onClick={()=>void apply()}>Apply EDL to Timeline</button>
    <p className="hint">Review the packed transcript and confirm the edit strategy before applying EDL. External seconds are converted to canonical project frames.</p>
    {error?<p className="render-error">{error}</p>:null}
  </div>;
};
