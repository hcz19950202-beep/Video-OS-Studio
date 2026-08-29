import {z} from "zod";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionCampaignIdSchema=z.string().uuid();
export type ProductionCampaignId=z.infer<typeof ProductionCampaignIdSchema>;

export const ProductionCampaignStatusSchema=z.enum([
  "draft",
  "queued",
  "running",
  "waiting-review",
  "blocked",
  "completed",
  "cancelled",
  "failed",
  "archived",
]);
export type ProductionCampaignStatus=z.infer<typeof ProductionCampaignStatusSchema>;

export const ProductionCampaignMissionStatusSchema=z.enum([
  "pending",
  "running",
  "waiting-review",
  "blocked",
  "completed",
  "cancelled",
  "failed",
]);
export type ProductionCampaignMissionStatus=z.infer<typeof ProductionCampaignMissionStatusSchema>;

export const ProductionCampaignMissionOutcomeStatusSchema=z.enum([
  "waiting-review",
  "blocked",
  "completed",
  "cancelled",
  "failed",
]);
export type ProductionCampaignMissionOutcomeStatus=z.infer<typeof ProductionCampaignMissionOutcomeStatusSchema>;

export const ProductionCampaignSharedReferenceIdSchema=z.string().trim().min(1).max(160).regex(
  /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
  "Campaign shared references must be logical IDs, not filesystem paths.",
);

const UniqueReferenceArray=(label:string)=>z.array(ProductionCampaignSharedReferenceIdSchema).max(256).default([]).superRefine((items,ctx)=>{
  const seen=new Set<string>();
  for(const[index,item]of items.entries()){
    if(seen.has(item))ctx.addIssue({code:"custom",path:[index],message:`Duplicate ${label} ${item}`});
    seen.add(item);
  }
});

export const ProductionCampaignSharedReferencesSchema=z.object({
  assetIds:UniqueReferenceArray("asset reference"),
  policyIds:UniqueReferenceArray("policy reference"),
  skillIds:UniqueReferenceArray("skill reference"),
  exportTemplateIds:UniqueReferenceArray("export template reference"),
}).strict().default({assetIds:[],policyIds:[],skillIds:[],exportTemplateIds:[]});
export type ProductionCampaignSharedReferences=z.infer<typeof ProductionCampaignSharedReferencesSchema>;

export const ProductionCampaignMissionRefSchema=z.object({
  projectId:ProjectIdSchema,
  missionId:ProductionMissionIdSchema,
}).strict();
export type ProductionCampaignMissionRef=z.infer<typeof ProductionCampaignMissionRefSchema>;

const ProductionCampaignMissionErrorSchema=z.object({
  code:z.string().trim().min(1).max(128),
  message:z.string().trim().min(1).max(2_000),
}).strict();

export const ProductionCampaignMissionRunSchema=z.object({
  projectId:ProjectIdSchema,
  missionId:ProductionMissionIdSchema,
  status:ProductionCampaignMissionStatusSchema,
  attempt:z.number().int().nonnegative(),
  currentStep:z.string().trim().min(1).max(128).optional(),
  blocker:z.string().trim().min(1).max(2_000).optional(),
  finalArtifactIds:UniqueReferenceArray("final artifact reference"),
  error:ProductionCampaignMissionErrorSchema.optional(),
  startedAt:z.string().datetime().optional(),
  finishedAt:z.string().datetime().optional(),
}).strict().superRefine((run,ctx)=>{
  if(run.status==="pending"&&run.startedAt!==undefined)ctx.addIssue({code:"custom",path:["startedAt"],message:"Pending Campaign Missions cannot have startedAt."});
  if(run.status==="running"&&run.startedAt===undefined)ctx.addIssue({code:"custom",path:["startedAt"],message:"Running Campaign Missions require startedAt."});
  if((run.status==="completed"||run.status==="cancelled"||run.status==="failed")&&run.finishedAt===undefined)ctx.addIssue({code:"custom",path:["finishedAt"],message:"Terminal Campaign Missions require finishedAt."});
  if(run.status==="blocked"&&run.blocker===undefined)ctx.addIssue({code:"custom",path:["blocker"],message:"Blocked Campaign Missions require a blocker."});
  if(run.status==="failed"&&run.error===undefined)ctx.addIssue({code:"custom",path:["error"],message:"Failed Campaign Missions require error evidence."});
});
export type ProductionCampaignMissionRun=z.infer<typeof ProductionCampaignMissionRunSchema>;

