"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useStudioPreferences} from "@/components/i18n/StudioPreferences";
import {useProjectStore} from "@/store/project-store";
import {useSelectionStore} from "@/store/selection-store";
import styles from "@/components/studio/ConnectionCenter.module.css";

type BridgeClient={
  credentialId:string;
  clientType:string;
  clientLabel:string;
  status:"connected"|"disconnected";
  connectedAt:string;
  lastSeenAt:string|null;
  observedClientName?:string;
  observedClientVersion?:string;
};
type BridgeActivity={
  id:string;
  at:string;
  kind:string;
  clientLabel?:string;
  toolId?:string;
  outcome:string;
  summary:string;
};
type BridgeSnapshot={
  status:"stopped"|"starting"|"ready"|"connected"|"degraded"|"disconnected"|"error";
  address:string|null;
  authentication:"enabled";
  protocolVersion:string;
  toolContractVersion:string;
  activeProjectId:string|null;
  lastActivityAt:string|null;
  clients:BridgeClient[];
  activity:BridgeActivity[];
};
type ControlledTool={
  id:string;
  version:string;
  description:string;
  riskClass:"R0"|"R1";
  requiredScopes:string[];
  authority:"direct-read"|"proposal-only";
  approval:{defaultMode:string;allowSessionOverride:boolean};
  revisionPolicy:string;
  idempotency:string;
};
type OneTimeCredential={credentialId:string;token:string;clientType:string;clientLabel:string};
type BridgeResponse={
  bridge?:BridgeSnapshot;
  tools?:ControlledTool[];
  credential?:OneTimeCredential;
  revoked?:boolean;
  error?:string;
};

const emptyBridge:BridgeSnapshot={
  status:"stopped",
  address:null,
  authentication:"enabled",
  protocolVersion:"—",
  toolContractVersion:"—",
  activeProjectId:null,
  lastActivityAt:null,
  clients:[],
  activity:[],
};

const requestBridge=async(body?:Record<string,unknown>):Promise<BridgeResponse>=>{
  const response=await fetch("/api/mcp-bridge",{
    method:body?"POST":"GET",
    headers:body?{"Content-Type":"application/json"}:undefined,
    body:body?JSON.stringify(body):undefined,
    cache:"no-store",
  });
  const payload=await response.json() as BridgeResponse;
  if(!response.ok)throw new Error(payload.error||`Connection Center request failed (${response.status}).`);
  return payload;
};

