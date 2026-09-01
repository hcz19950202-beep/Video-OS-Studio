import type {AgentProposalApplicationService,AgentProposalApplyResult} from "@/lib/ai/application";
import type {AgentExecutionMode} from "@/lib/ai/execution-mode";
import {AgentProjectTransactionProposalPayloadSchema,type AgentProposal} from "@/lib/ai/schema";
import type {AgentSession,AgentTurn} from "@/lib/ai/session/schema";
import type {ProjectCommand} from "@/lib/project/commands";

const AUTO_APPLY_SAFE_COMMAND_TYPES=new Set<ProjectCommand["type"]>([
  "rename-project",
  "set-duration",
  "set-canvas",
  "add-asset",
  "add-clip",
  "update-clip-timing",
  "set-clip-layer",
  "split-clip",
  "update-video-properties",
  "update-motion-props",
  "update-motion-transform",
  "assign-linked-style",
  "update-caption-style",
  "update-broll-properties",
  "update-audio-properties",
  "duplicate-clip",
  "set-track-state",
  "add-scene",
  "update-scene",
  "add-marker",
  "update-marker",
  "set-brand",
  "add-linked-style",
  "update-linked-style",
  "set-language-config",
]);

export type AgentProposalApprovalDecision={
  mode:"auto-apply"|"explicit-approval";
  reason:
    |"safe-bounded-project-transaction"
    |"execution-mode-requires-review"
    |"source-turn-requires-review"
    |"multiple-proposals-require-review"
    |"multiple-operations-require-review"
    |"operation-kind-requires-review"
    |"protected-command-requires-review";
  protectedCommandTypes:string[];
};

export const evaluateAgentProposalApproval=(
  proposal:AgentProposal,
  executionMode:AgentExecutionMode,
):AgentProposalApprovalDecision=>{
  if(executionMode!=="apply-safe-edits")return{
    mode:"explicit-approval",
    reason:"execution-mode-requires-review",
    protectedCommandTypes:[],
  };
  if(proposal.operations.length!==1)return{
    mode:"explicit-approval",
    reason:"multiple-operations-require-review",
    protectedCommandTypes:[],
  };
  const operation=proposal.operations[0];
  if(operation.kind!=="project-transaction")return{
    mode:"explicit-approval",
    reason:"operation-kind-requires-review",
    protectedCommandTypes:[],
  };
  const payload=AgentProjectTransactionProposalPayloadSchema.parse(operation.payload);
  const protectedCommandTypes=[...new Set(payload.commands
    .filter(command=>!AUTO_APPLY_SAFE_COMMAND_TYPES.has(command.type))
    .map(command=>command.type))];
  if(protectedCommandTypes.length)return{
    mode:"explicit-approval",
    reason:"protected-command-requires-review",
    protectedCommandTypes,
  };
  return{
    mode:"auto-apply",
    reason:"safe-bounded-project-transaction",
    protectedCommandTypes:[],
  };
};

export type AgentProposalAutoApplyAttempt=
  |({applied:true;decision:AgentProposalApprovalDecision}&AgentProposalApplyResult)
  |{applied:false;decision:AgentProposalApprovalDecision;session:AgentSession};

export const attemptAgentProposalAutoApply=async(input:{
  projectId:string;
  session:AgentSession;
  sourceTurn:AgentTurn;
  proposal:AgentProposal;
  executionMode:AgentExecutionMode;
  application:Pick<AgentProposalApplicationService,"apply">;
}):Promise<AgentProposalAutoApplyAttempt>=>{
  if(input.sourceTurn.status!=="completed"||!input.sourceTurn.proposalIds.includes(input.proposal.id))return{
    applied:false,
    decision:{mode:"explicit-approval",reason:"source-turn-requires-review",protectedCommandTypes:[]},
    session:input.session,
  };
  if(input.sourceTurn.proposalIds.length!==1)return{
    applied:false,
    decision:{mode:"explicit-approval",reason:"multiple-proposals-require-review",protectedCommandTypes:[]},
    session:input.session,
  };
  const decision=evaluateAgentProposalApproval(input.proposal,input.executionMode);
  if(decision.mode!=="auto-apply")return{applied:false,decision,session:input.session};
  const operation=input.proposal.operations[0];
  const applied=await input.application.apply({
    projectId:input.projectId,
    sessionId:input.session.id,
    proposalId:input.proposal.id,
    expectedRevision:input.proposal.baseProjectRevision,
    operationIds:[operation.id],
  });
  return{applied:true,decision,...applied};
};
