"use client";

import {useEffect,useMemo,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {
  CreativeAssetLibraryResponseSchema,
  type CreativeAssetLibraryItem,
  type CreativeAssetLibraryVersionView,
} from "@/lib/creative-assets/library-view";
import styles from "@/components/library/CreativeAssetLibrary.module.css";

const outputSummary=(version:CreativeAssetLibraryVersionView|undefined)=>{
  if(!version)return null;
  const artifact=[...version.artifacts]
    .reverse()
    .find(item=>item.state==="ready"&&(item.role==="final"||item.role==="preview"||item.role==="proxy"));
  if(!artifact)return null;
  const{width,height,fps,durationInFrames,codec,container}=artifact.profile;
  return{
    role:artifact.role,
    dimensions:width&&height?`${width}×${height}`:null,
    fps:fps?`${fps} fps`:null,
    duration:durationInFrames?`${durationInFrames}f`:null,
    format:[codec,container].filter(Boolean).join(" / ")||null,
  };
};

const previewArtifact=(version:CreativeAssetLibraryVersionView|undefined)=>
  version?.artifacts.find(item=>item.state==="ready"&&item.role==="thumbnail")??
  version?.artifacts.find(item=>item.state==="ready"&&item.role==="preview")??
  version?.artifacts.find(item=>item.state==="ready"&&item.role==="final");

const stateClass=(state:string)=>{
  if(state==="READY"||state==="PREVIEW_READY")return `${styles.badge} ${styles.badgeReady}`;
  if(state==="FAILED")return `${styles.badge} ${styles.badgeFailed}`;
  return styles.badge;
};

const preferredVersion=(item:CreativeAssetLibraryItem,requestedId:string)=>{
  if(requestedId){
    const requested=item.versions.find(version=>version.id===requestedId);
    if(requested)return requested;
  }
  const preferredId=item.recommendedVersionId??item.latestVersionId;
  return item.versions.find(version=>version.id===preferredId)??item.versions.at(-1);
};

export const CreativeAssetLibrary=()=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const[query,setQuery]=useState("");
  const[kind,setKind]=useState("");
  const[tag,setTag]=useState("");
  const[retryToken,setRetryToken]=useState(0);
  const[data,setData]=useState<ReturnType<typeof CreativeAssetLibraryResponseSchema.parse>|null>(null);
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(true);
  const[selectedId,setSelectedId]=useState("");
  const[selectedVersionId,setSelectedVersionId]=useState("");

  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams();
    if(query.trim())params.set("q",query.trim());
    if(kind)params.set("kind",kind);
    if(tag)params.set("tag",tag);
    setLoading(true);
    setError("");
    void fetch(`/api/creative-assets${params.size?`?${params.toString()}`:""}`,{
      cache:"no-store",
      signal:controller.signal,
    }).then(async response=>{
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.message||payload?.error||`HTTP ${response.status}`);
      setData(CreativeAssetLibraryResponseSchema.parse(payload));
    }).catch(fetchError=>{
      if(fetchError instanceof DOMException&&fetchError.name==="AbortError")return;
      setData(null);
      setError(fetchError instanceof Error?fetchError.message:String(fetchError));
    }).finally(()=>{
      if(!controller.signal.aborted)setLoading(false);
    });
    return()=>controller.abort();
  },[query,kind,tag,retryToken]);

  const items=data?.items??[];
  const selected=useMemo(
    ()=>items.find(item=>item.id===selectedId)??items[0],
    [items,selectedId],
  );
  const version=selected?preferredVersion(selected,selectedVersionId):undefined;
  const preview=previewArtifact(version);
  const output=outputSummary(version);

  return <section className={styles.library} data-testid="creative-asset-library">
    <div className={styles.intro}>
      <strong>{zh?"创意资产库":"Creative Asset Library"}</strong>
      <p>{zh?"跨项目复用已验证的动效、标题、CTA 与品牌素材。源文件与版本历史由 Video OS 管理。":"Reuse verified motion graphics, titles, CTAs and brand assets across projects. Video OS owns source packages and version history."}</p>
    </div>

    <div className={styles.controls}>
      <input
        className={styles.search}
        aria-label={zh?"搜索创意资产":"Search creative assets"}
        placeholder={zh?"搜索名称、标签、用途…":"Search name, tag, purpose…"}
        value={query}
        onChange={event=>setQuery(event.target.value)}
      />
      <div className={styles.filterRow}>
        <select className={styles.select} aria-label={zh?"资产类型":"Asset kind"} value={kind} onChange={event=>setKind(event.target.value)}>
          <option value="">{zh?"全部类型":"All kinds"}</option>
          {data?.filters.kinds.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <select className={styles.select} aria-label={zh?"资产标签":"Asset tag"} value={tag} onChange={event=>setTag(event.target.value)}>
          <option value="">{zh?"全部标签":"All tags"}</option>
          {data?.filters.tags.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
      </div>
    </div>

    {loading?<div className={styles.status} role="status">{zh?"正在读取创意资产库…":"Loading Creative Asset Library…"}</div>:null}
    {!loading&&error?<div className={`${styles.status} ${styles.error}`} role="alert"><strong>{zh?"资源库读取失败":"Library unavailable"}</strong><div>{error}</div><button className="button small" onClick={()=>setRetryToken(value=>value+1)}>{zh?"重试":"Retry"}</button></div>:null}
    {!loading&&!error&&items.length===0?<div className={styles.status} data-testid="creative-asset-empty">{zh?"还没有匹配的可复用创意资产。C2 不会自动制造假素材；后续 HyperFrames 生命周期会把真实资产沉淀到这里。":"No reusable Creative Assets match yet. C2 does not manufacture production fixtures; the HyperFrames lifecycle will populate real assets later."}</div>:null}

    {!loading&&!error&&items.length>0?<>
      <div className={styles.list} data-testid="creative-asset-list">
        {items.map(item=>{
          const cardVersion=preferredVersion(item,"");
          return <button
            type="button"
            key={item.id}
            className={`${styles.card} ${selected?.id===item.id?styles.cardActive:""}`}
            onClick={()=>{setSelectedId(item.id);setSelectedVersionId("");}}
            data-testid={`creative-asset-card-${item.id}`}
          >
            <div className={styles.cardTop}><strong>{item.name}</strong><span className={stateClass(cardVersion?.state??"DRAFT")}>{cardVersion?.state??"NO VERSION"}</span></div>
            <div className={styles.metaRow}><span className={styles.badge}>{item.kind}</span><span className={styles.badge}>{item.engine}</span><span className={styles.badge}>{item.editable?(zh?"可编辑":"editable"):(zh?"固定":"fixed")}</span></div>
            <div className={styles.tagRow}>{item.tags.slice(0,4).map(value=><span key={value} className={styles.tag}>{value}</span>)}</div>
          </button>;
        })}
      </div>

      {selected?<div className={styles.detail} data-testid="creative-asset-detail">
        <div className={styles.preview} data-testid="creative-asset-preview">
          <div>
            <strong>{preview?(zh?`${preview.role} 已就绪`:`${preview.role} ready`):(zh?"暂无可用预览":"No preview artifact yet")}</strong>
            <small>{preview?.profile.width&&preview.profile.height?`${preview.profile.width}×${preview.profile.height}`:(zh?"预览区域仅展示安全元数据，不暴露本机文件路径":"Preview surface exposes safe metadata only")}</small>
          </div>
        </div>
        <div className={styles.detailHeader}><h3>{selected.name}</h3><p>{selected.id}</p></div>
        <div className={styles.versionPanel}>
          <div className={styles.sectionLabel}><span>{zh?"版本":"Version"}</span><span>{selected.versions.length}</span></div>
          <select
            className={styles.select}
            aria-label={zh?"选择资产版本":"Select asset version"}
            value={version?.id??""}
            onChange={event=>setSelectedVersionId(event.target.value)}
          >
            {selected.versions.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.id} · {candidate.state}</option>)}
          </select>
          {version?<div className={styles.metaRow}><span className={stateClass(version.state)}>{version.state}</span><span className={styles.badge}>{version.engine} {version.engineVersion}</span><span className={styles.badge}>{version.origin}</span></div>:null}
          {version?.state==="FAILED"&&version.failureCode?<div className={styles.failed}>{version.failureCode}</div>:null}
          {output?<div className={styles.outputRow}><strong>{output.role}</strong>{output.dimensions?<span>{output.dimensions}</span>:null}{output.fps?<span>{output.fps}</span>:null}{output.duration?<span>{output.duration}</span>:null}{output.format?<span>{output.format}</span>:null}</div>:null}
        </div>

        {version&&Object.keys(version.parameterValues).length?<div className={styles.parameterList} data-testid="creative-asset-parameters">
          <div className={styles.sectionLabel}><span>{zh?"参数快照":"Parameter snapshot"}</span><span>{Object.keys(version.parameterValues).length}</span></div>
          {Object.entries(version.parameterValues).map(([key,value])=><div key={key} className={styles.parameter}><span>{key}</span><code>{JSON.stringify(value)}</code></div>)}
        </div>:null}

        <div className={styles.actions}>
          <button className={styles.action} disabled={!selected.actions.addToTimeline.enabled} title={selected.actions.addToTimeline.reason}>{zh?"加入时间轴":"Add to Timeline"} <span className={styles.stage}>{selected.actions.addToTimeline.availableIn}</span></button>
          <button className={styles.action} disabled={!selected.actions.duplicateAndEdit.enabled} title={selected.actions.duplicateAndEdit.reason}>{zh?"复制并编辑":"Duplicate & Edit"} <span className={styles.stage}>{selected.actions.duplicateAndEdit.availableIn}</span></button>
        </div>
        <p className={styles.actionNote}>{zh?"C2 只提供浏览、搜索与检查。加入项目在 C5 开启；不可变版本的复制编辑在 C7 开启。":"C2 is browse/search/inspect only. Project materialization unlocks in C5; immutable clone editing unlocks in C7."}</p>
      </div>:null}
    </>:null}
  </section>;
};