export const ConnectionCenter=()=>{
  const{locale}=useStudioPreferences();
  const zh=locale==="zh-CN";
  const project=useProjectStore(state=>state.project);
  const selectedClipIds=useSelectionStore(state=>state.selectedClipIds);
  const selectedSceneId=useSelectionStore(state=>state.selectedSceneId);
  const selectedScriptRange=useSelectionStore(state=>state.selectedScriptRange);
  const[open,setOpen]=useState(false);
  const[bridge,setBridge]=useState<BridgeSnapshot>(emptyBridge);
  const[tools,setTools]=useState<ControlledTool[]>([]);
  const[credential,setCredential]=useState<OneTimeCredential|null>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);

  const selection=useMemo(()=>({
    selectedClipIds,
    ...(selectedSceneId?{selectedSceneId}:{}),
    ...(selectedScriptRange?{selectedScriptRange}:{}),
  }),[selectedClipIds,selectedSceneId,selectedScriptRange]);

  const applyPayload=useCallback((payload:BridgeResponse)=>{
    if(payload.bridge)setBridge(payload.bridge);
    if(payload.tools)setTools(payload.tools);
    if(payload.credential)setCredential(payload.credential);
  },[]);

  const refresh=useCallback(async()=>{
    try{
      const payload=await requestBridge();
      applyPayload(payload);
      setError(null);
    }catch(fetchError){
      setError(fetchError instanceof Error?fetchError.message:"Connection Center unavailable.");
    }
  },[applyPayload]);

  const runAction=useCallback(async(body:Record<string,unknown>)=>{
    setBusy(true);
    setError(null);
    try{
      const payload=await requestBridge(body);
      applyPayload(payload);
      return payload;
    }catch(actionError){
      setError(actionError instanceof Error?actionError.message:"Connection Center action failed.");
      return null;
    }finally{
      setBusy(false);
    }
  },[applyPayload]);

  useEffect(()=>{
    if(!project){
      void requestBridge({action:"clear-context"}).then(applyPayload).catch(()=>undefined);
      return;
    }
    void requestBridge({
      action:"sync-context",
      projectId:project.project.id,
      selection,
    }).then(applyPayload).catch(()=>undefined);
  },[project,selection,applyPayload]);

  useEffect(()=>{
    if(!open)return;
    const interval=window.setInterval(()=>void refresh(),3_000);
    return()=>window.clearInterval(interval);
  },[open,refresh]);

  const close=()=>{
    setOpen(false);
    setCredential(null);
    setError(null);
  };
  const openCenter=()=>{
    setOpen(true);
    void refresh();
  };
  const pair=async()=>{
    setCredential(null);
    await runAction({
      action:"issue-credential",
      clientType:"external-mcp-client",
      clientLabel:"External MCP client",
    });
  };
  const rotate=async()=>{
    setCredential(null);
    await runAction({
      action:"rotate-credential",
      clientType:"external-mcp-client",
      clientLabel:"External MCP client",
    });
  };
  const authorityLabel=(tool:ControlledTool)=>tool.authority==="direct-read"
    ?(zh?"直接读取":"Direct read")
    :(zh?"仅创建提案":"Proposal only");
  const approvalLabel=(tool:ControlledTool)=>tool.authority==="proposal-only"
    ?(zh?"创建自动 · Apply 单独审批":"Create auto · Apply separately approved")
    :zh?"无需审批":"No approval";
  const live=bridge.status!=="stopped"&&bridge.status!=="error";

  return <div className={styles.root}>
    <button
      type="button"
      className={styles.trigger}
      data-testid="open-connection-center"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={()=>open?close():openCenter()}
    >
      <span className={styles.dot} data-live={live}/>
      {zh?"连接中心":"Connections"}
    </button>
    {open?<div className={styles.panel} role="dialog" aria-label={zh?"连接中心":"Connection Center"} data-testid="connection-center">
      <div className={styles.header}>
        <div>
          <h3>{zh?"连接中心":"Connection Center"}</h3>
          <p>{zh?"本机 MCP 受控桥接：允许读取当前 Project，并允许创建可审查的编辑提案；外部客户端没有直接 Apply 或 Project 写权限。":"Authenticated loopback MCP bridge: clients may read the open Project and create reviewable edit Proposals, but have no direct Apply or Project write authority."}</p>
        </div>
        <button type="button" className={styles.close} onClick={close} aria-label={zh?"关闭":"Close"}>×</button>
      </div>

      <div className={styles.statusGrid}>
        <div className={styles.statusCard}><span className={styles.label}>{zh?"状态":"Status"}</span><strong className={styles.value} data-testid="mcp-bridge-status">{bridge.status}</strong></div>
        <div className={styles.statusCard}><span className={styles.label}>{zh?"认证":"Authentication"}</span><strong className={styles.value}>{bridge.authentication}</strong></div>
        <div className={styles.statusCard}><span className={styles.label}>{zh?"地址":"Address"}</span><span className={styles.value} data-testid="mcp-bridge-address">{bridge.address??(zh?"未启动":"Not running")}</span></div>
        <div className={styles.statusCard}><span className={styles.label}>MCP / Tool Contract</span><span className={styles.value}>{bridge.protocolVersion} / {bridge.toolContractVersion}</span></div>
        <div className={styles.statusCard}><span className={styles.label}>{zh?"当前 Project":"Active Project"}</span><span className={styles.value} data-testid="mcp-active-project">{bridge.activeProjectId??"—"}</span></div>
        <div className={styles.statusCard}><span className={styles.label}>{zh?"最近活动":"Last activity"}</span><span className={styles.value}>{bridge.lastActivityAt?new Date(bridge.lastActivityAt).toLocaleTimeString():"—"}</span></div>
      </div>

      <div className={styles.actions}>
        {!live?<button type="button" disabled={busy} onClick={()=>void runAction({action:"start"})}>{zh?"启动受控桥":"Start controlled bridge"}</button>:<button type="button" disabled={busy} onClick={()=>void runAction({action:"stop"})}>{zh?"停止桥接":"Stop bridge"}</button>}
        <button type="button" disabled={busy||!live} data-testid="issue-mcp-credential" onClick={()=>void pair()}>{zh?"生成配对凭证":"Pair client"}</button>
        <button type="button" disabled={busy||!live} onClick={()=>void rotate()}>{zh?"轮换全部凭证":"Rotate credentials"}</button>
        <button type="button" className={styles.refresh} disabled={busy} onClick={()=>void refresh()}>{zh?"刷新":"Refresh"}</button>
      </div>

      {credential?<div className={styles.secret} data-testid="mcp-one-time-credential">
        <strong>{zh?"一次性凭证":"One-time credential"}</strong>
        <code>{credential.token}</code>
        <p>{zh?"仅此次显示。关闭连接中心后不会保留明文凭证。":"Shown only for this issuance. Plaintext is cleared when Connection Center closes."}</p>
      </div>:null}

      <section className={styles.section} data-permission-center="controlled-tools">
        <h4>{zh?`权限中心 · 受控工具（${tools.length}）`:`Permission Center · Controlled tools (${tools.length})`}</h4>
        <div className={styles.list} data-testid="mcp-read-tool-catalog">
          {tools.length===0?<p className={styles.empty}>{zh?"暂无工具数据。":"No tool catalog loaded."}</p>:tools.map(tool=><div className={styles.row} key={tool.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{tool.id}</span>
              <span className={styles.rowMeta}>{tool.riskClass} · {authorityLabel(tool)} · {approvalLabel(tool)}</span>
              <span className={styles.rowMeta}>v{tool.version} · {tool.requiredScopes.join(", ")} · {tool.revisionPolicy}</span>
            </div>
          </div>)}
        </div>
        <p className={styles.empty}>{zh?"R1 只能生成 Proposal。Apply 由应用层独立处理，并继续受 revision、History 和原子事务约束。":"R1 may create Proposals only. Apply remains application-owned and is still governed by revision, History, and atomic transaction boundaries."}</p>
      </section>

      <section className={styles.section}>
        <h4>{zh?`已配对客户端（${bridge.clients.length}）`:`Paired clients (${bridge.clients.length})`}</h4>
        <div className={styles.list}>
          {bridge.clients.length===0?<p className={styles.empty}>{zh?"尚未配对客户端。":"No paired clients."}</p>:bridge.clients.map(client=><div className={styles.row} key={client.credentialId}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{client.clientLabel}</span>
              <span className={styles.rowMeta}>{client.status}{client.observedClientName?` · ${client.observedClientName}`:""}</span>
            </div>
            <button type="button" disabled={busy} onClick={()=>void runAction({action:"revoke-credential",credentialId:client.credentialId})}>{zh?"撤销":"Revoke"}</button>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <h4>{zh?"活动（已脱敏）":"Activity (redacted)"}</h4>
        <div className={styles.list} data-testid="mcp-activity-log">
          {bridge.activity.length===0?<p className={styles.empty}>{zh?"暂无活动。":"No activity yet."}</p>:bridge.activity.slice().reverse().slice(0,20).map(item=><div className={styles.row} key={item.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{item.kind} · {item.outcome}{item.toolId?` · ${item.toolId}`:""}</span>
              <span className={`${styles.rowMeta} ${styles.activity}`}>{item.summary}</span>
            </div>
          </div>)}
        </div>
      </section>
      {error?<div className={styles.error} role="alert">{error}</div>:null}
    </div>:null}
  </div>;
};
