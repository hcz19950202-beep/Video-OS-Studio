import {z} from "zod";
import {AgentSessionIdSchema} from "@/lib/ai/schema";
import {JobIdSchema} from "@/lib/jobs/schema";
import {WorkflowRunIdSchema} from "@/lib/workflows/schema";
import {ProjectIdSchema} from "@/schemas/project";

export const ProductionMissionIdSchema=z.string().uuid();
export type ProductionMissionId=z.infer<typeof ProductionMissionIdSchema>;
export const ProductionMissionPlanIdSchema=z.string().uuid();
export const ProductionMissionQAReportIdSchema=z.string().uuid();

export const ProductionMissionStatusSchema=z.enum([
  "draft",
  "planning",
  "ready",
  "running",
  "waiting-review",
  "blocked",
  "completed",
  "cancelled",
  "failed",
]);
export type ProductionMissionStatus=z.infer<typeof ProductionMissionStatusSchema>;

export const MissionAutonomyModeSchema=z.enum(["assist","guided","auto","full-production"]);
export type MissionAutonomyMode=z.infer<typeof MissionAutonomyModeSchema>;

export const MissionAutonomyPolicySchema=z.object({
  mode:MissionAutonomyModeSchema,
  finalReviewRequired:z.boolean(),
}).strict();
export type MissionAutonomyPolicy=z.infer<typeof MissionAutonomyPolicySchema>;

export const ProductionMissionPlatformSchema=z.enum(["facebook","instagram","tiktok","youtube","generic"]);
export const ProductionMissionFormatSchema=z.enum(["talking-head","product-ad","case-study","explainer","custom"]);

export const ProductionMissionTargetSchema=z.object({
  platform:ProductionMissionPlatformSchema.optional(),
  format:ProductionMissionFormatSchema.optional(),
  targetDurationSeconds:z.number().finite().positive().max(86_400).optional(),
  language:z.string().trim().min(1).max(64).optional(),
}).strict();
export type ProductionMissionTarget=z.infer<typeof ProductionMissionTargetSchema>;

const UniqueIdArray=<T extends z.ZodTypeAny>(schema:T,label:string,maxItems?:number)=>{
  const values=maxItems===undefined?z.array(schema):z.array(schema).max(maxItems);
  return values.default([]).superRefine((items,ctx)=>{
    const seen=new Set<string>();
    for(const[index,value]of items.entries()){
      const id=String(value);
      if(seen.has(id))ctx.addIssue({code:"custom",path:[index],message:`Duplicate ${label} ${id}`});
      seen.add(id);
    }
  });
};

export const ProductionMissionSchema=z.object({
  id:ProductionMissionIdSchema,
  projectId:ProjectIdSchema,
  title:z.string().trim().min(1).max(200),
  brief:z.string().trim().min(1).max(10_000),
  target:ProductionMissionTargetSchema.default({}),
  autonomyPolicy:MissionAutonomyPolicySchema,
  baseProjectRevision:z.number().int().nonnegative(),
  status:ProductionMissionStatusSchema,
  planId:ProductionMissionPlanIdSchema.optional(),
  qaReportIds:UniqueIdArray(ProductionMissionQAReportIdSchema,"qa report id",128),
  agentSessionIds:UniqueIdArray(AgentSessionIdSchema,"agent session id"),
  workflowRunIds:UniqueIdArray(WorkflowRunIdSchema,"workflow run id"),
  jobIds:UniqueIdArray(JobIdSchema,"job id"),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
}).strict().superRefine((mission,ctx)=>{
  if(mission.updatedAt<mission.createdAt)ctx.addIssue({code:"custom",path:["updatedAt"],message:"Mission updatedAt cannot precede createdAt"});
});
export type ProductionMission=z.infer<typeof ProductionMissionSchema>;

export const CreateProductionMissionInputSchema=z.object({
  projectId:ProjectIdSchema,
  title:z.string().trim().min(1).max(200),
  brief:z.string().trim().min(1).max(10_000),
  target:ProductionMissionTargetSchema.optional(),
  autonomyPolicy:MissionAutonomyPolicySchema,
}).strict();
export type CreateProductionMissionInput=z.infer<typeof CreateProductionMissionInputSchema>;

export const UpdateProductionMissionDetailsInputSchema=z.object({
  title:z.string().trim().min(1).max(200).optional(),
  brief:z.string().trim().min(1).max(10_000).optional(),
  target:ProductionMissionTargetSchema.optional(),
  autonomyPolicy:MissionAutonomyPolicySchema.optional(),
}).strict().refine(input=>Object.keys(input).length>0,{message:"At least one Mission detail must be updated."});
export type UpdateProductionMissionDetailsInput=z.infer<typeof UpdateProductionMissionDetailsInputSchema>;

export const isTerminalProductionMissionStatus=(status:ProductionMissionStatus)=>status==="completed"||status==="cancelled";
