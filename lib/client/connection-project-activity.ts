import type {AgentProposal,AgentProposalStatus} from "@/lib/ai/schema";
import type {
  AgentOperationAuditAction,
  AgentOperationAuditOutcome,
  AgentSession,
} from "@/lib/ai/session/schema";
import type {JobRecord,JobStatus,JobType} from "@/lib/jobs/schema";

export type ConnectionExternalProposal={
  sessionId:string;
  proposalId:string;
  title:string;
  status:AgentProposalStatus;
  baseProjectRevision:number;
  operationCount:number;
  warningCount:number;
  createdAt:string;
};

export type ConnectionExternalApprovalActivity={
  id:string;
  sessionId:string;
  proposalId:string;
  action:AgentOperationAuditAction;
  outcome:AgentOperationAuditOutcome;
  operationId?:string;
  toolId?:string;
  createdAt:string;
};

export type ConnectionDurableJobActivity={
  id:string;
  type:JobType;
  status:JobStatus;
  stage:string;
  progress:number;
  attempt:number;
  updatedAt:string;
  error?:{code:string;message:string;retryable:boolean};
};

export type ConnectionProjectActivity={
  projectId:string;
  externalSessionCount:number;
  proposals:ConnectionExternalProposal[];
  approvals:ConnectionExternalApprovalActivity[];
  jobs:ConnectionDurableJobActivity[];
};

type SessionResponse={sessions:AgentSession[]};
type JobsResponse={jobs:JobRecord[]};

const proposalActivity=(session:AgentSession,proposal:AgentProposal):ConnectionExternalProposal=>({
  sessionId:session.id,
  proposalId:proposal.id,
  title:proposal.title,
  status:proposal.status,
  baseProjectRevision:proposal.baseProjectRevision,
  operationCount:proposal.operations.length,
  warningCount:proposal.warnings.length,
  createdAt:proposal.createdAt,
});

export const loadConnectionProjectActivity=async(projectId:string):Promise<ConnectionProjectActivity>=>{
  const encoded=encodeURIComponent(projectId);
  const[sessionsResponse,jobsResponse]=await Promise.all([
    fetch(`/api/projects/${encoded}/agent/sessions`,{cache:"no-store"}),
    fetch(`/api/jobs?projectId=${encoded}&limit=50`,{cache:"no-store"}),
  ]);
  if(!sessionsResponse.ok)throw new Error("External Agent activity is unavailable.");
  if(!jobsResponse.ok)throw new Error("Durable Job activity is unavailable.");

  const sessionsBody=await sessionsResponse.json() as SessionResponse;
  const jobsBody=await jobsResponse.json() as JobsResponse;
  const sessions=sessionsBody.sessions.filter(session=>session.providerId==="local-mcp");
  const proposals=sessions
    .flatMap(session=>session.proposals.map(proposal=>proposalActivity(session,proposal)))
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const approvals=sessions
    .flatMap(session=>session.operationAudit
      .filter(entry=>entry.source==="local-mcp")
      .map(entry=>({
        id:entry.id,
        sessionId:session.id,
        proposalId:entry.proposalId,
        action:entry.action,
        outcome:entry.outcome,
        ...(entry.operationId?{operationId:entry.operationId}:{}),
        ...(entry.toolId?{toolId:entry.toolId}:{}),
        createdAt:entry.createdAt,
      })))
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const jobs=jobsBody.jobs.map(job=>({
    id:job.id,
    type:job.type,
    status:job.status,
    stage:job.stage,
    progress:job.progress,
    attempt:job.attempt,
    updatedAt:job.updatedAt,
    ...(job.error?{error:{code:job.error.code,message:job.error.message,retryable:job.error.retryable}}:{}),
  }));

  return{
    projectId,
    externalSessionCount:sessions.length,
    proposals,
    approvals,
    jobs,
  };
};
