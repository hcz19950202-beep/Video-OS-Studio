import {z} from "zod";

export const VisualSemanticTypeSchema=z.enum(["number","percentage","comparison","process","map","proof","cta","keyword"]);
export const VisualEngineSchema=z.enum(["remotion","hyperframes","broll","none"]);

export const VisualAlternativeSchema=z.object({
  engine:VisualEngineSchema,
  effectId:z.string().min(1).optional(),
  reason:z.string().min(1).optional(),
});

export const VisualSuggestionSchema=z.object({
  id:z.string().min(1),
  sceneId:z.string().min(1),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  spokenText:z.string(),
  semanticType:VisualSemanticTypeSchema,
  recommendation:z.object({
    engine:VisualEngineSchema,
    effectId:z.string().min(1).optional(),
    props:z.record(z.string(),z.unknown()).optional(),
  }),
  reason:z.string().min(1),
  confidence:z.number().min(0).max(1),
  alternatives:z.array(VisualAlternativeSchema).default([]),
}).superRefine((suggestion,ctx)=>{
  if(suggestion.endFrame<=suggestion.startFrame)ctx.addIssue({code:"custom",path:["endFrame"],message:"Visual suggestion endFrame must be after startFrame"});
});

export const VisualDensitySchema=z.object({
  motionCards:z.number().int().nonnegative(),
  cardsPerMinute:z.number().nonnegative(),
  peakConcurrency:z.number().int().nonnegative(),
  averageGapFrames:z.number().nonnegative().nullable(),
  minimumGapFrames:z.number().int().nonnegative().nullable(),
});

export const VisualPlanSchema=z.object({
  version:z.literal(2),
  projectId:z.string().min(1),
  generatedAt:z.string().datetime(),
  source:z.enum(["rules","provider"]).default("rules"),
  suggestions:z.array(VisualSuggestionSchema),
  densityBefore:VisualDensitySchema,
});

const DiffAddSchema=z.object({
  suggestionId:z.string().min(1),
  sceneId:z.string().min(1),
  engine:VisualEngineSchema,
  effectId:z.string().min(1).optional(),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
});

export const VisualPlanDiffSchema=z.object({
  add:z.array(DiffAddSchema),
  remove:z.array(z.object({clipId:z.string().min(1),reason:z.string().min(1)})),
  shorten:z.array(z.object({clipId:z.string().min(1),fromDuration:z.number().int().positive(),toDuration:z.number().int().positive(),reason:z.string().min(1)})),
  styleChanges:z.array(z.object({targetId:z.string().min(1),summary:z.string().min(1)})),
  densityBefore:VisualDensitySchema,
  densityAfter:VisualDensitySchema,
});

export type VisualSuggestion=z.infer<typeof VisualSuggestionSchema>;
export type VisualPlan=z.infer<typeof VisualPlanSchema>;
export type VisualPlanDiff=z.infer<typeof VisualPlanDiffSchema>;
export type VisualDensity=z.infer<typeof VisualDensitySchema>;
