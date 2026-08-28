import {z} from "zod";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionPlanIdSchema=z.string().uuid();
export type ProductionPlanId=z.infer<typeof ProductionPlanIdSchema>;

export const ProductionPlanStepIdSchema=z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/,"Plan step IDs may contain only letters, numbers, underscores, and hyphens");
export const ProductionPlanStepKindSchema=z.enum([
  "analyze-script",
  "plan-visuals",
  "prepare-assets",
  "edit-project",
  "run-workflow",
  "render-preview",
  "human-review",
  "render-final",
]);
export const ProductionPlanRiskSchema=z.enum(["low","medium","high"]);
export const ProductionPlanOwnerSchema=z.enum(["agent","workflow","job","human-review"]);
export const ProductionPlanEvidenceKindSchema=z.enum(["mission","project","script","scene","asset","visual-plan","workflow"]);

const UnsafeExecutablePattern=/(?:[A-Za-z]:[\\/]|\/home\/|\/tmp\/|\\Users\\|\.\.\/|\.\.\\|powershell\s+(?:-|\/)|cmd\.exe\s+(?:-|\/)|bash\s+-c|rm\s+-rf|taskkill\s+(?:-|\/)|child_process|spawn\s*\(|exec\s*\()/i;
export const ProductionPlanTextSchema=z.string().trim().min(1).max(1000).superRefine((value,ctx)=>{
  if(UnsafeExecutablePattern.test(value))ctx.addIssue({code:"custom",message:"Plan text must describe production intent, not executable commands or machine paths."});
});
const LogicalEvidenceIdSchema=z.string().trim().min(1).max(128).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Evidence IDs must be logical identifiers, not filesystem paths");

export const ProductionPlanEvidenceRefSchema=z.object({
  kind:ProductionPlanEvidenceKindSchema,
  id:LogicalEvidenceIdSchema,
}).strict();

export const ProductionPlanStepSchema=z.object({
  id:ProductionPlanStepIdSchema,
  kind:ProductionPlanStepKindSchema,
  title:ProductionPlanTextSchema,
  objective:ProductionPlanTextSchema,
  dependsOn:z.array(ProductionPlanStepIdSchema).default([]),
  risk:ProductionPlanRiskSchema,
  owner:ProductionPlanOwnerSchema,
  reviewRequired:z.boolean(),
  requiresProjectRevision:z.boolean(),
  evidence:z.array(ProductionPlanEvidenceRefSchema).default([]),
}).strict().superRefine((step,ctx)=>{
  if(new Set(step.dependsOn).size!==step.dependsOn.length)ctx.addIssue({code:"custom",path:["dependsOn"],message:"Plan step dependencies must be unique."});
  if(step.dependsOn.includes(step.id))ctx.addIssue({code:"custom",path:["dependsOn"],message:"Plan step cannot depend on itself."});
  if(step.risk==="high"&&!step.reviewRequired)ctx.addIssue({code:"custom",path:["reviewRequired"],message:"High-risk plan steps require an explicit review checkpoint."});
  if(step.kind==="human-review"&&(step.owner!=="human-review"||!step.reviewRequired))ctx.addIssue({code:"custom",message:"Human-review steps must be owned by human-review and require review."});
  if(step.owner==="human-review"&&step.kind!=="human-review")ctx.addIssue({code:"custom",path:["owner"],message:"Only human-review steps may use the human-review owner."});
});
export type ProductionPlanStep=z.infer<typeof ProductionPlanStepSchema>;

export const ProductionPlanDraftSchema=z.object({
  summary:ProductionPlanTextSchema,
  steps:z.array(ProductionPlanStepSchema).min(1).max(64),
}).strict();
export type ProductionPlanDraft=z.infer<typeof ProductionPlanDraftSchema>;

export const ProductionPlanSchema=z.object({
  id:ProductionPlanIdSchema,
  projectId:ProjectIdSchema,
  missionId:ProductionMissionIdSchema,
  version:z.literal(1),
  baseProjectRevision:z.number().int().nonnegative(),
  supersedesPlanId:ProductionPlanIdSchema.optional(),
  summary:ProductionPlanTextSchema,
  steps:z.array(ProductionPlanStepSchema).min(1).max(64),
  generatedAt:z.string().datetime(),
}).strict().superRefine((plan,ctx)=>{
  const ids=new Set<string>();
  for(const[index,step]of plan.steps.entries()){
    if(ids.has(step.id))ctx.addIssue({code:"custom",path:["steps",index,"id"],message:`Duplicate plan step id ${step.id}`});
    ids.add(step.id);
  }
  for(const[index,step]of plan.steps.entries())for(const dependency of step.dependsOn)if(!ids.has(dependency))ctx.addIssue({code:"custom",path:["steps",index,"dependsOn"],message:`Unknown plan step dependency ${dependency}`});

  const byId=new Map(plan.steps.map(step=>[step.id,step]));
  const visiting=new Set<string>();
  const visited=new Set<string>();
  const visit=(id:string):boolean=>{
    if(visited.has(id))return false;
    if(visiting.has(id))return true;
    visiting.add(id);
    for(const dependency of byId.get(id)?.dependsOn??[])if(visit(dependency))return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for(const step of plan.steps)if(visit(step.id)){
    ctx.addIssue({code:"custom",path:["steps"],message:"Production plan dependency graph must be acyclic."});
    break;
  }
});
export type ProductionPlan=z.infer<typeof ProductionPlanSchema>;

export const parseProductionPlan=(input:unknown)=>ProductionPlanSchema.parse(input);
