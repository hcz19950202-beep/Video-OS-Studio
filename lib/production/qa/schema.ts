import {z} from "zod";
import {JobIdSchema} from "@/lib/jobs/schema";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {VideoSkillRefSchema} from "@/lib/production/skills/schema";
import {ProjectIdSchema} from "@/schemas/project";

const UnsafeEvidencePattern=/(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\|\/(?:Users|home|tmp|mnt|var|etc)\/|file:\/\/|\.\.\/|\.\.\\)/i;
export const QASafeTextSchema=z.string().trim().min(1).max(1_000).superRefine((value,ctx)=>{
  if(UnsafeEvidencePattern.test(value))ctx.addIssue({code:"custom",message:"QA evidence must not expose machine paths."});
});

export const QAReportIdSchema=z.string().uuid();
export const QARepairProposalIdSchema=z.string().uuid();
export const QAFindingIdSchema=z.string().min(1).max(96).regex(/^[a-z][a-z0-9-]*$/);
export const QACategorySchema=z.enum(["technical","content","visual","brand","goal","policy"]);
export const QAFindingStatusSchema=z.enum(["pass","fail","not-evaluated"]);
export const QAFindingSeveritySchema=z.enum(["info","warning","error"]);
export const QAReportStatusSchema=z.enum(["pass","repair-recommended","fail"]);
export const QAEvidenceSourceSchema=z.enum([
  "render-job",
  "render-artifact",
  "ffprobe",
  "project-script",
  "project-timeline",
  "project-brand",
  "mission",
  "application-policy",
]);

export const QAEvidenceSchema=z.object({
  source:QAEvidenceSourceSchema,
  ref:QASafeTextSchema.optional(),
  summary:QASafeTextSchema,
}).strict();
export type QAEvidence=z.infer<typeof QAEvidenceSchema>;

export const QAFindingSchema=z.object({
  id:QAFindingIdSchema,
  category:QACategorySchema,
  status:QAFindingStatusSchema,
  severity:QAFindingSeveritySchema,
  message:QASafeTextSchema,
  evidence:z.array(QAEvidenceSchema).max(12).default([]),
}).strict();
export type QAFinding=z.infer<typeof QAFindingSchema>;

export const QATechnicalEvidenceSchema=z.object({
  renderArtifactId:z.string().min(1).max(128).optional(),
  durationSeconds:z.number().finite().positive().optional(),
  width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),
  fps:z.number().finite().positive().optional(),
  hasAudio:z.boolean().optional(),
}).strict();
export type QATechnicalEvidence=z.infer<typeof QATechnicalEvidenceSchema>;

const expectationTermSchema=QASafeTextSchema.pipe(z.string().max(120));
const expectationTerms=z.array(expectationTermSchema).max(16).default([]);
export const QAExpectationsSchema=z.object({
  expectAudio:z.boolean().optional(),
  expectCaptions:z.boolean().optional(),
  hookTerms:expectationTerms,
  ctaTerms:expectationTerms,
  evidenceTerms:expectationTerms,
  hookWindowSeconds:z.number().finite().positive().max(30).default(5),
  sceneCoverageMinRatio:z.number().finite().min(0).max(1).optional(),
}).strict();
export type QAExpectations=z.infer<typeof QAExpectationsSchema>;

export const RunProductionQAInputSchema=z.object({
  missionId:ProductionMissionIdSchema,
  renderJobId:JobIdSchema,
  expectations:QAExpectationsSchema.optional(),
}).strict();
export type RunProductionQAInput=z.input<typeof RunProductionQAInputSchema>;

export const QARepairActionKindSchema=z.enum([
  "text-correction",
  "replace-asset",
  "adjust-scene-timing",
  "reapply-skill",
  "targeted-scene-rerender",
  "full-rerender",
]);
export type QARepairActionKind=z.infer<typeof QARepairActionKindSchema>;

