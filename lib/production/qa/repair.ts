import {randomUUID} from "node:crypto";
import {
  PrepareQARepairInputSchema,
  QARepairApplicationRequestSchema,
  QARepairProposalIdSchema,
  QARepairProposalSchema,
  type QAFinding,
  type QARepairAction,
  type QARepairProposal,
} from "@/lib/production/qa/schema";
import {QARepairReviewRequiredError,QARepairStaleProjectError} from "@/lib/production/qa/errors";

const unique=<T>(values:T[])=>[...new Set(values)];
const action=(value:QARepairAction)=>value;

export interface QARepairProposalOptions{
  now?:()=>string;
  createId?:()=>string;
}

export const createQARepairProposal=(input:{reportId:string;projectId:string;baseProjectRevision:number;findings:QAFinding[]},options:QARepairProposalOptions={}):QARepairProposal|undefined=>{
  const failed=input.findings.filter(finding=>finding.status==="fail");
  if(failed.length===0)return undefined;
  const ids=(...findingIds:string[])=>unique(findingIds.filter(id=>failed.some(finding=>finding.id===id)));
  const actions:QARepairAction[]=[];

  const catastrophic=ids("technical-render-artifact","technical-project-revision","technical-output-exists","technical-probe","technical-dimensions","technical-audio");
  if(catastrophic.length>0)actions.push(action({kind:"full-rerender",findingIds:catastrophic,summary:"Regenerate the final render through the existing bounded render Job path after the technical blocker is corrected."}));

  const timing=ids("technical-duration","goal-duration-target","visual-scene-coverage");
  if(timing.length>0)actions.push(action({kind:"adjust-scene-timing",findingIds:timing,summary:"Adjust approved Scene timing through proposal-first Project mutation before rerendering."}));

  const copy=ids("content-hook","content-cta");
  if(copy.length>0)actions.push(action({kind:"text-correction",findingIds:copy,summary:"Correct only the affected hook or CTA copy through the existing proposal/apply boundary."}));

  const evidenceIds=ids("content-evidence");
  if(evidenceIds.length>0)actions.push(action({kind:"reapply-skill",findingIds:evidenceIds,summary:"Reapply the existing numeric evidence emphasis Skill as a proposal, not an automatic edit.",skill:{id:"numeric-evidence-emphasis",version:"1.0.0"}}));

  const captionIds=ids("visual-captions");
  if(captionIds.length>0)actions.push(action({kind:"reapply-skill",findingIds:captionIds,summary:"Reapply the existing caption emphasis Skill as a bounded proposal.",skill:{id:"caption-emphasis",version:"1.0.0"}}));

  if(actions.length===0)return undefined;
  const high=actions.some(item=>item.kind==="full-rerender");
  const medium=actions.some(item=>item.kind==="adjust-scene-timing"||item.kind==="reapply-skill"||item.kind==="replace-asset"||item.kind==="targeted-scene-rerender");
  return QARepairProposalSchema.parse({
    id:QARepairProposalIdSchema.parse((options.createId??randomUUID)()),
    reportId:input.reportId,
    projectId:input.projectId,
    baseProjectRevision:input.baseProjectRevision,
    risk:high?"high":medium?"medium":"low",
    requiresReview:high,
    actions,
    createdAt:(options.now??(()=>new Date().toISOString()))(),
  });
};

export const prepareQARepairApplication=(input:unknown)=>{
  const parsed=PrepareQARepairInputSchema.parse(input);
  if(parsed.currentProjectRevision!==parsed.proposal.baseProjectRevision)throw new QARepairStaleProjectError();
  if(parsed.proposal.requiresReview&&!parsed.approved)throw new QARepairReviewRequiredError();
  return QARepairApplicationRequestSchema.parse({
    proposalId:parsed.proposal.id,
    projectId:parsed.proposal.projectId,
    baseProjectRevision:parsed.proposal.baseProjectRevision,
    actions:parsed.proposal.actions,
    reviewSatisfied:!parsed.proposal.requiresReview||parsed.approved,
  });
};
