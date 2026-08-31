import {createHash,randomBytes,randomUUID,timingSafeEqual} from "node:crypto";
import {
  AgentSelectionSnapshotSchema,
  type AgentContextService,
  type AgentSelectionSnapshot,
} from "@/lib/ai/context";
import type {SharedToolExecutionContext} from "@/lib/ai/tools/shared-registry";

export const LOCAL_MCP_PROTOCOL_VERSION="2026-07-28" as const;
export const LOCAL_MCP_TOOL_CONTRACT_VERSION="1.0.0" as const;
export const LOCAL_MCP_STALE_CLIENT_MS=60_000;
export const LOCAL_MCP_MAX_ACTIVITY=100;

export type LocalMcpBridgeStatus=
  |"stopped"
  |"starting"
  |"ready"
  |"connected"
  |"degraded"
  |"disconnected"
  |"error";

export type LocalMcpCredentialPrincipal={
  credentialId:string;
  clientType:string;
  clientLabel:string;
};

type CredentialRecord=LocalMcpCredentialPrincipal&{
  tokenHash:Buffer;
  createdAt:string;
  lastSeenAt?:string;
  observedClientName?:string;
  observedClientVersion?:string;
};

export type LocalMcpActivity={
  id:string;
  at:string;
  kind:"bridge"|"auth"|"discover"|"tool-list"|"tool-call"|"error";
  clientLabel?:string;
  toolId?:string;
  outcome:"success"|"denied"|"error"|"cancelled";
  summary:string;
};

export type LocalMcpBridgeSnapshot={
  status:LocalMcpBridgeStatus;
  address:string|null;
  authentication:"enabled";
  protocolVersion:typeof LOCAL_MCP_PROTOCOL_VERSION;
  toolContractVersion:typeof LOCAL_MCP_TOOL_CONTRACT_VERSION;
  activeProjectId:string|null;
  lastActivityAt:string|null;
  clients:Array<{
    credentialId:string;
    clientType:string;
    clientLabel:string;
    status:"connected"|"disconnected";
    connectedAt:string;
    lastSeenAt:string|null;
    observedClientName?:string;
    observedClientVersion?:string;
  }>;
  activity:LocalMcpActivity[];
};

const sha256=(value:string)=>createHash("sha256").update(value,"utf8").digest();
const safeLabel=(value:string,fallback:string)=>value.trim().slice(0,120)||fallback;
const isoNow=()=>new Date().toISOString();

export class LocalMcpBridgeController{
  private status:LocalMcpBridgeStatus="stopped";
  private address:string|null=null;
  private activeProject:{projectId:string;selection:AgentSelectionSnapshot}|null=null;
  private readonly credentials=new Map<string,CredentialRecord>();
  private readonly activity:LocalMcpActivity[]=[];
  private lastActivityAt:string|null=null;

  constructor(private readonly contextService:AgentContextService){}

  issueCredential(input:{clientType:string;clientLabel:string}):{
    credentialId:string;
    token:string;
    clientType:string;
    clientLabel:string;
  }{
    const token=randomBytes(32).toString("base64url");
    const credentialId=randomUUID();
    const record:CredentialRecord={
      credentialId,
      clientType:safeLabel(input.clientType,"external"),
      clientLabel:safeLabel(input.clientLabel,"External MCP client"),
      tokenHash:sha256(token),
      createdAt:isoNow(),
    };
    this.credentials.set(credentialId,record);
    this.recordActivity({
      kind:"auth",
      clientLabel:record.clientLabel,
      outcome:"success",
      summary:"A new local MCP credential was issued. The secret is not retained in activity state.",
    });
    return {credentialId,token,clientType:record.clientType,clientLabel:record.clientLabel};
  }

  rotateCredential(input:{clientType:string;clientLabel:string}){
    this.credentials.clear();
    this.recordActivity({
      kind:"auth",
      outcome:"success",
      summary:"All previous local MCP credentials were revoked before rotation.",
    });
    return this.issueCredential(input);
  }

  revokeCredential(credentialId:string){
    const record=this.credentials.get(credentialId);
    if(!record)return false;
    this.credentials.delete(credentialId);
    this.recordActivity({
      kind:"auth",
      clientLabel:record.clientLabel,
      outcome:"success",
      summary:"Local MCP credential revoked.",
    });
    return true;
  }

  authenticateBearer(header:string|undefined):LocalMcpCredentialPrincipal|null{
    if(!header?.startsWith("Bearer "))return null;
    const token=header.slice(7).trim();
    if(token.length<32||token.length>256)return null;
    const candidate=sha256(token);
    for(const record of this.credentials.values()){
      if(record.tokenHash.length===candidate.length&&timingSafeEqual(record.tokenHash,candidate)){
        return {
          credentialId:record.credentialId,
          clientType:record.clientType,
          clientLabel:record.clientLabel,
        };
      }
    }
    return null;
  }