export const QARepairActionSchema=z.object({
  kind:QARepairActionKindSchema,
  findingIds:z.array(QAFindingIdSchema).min(1).max(12),
  summary:QASafeTextSchema,
  sceneId:z.string().min(1).max(128).optional(),
  skill:VideoSkillRefSchema.optional(),
}).strict().superRefine((action,ctx)=>{
  if(new Set(action.findingIds).size!==action.findingIds.length)ctx.addIssue({code:"custom",path:["findingIds"],message:"Repair action findingIds must be unique."});
  if(action.kind==="reapply-skill"&&!action.skill)ctx.addIssue({code:"custom",path:["skill"],message:"reapply-skill requires an exact Video Skill reference."});
  if(action.kind!=="reapply-skill"&&action.skill)ctx.addIssue({code:"custom",path:["skill"],message:"Only reapply-skill actions may reference a Video Skill."});
});
export type QARepairAction=z.infer<typeof QARepairActionSchema>;

export const QARepairProposalSchema=z.object({
  id:QARepairProposalIdSchema,
  reportId:QAReportIdSchema,
  projectId:ProjectIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  risk:z.enum(["low","medium","high"]),
  requiresReview:z.boolean(),
  actions:z.array(QARepairActionSchema).min(1).max(12),
  createdAt:z.string().datetime(),
}).strict().superRefine((proposal,ctx)=>{
  if(proposal.risk==="high"&&!proposal.requiresReview)ctx.addIssue({code:"custom",path:["requiresReview"],message:"High-risk QA repair proposals require explicit review."});
  if(proposal.actions.some(action=>action.kind==="full-rerender")&&!proposal.requiresReview)ctx.addIssue({code:"custom",path:["requiresReview"],message:"Full rerender repairs require explicit review."});
});
export type QARepairProposal=z.infer<typeof QARepairProposalSchema>;

export const QAReportSchema=z.object({
  id:QAReportIdSchema,
  projectId:ProjectIdSchema,
  missionId:ProductionMissionIdSchema,
  renderJobId:JobIdSchema,
  projectRevision:z.number().int().nonnegative(),
  renderSourceProjectRevision:z.number().int().nonnegative().optional(),
  status:QAReportStatusSchema,
  expectations:QAExpectationsSchema,
  technicalEvidence:QATechnicalEvidenceSchema,
  findings:z.array(QAFindingSchema).min(1).max(64),
  repairProposal:QARepairProposalSchema.optional(),
  createdAt:z.string().datetime(),
}).strict().superRefine((report,ctx)=>{
  const ids=new Set<string>();
  for(const[index,finding]of report.findings.entries()){
    if(ids.has(finding.id))ctx.addIssue({code:"custom",path:["findings",index,"id"],message:`Duplicate QA finding id ${finding.id}`});
    ids.add(finding.id);
  }
  const failed=report.findings.some(finding=>finding.status==="fail");
  if(report.status==="pass"&&failed)ctx.addIssue({code:"custom",path:["status"],message:"A passing QA report cannot contain failed findings."});
  if(report.repairProposal){
    if(report.repairProposal.reportId!==report.id)ctx.addIssue({code:"custom",path:["repairProposal","reportId"],message:"Repair proposal must reference its owning QA report."});
    if(report.repairProposal.projectId!==report.projectId)ctx.addIssue({code:"custom",path:["repairProposal","projectId"],message:"Repair proposal Project must match its QA report."});
    if(report.repairProposal.baseProjectRevision!==report.projectRevision)ctx.addIssue({code:"custom",path:["repairProposal","baseProjectRevision"],message:"Repair proposal revision must match its owning QA report revision."});
    for(const[actionIndex,action]of report.repairProposal.actions.entries())for(const[findingIndex,findingId]of action.findingIds.entries())if(!ids.has(findingId))ctx.addIssue({code:"custom",path:["repairProposal","actions",actionIndex,"findingIds",findingIndex],message:`Repair action references unknown QA finding ${findingId}.`});
  }
});
export type QAReport=z.infer<typeof QAReportSchema>;

export const PrepareQARepairInputSchema=z.object({
  proposal:QARepairProposalSchema,
  currentProjectRevision:z.number().int().nonnegative(),
  approved:z.boolean().default(false),
}).strict();

export const QARepairApplicationRequestSchema=z.object({
  proposalId:QARepairProposalIdSchema,
  projectId:ProjectIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  actions:z.array(QARepairActionSchema).min(1).max(12),
  reviewSatisfied:z.boolean(),
}).strict();
export type QARepairApplicationRequest=z.infer<typeof QARepairApplicationRequestSchema>;