const MissionSetInvariant=<T extends{projectId:string;missionId:string}>(missions:T[],ctx:z.RefinementCtx)=>{
  const projects=new Map<string,number>();
  const refs=new Map<string,number>();
  for(const[index,mission]of missions.entries()){
    const key=`${mission.projectId}:${mission.missionId}`;
    if(refs.has(key))ctx.addIssue({code:"custom",path:[index,"missionId"],message:"Campaign Mission references must be unique."});
    if(projects.has(mission.projectId))ctx.addIssue({code:"custom",path:[index,"projectId"],message:"A Campaign cannot schedule multiple Missions against the same mutable Project."});
    refs.set(key,index);
    projects.set(mission.projectId,index);
  }
};

export const ProductionCampaignSchema=z.object({
  id:ProductionCampaignIdSchema,
  title:z.string().trim().min(1).max(200),
  brief:z.string().trim().min(1).max(10_000).optional(),
  status:ProductionCampaignStatusSchema,
  revision:z.number().int().positive(),
  maxConcurrency:z.number().int().min(1).max(8),
  sharedReferences:ProductionCampaignSharedReferencesSchema,
  missions:z.array(ProductionCampaignMissionRunSchema).min(1).max(128),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  startedAt:z.string().datetime().optional(),
  finishedAt:z.string().datetime().optional(),
}).strict().superRefine((campaign,ctx)=>{
  MissionSetInvariant(campaign.missions,ctx);
  if(campaign.updatedAt<campaign.createdAt)ctx.addIssue({code:"custom",path:["updatedAt"],message:"Campaign updatedAt cannot precede createdAt."});
  if(campaign.status==="running"&&campaign.startedAt===undefined)ctx.addIssue({code:"custom",path:["startedAt"],message:"Running Campaigns require startedAt."});
  if((campaign.status==="completed"||campaign.status==="cancelled"||campaign.status==="failed"||campaign.status==="archived")&&campaign.finishedAt===undefined)ctx.addIssue({code:"custom",path:["finishedAt"],message:"Terminal Campaigns require finishedAt."});
});
export type ProductionCampaign=z.infer<typeof ProductionCampaignSchema>;

export const CreateProductionCampaignInputSchema=z.object({
  title:z.string().trim().min(1).max(200),
  brief:z.string().trim().min(1).max(10_000).optional(),
  maxConcurrency:z.number().int().min(1).max(8).default(2),
  sharedReferences:ProductionCampaignSharedReferencesSchema.optional(),
  missions:z.array(ProductionCampaignMissionRefSchema).min(1).max(128),
}).strict().superRefine((input,ctx)=>MissionSetInvariant(input.missions,ctx));
export type CreateProductionCampaignInput=z.infer<typeof CreateProductionCampaignInputSchema>;

export const ProductionCampaignMissionRunResultSchema=z.object({
  status:ProductionCampaignMissionOutcomeStatusSchema,
  currentStep:z.string().trim().min(1).max(128).optional(),
  blocker:z.string().trim().min(1).max(2_000).optional(),
  finalArtifactIds:UniqueReferenceArray("final artifact reference"),
  error:ProductionCampaignMissionErrorSchema.optional(),
}).strict().superRefine((result,ctx)=>{
  if(result.status==="blocked"&&result.blocker===undefined)ctx.addIssue({code:"custom",path:["blocker"],message:"Blocked Campaign Mission results require a blocker."});
  if(result.status==="failed"&&result.error===undefined)ctx.addIssue({code:"custom",path:["error"],message:"Failed Campaign Mission results require error evidence."});
});
export type ProductionCampaignMissionRunResult=z.infer<typeof ProductionCampaignMissionRunResultSchema>;
