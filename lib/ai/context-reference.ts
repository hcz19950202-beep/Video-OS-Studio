import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

const ContextReferenceIdSchema=z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/,"Context reference ID contains unsupported characters");
const LogicalIdSchema=z.string().min(1).max(256);
const ProjectFrameSchema=z.number().int().nonnegative();
const NormalizedCoordinateSchema=z.number().min(0).max(1);

const ContextReferenceBaseSchema=z.object({
  id:ContextReferenceIdSchema,
  projectId:ProjectIdSchema,
  baseProjectRevision:z.number().int().nonnegative(),
  label:z.string().min(1).max(240),
  createdAt:z.string().datetime(),
});

const ProjectContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("project"),
  target:z.object({}).strict(),
}).strict();

const SceneContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("scene"),
  target:z.object({sceneId:LogicalIdSchema}).strict(),
}).strict();

const ClipContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("clip"),
  target:z.object({clipId:LogicalIdSchema}).strict(),
}).strict();

const AssetContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("asset"),
  target:z.object({assetId:LogicalIdSchema}).strict(),
}).strict();

const TranscriptRangeContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("transcript-range"),
  target:z.object({startWordId:LogicalIdSchema,endWordId:LogicalIdSchema}).strict(),
}).strict();

const TimelinePointContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("timeline-point"),
  target:z.object({frame:ProjectFrameSchema}).strict(),
}).strict();

const ViewerRegionTargetSchema=z.object({
  frame:ProjectFrameSchema,
  x:NormalizedCoordinateSchema,
  y:NormalizedCoordinateSchema,
  width:z.number().positive().max(1),
  height:z.number().positive().max(1),
}).strict().superRefine((target,ctx)=>{
  if(target.x+target.width>1)ctx.addIssue({code:"custom",path:["width"],message:"Viewer region must stay inside normalized horizontal bounds"});
  if(target.y+target.height>1)ctx.addIssue({code:"custom",path:["height"],message:"Viewer region must stay inside normalized vertical bounds"});
});

const ViewerRegionContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("viewer-region"),
  target:ViewerRegionTargetSchema,
}).strict();

const QAFindingContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("qa-finding"),
  target:z.object({reportId:LogicalIdSchema,findingId:LogicalIdSchema}).strict(),
}).strict();

const MissionStepContextReferenceSchema=ContextReferenceBaseSchema.extend({
  kind:z.literal("mission-step"),
  target:z.object({missionId:LogicalIdSchema,stepId:LogicalIdSchema}).strict(),
}).strict();

export const ContextReferenceSchema=z.discriminatedUnion("kind",[
  ProjectContextReferenceSchema,
  SceneContextReferenceSchema,
  ClipContextReferenceSchema,
  AssetContextReferenceSchema,
  TranscriptRangeContextReferenceSchema,
  TimelinePointContextReferenceSchema,
  ViewerRegionContextReferenceSchema,
  QAFindingContextReferenceSchema,
  MissionStepContextReferenceSchema,
]);
export type ContextReference=z.infer<typeof ContextReferenceSchema>;

export const ContextReferenceListSchema=z.array(ContextReferenceSchema).max(32);
export type ContextReferenceList=z.infer<typeof ContextReferenceListSchema>;

export const ContextReferenceResolutionStatusSchema=z.enum(["resolved","stale","missing"]);
export type ContextReferenceResolutionStatus=z.infer<typeof ContextReferenceResolutionStatusSchema>;

export const ContextReferenceResolutionSchema=z.object({
  referenceId:ContextReferenceIdSchema,
  status:ContextReferenceResolutionStatusSchema,
  currentProjectRevision:z.number().int().nonnegative(),
  reason:z.string().min(1).max(1_000).optional(),
}).strict().superRefine((resolution,ctx)=>{
  if(resolution.status!=="resolved"&&!resolution.reason)ctx.addIssue({code:"custom",path:["reason"],message:"Stale or missing references require a safe user-facing reason"});
});
export type ContextReferenceResolution=z.infer<typeof ContextReferenceResolutionSchema>;