  observeAuthenticatedRequest(input:{
    principal:LocalMcpCredentialPrincipal;
    clientInfo?:{name?:string;version?:string};
    kind:LocalMcpActivity["kind"];
    toolId?:string;
    outcome?:LocalMcpActivity["outcome"];
    summary:string;
  }){
    const record=this.credentials.get(input.principal.credentialId);
    if(!record)return;
    const now=isoNow();
    record.lastSeenAt=now;
    if(input.clientInfo?.name)record.observedClientName=safeLabel(input.clientInfo.name,"External MCP client");
    if(input.clientInfo?.version)record.observedClientVersion=safeLabel(input.clientInfo.version,"unknown");
    if(this.status==="ready"||this.status==="disconnected")this.status="connected";
    this.recordActivity({
      kind:input.kind,
      clientLabel:record.clientLabel,
      ...(input.toolId?{toolId:input.toolId}:{}),
      outcome:input.outcome??"success",
      summary:input.summary,
    });
  }

  setActiveProject(projectId:string,selection?:Partial<AgentSelectionSnapshot>){
    this.activeProject={
      projectId,
      selection:AgentSelectionSnapshotSchema.parse(selection??{}),
    };
  }

  clearActiveProject(projectId?:string){
    if(!this.activeProject)return;
    if(projectId&&this.activeProject.projectId!==projectId)return;
    this.activeProject=null;
  }

  async createExecutionContext(input:{
    principal:LocalMcpCredentialPrincipal;
    requestId:string;
    signal?:AbortSignal;
  }):Promise<SharedToolExecutionContext|null>{
    if(!this.activeProject)return null;
    const snapshot=await this.contextService.build(
      this.activeProject.projectId,
      this.activeProject.selection,
    );
    return {
      transport:"mcp",
      projectId:snapshot.projectId,
      requestId:input.requestId,
      sessionId:input.principal.credentialId,
      ...(input.signal?{signal:input.signal}:{}),
      projectContext:snapshot,
    };
  }

  markStarting(){
    this.status="starting";
    this.recordActivity({kind:"bridge",outcome:"success",summary:"Local MCP bridge starting."});
  }

  markReady(address:string){
    this.address=address;
    this.status="ready";
    this.recordActivity({kind:"bridge",outcome:"success",summary:"Local MCP bridge ready on loopback."});
  }

  markStopped(){
    this.address=null;
    this.status="stopped";
    this.recordActivity({kind:"bridge",outcome:"success",summary:"Local MCP bridge stopped."});
  }

  markError(){
    this.status="error";
    this.recordActivity({kind:"error",outcome:"error",summary:"Local MCP bridge entered an error state."});
  }

  getSnapshot(nowMs=Date.now()):LocalMcpBridgeSnapshot{
    const clients=[...this.credentials.values()]
      .map(record=>{
        const lastSeenMs=record.lastSeenAt?Date.parse(record.lastSeenAt):0;
        const connected=lastSeenMs>0&&nowMs-lastSeenMs<=LOCAL_MCP_STALE_CLIENT_MS;
        return {
          credentialId:record.credentialId,
          clientType:record.clientType,
          clientLabel:record.clientLabel,
          status:(connected?"connected":"disconnected") as "connected"|"disconnected",
          connectedAt:record.createdAt,
          lastSeenAt:record.lastSeenAt??null,
          ...(record.observedClientName?{observedClientName:record.observedClientName}:{}),
          ...(record.observedClientVersion?{observedClientVersion:record.observedClientVersion}:{}),
        };
      })
      .sort((a,b)=>a.clientLabel.localeCompare(b.clientLabel)||a.credentialId.localeCompare(b.credentialId));

    let status=this.status;
    if(status==="connected"&&!clients.some(client=>client.status==="connected"))status="disconnected";
    if(status==="ready"&&clients.some(client=>client.status==="connected"))status="connected";

    return {
      status,
      address:this.address,
      authentication:"enabled",
      protocolVersion:LOCAL_MCP_PROTOCOL_VERSION,
      toolContractVersion:LOCAL_MCP_TOOL_CONTRACT_VERSION,
      activeProjectId:this.activeProject?.projectId??null,
      lastActivityAt:this.lastActivityAt,
      clients,
      activity:this.activity.map(item=>structuredClone(item)),
    };
  }

  private recordActivity(input:Omit<LocalMcpActivity,"id"|"at">){
    const at=isoNow();
    this.lastActivityAt=at;
    this.activity.unshift({id:randomUUID(),at,...input});
    if(this.activity.length>LOCAL_MCP_MAX_ACTIVITY)this.activity.length=LOCAL_MCP_MAX_ACTIVITY;
  }
}
