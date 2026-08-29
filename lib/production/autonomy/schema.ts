import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionLogicalTargetKindSchema=z.enum([
  "project",
  "canvas",
  "script",
  "brand",
  "language",
  "asset",
  "track",
  "clip",
  "scene",
  "marker",
  "linked-style",
]);
export type ProductionLogicalTargetKind=z.infer<typeof ProductionLogicalTargetKindSchema>;

const singletonKinds=new Set<ProductionLogicalTargetKind>(["project","canvas","script","brand","language"]);
export const ProductionLogicalTargetIdSchema=z.string().trim().min(1).max(160).refine(value=>!/[\\/]/.test(value)&&!value.includes(".."),"Production target IDs must be logical identifiers, not filesystem paths");
const logicalTargetShape={kind:ProductionLogicalTargetKindSchema,id:ProductionLogicalTargetIdSchema.optional()} as const;
const refineLogicalTarget=(target:{kind:ProductionLogicalTargetKind;id?:string},ctx:z.RefinementCtx)=>{
  if(singletonKinds.has(target.kind)&&target.id!==undefined)ctx.addIssue({code:"custom",path:["id"],message:`Target kind ${target.kind} does not accept an object ID.`});
  if(!singletonKinds.has(target.kind)&&target.id===undefined)ctx.addIssue({code:"custom",path:["id"],message:`Target kind ${target.kind} requires an object ID.`});
};

export const ProductionLogicalTargetSchema=z.object(logicalTargetShape).strict().superRefine(refineLogicalTarget);
export type ProductionLogicalTarget=z.infer<typeof ProductionLogicalTargetSchema>;

export const ProductionMutationTargetActionSchema=z.enum(["create","append","modify","remove"]);
export const ProductionMutationTargetSchema=z.object({...logicalTargetShape,action:ProductionMutationTargetActionSchema}).strict().superRefine((target,ctx)=>{
  refineLogicalTarget(target,ctx);
  if(target.action==="append"&&target.kind!=="track")ctx.addIssue({code:"custom",path:["action"],message:"Append targets are reserved for Track collection changes."});
  if(target.action==="create"&&singletonKinds.has(target.kind))ctx.addIssue({code:"custom",path:["action"],message:`Singleton target ${target.kind} cannot be created by a Project edit step.`});
});
export type ProductionMutationTarget=z.infer<typeof ProductionMutationTargetSchema>;

export const ProductionEditOwnershipStateSchema=z.enum(["ai-owned","human-modified","protected"]);
export type ProductionEditOwnershipState=z.infer<typeof ProductionEditOwnershipStateSchema>;
export const ProductionEditOwnershipSourceSchema=z.enum(["agent","human","system"]);

export const ProductionEditProtectionRecordSchema=z.object({
  target:ProductionLogicalTargetSchema,
  state:ProductionEditOwnershipStateSchema,
  source:ProductionEditOwnershipSourceSchema,
  projectRevision:z.number().int().nonnegative(),
  reason:z.string().trim().min(1).max(500).optional(),
  updatedAt:z.string().datetime(),
}).strict().superRefine((record,ctx)=>{
  if(record.state==="ai-owned"&&record.source==="human")ctx.addIssue({code:"custom",path:["source"],message:"Human provenance cannot assert AI ownership."});
  if(record.state==="human-modified"&&record.source!=="human")ctx.addIssue({code:"custom",path:["source"],message:"Human-modified state requires human provenance."});
});
export type ProductionEditProtectionRecord=z.infer<typeof ProductionEditProtectionRecordSchema>;

export const productionLogicalTargetKey=(targetInput:ProductionLogicalTarget)=>{
  const target=ProductionLogicalTargetSchema.parse(targetInput);
  return target.id===undefined?target.kind:`${target.kind}:${target.id}`;
};
export const productionMutationTargetKey=(targetInput:ProductionMutationTarget)=>{
  const target=ProductionMutationTargetSchema.parse(targetInput);
  return`${productionLogicalTargetKey(target)}:${target.action}`;
};

export const ProductionEditProtectionSnapshotSchema=z.object({
  version:z.literal(1),
  projectId:ProjectIdSchema,
  records:z.array(ProductionEditProtectionRecordSchema).max(2048).default([]),
  updatedAt:z.string().datetime(),
}).strict().superRefine((snapshot,ctx)=>{
  const keys=new Set<string>();
  for(const[index,record]of snapshot.records.entries()){
    const key=productionLogicalTargetKey(record.target);
    if(keys.has(key))ctx.addIssue({code:"custom",path:["records",index,"target"],message:`Duplicate protection record for ${key}.`});
    keys.add(key);
  }
});
export type ProductionEditProtectionSnapshot=z.infer<typeof ProductionEditProtectionSnapshotSchema>;

export const ProductionProtectionDecisionSchema=z.enum(["allow","review","block"]);
export const ProductionProtectionFindingSchema=z.object({
  target:ProductionMutationTargetSchema,
  decision:ProductionProtectionDecisionSchema,
  code:z.string().min(1).max(96).regex(/^[A-Z0-9_]+$/),
  reason:z.string().trim().min(1).max(500),
}).strict();
export type ProductionProtectionFinding=z.infer<typeof ProductionProtectionFindingSchema>;

export const ProductionProtectionAssessmentSchema=z.object({
  decision:ProductionProtectionDecisionSchema,
  findings:z.array(ProductionProtectionFindingSchema).max(128),
}).strict();
export type ProductionProtectionAssessment=z.infer<typeof ProductionProtectionAssessmentSchema>;
