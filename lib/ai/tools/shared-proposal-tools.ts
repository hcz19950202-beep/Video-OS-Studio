import {randomUUID} from "node:crypto";
import {z} from "zod";
import {
  AgentProposalSchema,
  AgentProposedOperationSchema,
  AgentSessionIdSchema,
  type AgentProposal,
} from "@/lib/ai/schema";
import {
  AgentSessionAlreadyExistsError,
  type AgentSessionRepository,
} from "@/lib/ai/session/repository";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import type {SharedAgentToolContract} from "@/lib/ai/tools/shared-contract";
import {createC4SharedReadTools,type C4SharedReadToolDependencies} from "@/lib/ai/tools/shared-read-tools";
import {
  SharedToolRegistry,
  SharedToolSafeError,
  type RegisteredSharedTool,
  type SharedToolExecutionContext,
} from "@/lib/ai/tools/shared-registry";

export const C5_CREATE_EDIT_PROPOSAL_TOOL_ID="create_edit_proposal" as const;

const CreateEditProposalInputSchema=z.object({
  title:z.string().min(1).max(240),
  summary:z.string().min(1).max(4_000),
  rationale:z.array(z.string().min(1).max(2_000)).max(32).default([]),
  operations:z.array(AgentProposedOperationSchema).min(1).max(128),
  warnings:z.array(z.string().min(1).max(2_000)).max(32).default([]),
}).strict();

const CreateEditProposalOutputSchema=z.object({
  proposal:AgentProposalSchema,
}).strict();

export type C5SharedProposalToolDependencies={
  sessions:Pick<AgentSessionRepository,"load"|"create"|"mutate">;
  now?:()=>string;
  makeId?:()=>string;
};

const contract:SharedAgentToolContract={
  toolId:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
  version:"1.0.0",
  description:"Create and persist a reviewable edit Proposal at the authenticated Project snapshot revision. This tool cannot modify the Project, History, filesystem, Jobs, or external systems; Apply is a separate application-owned action.",
  inputJsonSchema:{
    type:"object",
    required:["title","summary","operations"],
    properties:{
      title:{type:"string",minLength:1,maxLength:240},
      summary:{type:"string",minLength:1,maxLength:4000},
      rationale:{type:"array",items:{type:"string"},maxItems:32},
      operations:{
        type:"array",
        minItems:1,
        maxItems:128,
        items:{
          type:"object",
          required:["id","kind","summary","payload"],
          properties:{
            id:{type:"string"},
            kind:{type:"string",enum:["visual-plan","script-edit","scene-edit","brand-style","clip-changes","workflow-action"]},
            summary:{type:"string"},
            payload:{type:"object"},
          },
          additionalProperties:false,
        },
      },
      warnings:{type:"array",items:{type:"string"},maxItems:32},
    },
    additionalProperties:false,
  },
  outputJsonSchema:{type:"object"},
  riskClass:"R1",
  requiredScopes:["project:read","project:propose"],
  approval:{defaultMode:"auto",allowSessionOverride:false},
  revisionPolicy:"snapshot",
  idempotency:"proposal-only",
  timeoutMs:5_000,
  cancellation:"request-scoped",
  audit:{
    eventKind:"proposal.create_edit_proposal",
    recordArguments:false,
    sensitiveArgumentKeys:["payload"],
    recordResultSummary:true,
  },
};

const requireProposalContext=(context:SharedToolExecutionContext)=>{
  const sessionId=AgentSessionIdSchema.safeParse(context.sessionId);
  if(!sessionId.success){
    throw new SharedToolSafeError(
      "proposal_session_unavailable",
      "A durable authenticated Agent or MCP session is required to create an edit Proposal.",
    );
  }
  const snapshot=context.projectContext;
  if(!snapshot||snapshot.projectId!==context.projectId){
    throw new SharedToolSafeError(
      "project_context_unavailable",
      "The authenticated Project snapshot is unavailable for Proposal creation.",
      true,
    );
  }
  return{sessionId:sessionId.data,snapshot};
};

const emptySession=(input:{
  sessionId:string;
  projectId:string;
  providerId:string;
  now:string;
}):AgentSession=>AgentSessionSchema.parse({
  id:input.sessionId,
  projectId:input.projectId,
  providerId:input.providerId,
  status:"active",
  createdAt:input.now,
  updatedAt:input.now,
  messages:[],
  turns:[],
  proposals:[],
  approvedOperations:[],
  operationClaims:[],
});

const ensureSession=async(
  dependencies:C5SharedProposalToolDependencies,
  context:SharedToolExecutionContext,
  sessionId:string,
  now:string,
)=>{
  const existing=await dependencies.sessions.load(context.projectId,sessionId);
  if(existing)return existing;
  try{
    return await dependencies.sessions.create(emptySession({
      sessionId,
      projectId:context.projectId,
      providerId:context.transport==="mcp"?"local-mcp":"builtin-agent",
      now,
    }));
  }catch(error){
    if(!(error instanceof AgentSessionAlreadyExistsError))throw error;
    const concurrent=await dependencies.sessions.load(context.projectId,sessionId);
    if(!concurrent)throw error;
    return concurrent;
  }
};

export const createC5SharedProposalTools=(dependencies:C5SharedProposalToolDependencies):RegisteredSharedTool[]=>[{
  contract,
  inputSchema:CreateEditProposalInputSchema,
  outputSchema:CreateEditProposalOutputSchema,
  handler:async(inputValue,context)=>{
    const input=CreateEditProposalInputSchema.parse(inputValue);
    const {sessionId,snapshot}=requireProposalContext(context);
    const now=dependencies.now?.()??new Date().toISOString();
    await ensureSession(dependencies,context,sessionId,now);

    const proposal=AgentProposalSchema.parse({
      id:dependencies.makeId?.()??randomUUID(),
      sessionId,
      projectId:context.projectId,
      baseProjectRevision:snapshot.baseProjectRevision,
      title:input.title,
      summary:input.summary,
      rationale:input.rationale,
      operations:input.operations,
      warnings:input.warnings,
      createdAt:now,
      status:"draft",
    });

    const session=await dependencies.sessions.mutate(context.projectId,sessionId,current=>{
      if(current.projectId!==context.projectId){
        throw new SharedToolSafeError(
          "proposal_session_project_mismatch",
          "The durable Proposal session belongs to a different Project.",
        );
      }
      if(current.proposals.some(item=>item.id===proposal.id)){
        throw new SharedToolSafeError(
          "proposal_id_conflict",
          "A Proposal with the generated identifier already exists; retry Proposal creation.",
          true,
        );
      }
      return AgentSessionSchema.parse({
        ...current,
        proposals:[...current.proposals,proposal],
        updatedAt:now,
      });
    });
    const persisted=session.proposals.find(item=>item.id===proposal.id);
    if(!persisted)throw new Error("Persisted Proposal could not be recovered from its Agent session.");
    return{proposal:persisted};
  },
}];

export const createC5ControlledMutationRegistry=(dependencies:{
  reads:C4SharedReadToolDependencies;
  proposals:C5SharedProposalToolDependencies;
})=>new SharedToolRegistry([
  ...createC4SharedReadTools(dependencies.reads),
  ...createC5SharedProposalTools(dependencies.proposals),
]);

export type C5CreateEditProposalInput=z.input<typeof CreateEditProposalInputSchema>;
export type C5CreateEditProposalOutput={proposal:AgentProposal};
