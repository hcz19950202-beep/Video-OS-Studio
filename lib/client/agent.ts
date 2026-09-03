import type {AgentProposalApplyResult,AgentProposalPreview} from "@/lib/ai/application";
import {DEFAULT_AGENT_EXECUTION_MODE,type AgentExecutionMode} from "@/lib/ai/execution-mode";
import type {AgentSelectionSnapshot,AgentSession,ContextReference} from "@/lib/ai";
import type {VideoSkill,VideoSkillRef} from "@/lib/production/skills/schema";

export type AgentProviderRuntimeStatus={
  providerId:string;
  label:string;
  model:string;
  models:string[];
  configured:boolean;
  selectable:boolean;
  isDefault:boolean;
};
export type AgentSessionListResult={sessions:AgentSession[];provider:AgentProviderRuntimeStatus;providers:AgentProviderRuntimeStatus[];skills:VideoSkill[]};
export type CreateAgentSessionOptions={selection?:Partial<AgentSelectionSnapshot>;providerId?:string;model?:string};
export type AgentTurnStreamEvent={event:string;data:Record<string,unknown>};

const agentBase=(projectId:string)=>`/api/projects/${encodeURIComponent(projectId)}/agent`;
const sessionBase=(projectId:string,sessionId:string)=>`${agentBase(projectId)}/sessions/${encodeURIComponent(sessionId)}`;
const proposalBase=(projectId:string,sessionId:string,proposalId:string)=>`${sessionBase(projectId,sessionId)}/proposals/${encodeURIComponent(proposalId)}`;

const readError=async(response:Response)=>{
  try{
    const payload=await response.json() as {message?:string};
    return payload.message||`Agent request failed (${response.status}).`;
  }catch{return`Agent request failed (${response.status}).`;}
};

export async function getAgentProviderStatus(projectId:string):Promise<AgentProviderRuntimeStatus>{
  const response=await fetch(agentBase(projectId),{cache:"no-store"});
  if(!response.ok)throw new Error(await readError(response));
  return((await response.json()) as {provider:AgentProviderRuntimeStatus}).provider;
}

export async function listAgentSessions(projectId:string):Promise<AgentSessionListResult>{
  const response=await fetch(`${agentBase(projectId)}/sessions`,{cache:"no-store"});
  if(!response.ok)throw new Error(await readError(response));
  return response.json() as Promise<AgentSessionListResult>;
}

export async function createAgentSession(projectId:string,options:CreateAgentSessionOptions={}):Promise<AgentSession>{
  const response=await fetch(`${agentBase(projectId)}/sessions`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(options),
  });
  if(!response.ok)throw new Error(await readError(response));
  return((await response.json()) as {session:AgentSession}).session;
}

export async function openAgentSession(projectId:string,sessionId:string):Promise<AgentSession>{
  const response=await fetch(sessionBase(projectId,sessionId),{cache:"no-store"});
  if(!response.ok)throw new Error(await readError(response));
  return((await response.json()) as {session:AgentSession}).session;
}

const proposalAction=async<T>(projectId:string,sessionId:string,proposalId:string,body:Record<string,unknown>):Promise<T>=>{
  const response=await fetch(proposalBase(projectId,sessionId,proposalId),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!response.ok)throw new Error(await readError(response));
  return response.json() as Promise<T>;
};

export const reviewAgentProposal=(input:{projectId:string;sessionId:string;proposalId:string;operationIds?:string[];changeIds?:string[]})=>proposalAction<{preview:AgentProposalPreview;session:AgentSession}>(input.projectId,input.sessionId,input.proposalId,{action:"review",operationIds:input.operationIds,changeIds:input.changeIds});

export const applyAgentProposal=(input:{projectId:string;sessionId:string;proposalId:string;expectedRevision:number;operationIds?:string[];changeIds?:string[]})=>proposalAction<AgentProposalApplyResult>(input.projectId,input.sessionId,input.proposalId,{action:"apply",expectedRevision:input.expectedRevision,operationIds:input.operationIds,changeIds:input.changeIds});

export const rejectAgentProposal=(input:{projectId:string;sessionId:string;proposalId:string})=>proposalAction<{session:AgentSession}>(input.projectId,input.sessionId,input.proposalId,{action:"reject"});

const parseSseBlock=(block:string):AgentTurnStreamEvent|null=>{
  let event="message";
  const dataLines:string[]=[];
  for(const line of block.split("\n")){
    if(line.startsWith("event:"))event=line.slice(6).trim();
    else if(line.startsWith("data:"))dataLines.push(line.slice(5).trimStart());
  }
  if(dataLines.length===0)return null;
  const parsed=JSON.parse(dataLines.join("\n")) as unknown;
  return{event,data:typeof parsed==="object"&&parsed!==null&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{value:parsed}};
};

export async function runAgentTurn(input:{
  projectId:string;
  sessionId:string;
  userContent:string;
  executionMode?:AgentExecutionMode;
  selection?:Partial<AgentSelectionSnapshot>;
  contextReferences?:ReadonlyArray<ContextReference>;
  skill?:VideoSkillRef;
  signal?:AbortSignal;
  onEvent?:(event:AgentTurnStreamEvent)=>void;
}):Promise<AgentSession>{
  const response=await fetch(`${sessionBase(input.projectId,input.sessionId)}/turns`,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"text/event-stream"},
    body:JSON.stringify({userContent:input.userContent,executionMode:input.executionMode??DEFAULT_AGENT_EXECUTION_MODE,selection:input.selection,contextReferences:input.contextReferences,skill:input.skill}),
    signal:input.signal,
  });
  if(!response.ok)throw new Error(await readError(response));
  if(!response.body)throw new Error("Agent streaming response body is unavailable.");

  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let buffer="";
  let streamError:string|null=null;
  const handleEvent=(event:AgentTurnStreamEvent)=>{
    input.onEvent?.(event);
    if(event.event==="turn-error")streamError=typeof event.data.message==="string"?event.data.message:"Agent turn failed before completion.";
  };
  try{
    for(;;){
      const{done,value}=await reader.read();
      if(done)break;
      buffer=(buffer+decoder.decode(value,{stream:true})).replace(/\r\n/g,"\n");
      let boundary=buffer.indexOf("\n\n");
      while(boundary>=0){
        const block=buffer.slice(0,boundary);
        buffer=buffer.slice(boundary+2);
        const event=parseSseBlock(block);
        if(event)handleEvent(event);
        boundary=buffer.indexOf("\n\n");
      }
    }
    buffer+=decoder.decode();
    if(buffer.trim()){
      const event=parseSseBlock(buffer.trim());
      if(event)handleEvent(event);
    }
  }finally{reader.releaseLock();}

  if(streamError)throw new Error(streamError);
  return openAgentSession(input.projectId,input.sessionId);
}
