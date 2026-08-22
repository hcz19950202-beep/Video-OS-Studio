import {z} from "zod";

export const VisualSemanticTypeSchema=z.enum(["number","percentage","comparison","process","map","proof","cta","keyword"]);
export const VisualEngineSchema=z.enum(["remotion","hyperframes","broll","none"]);
export const VisualAnchorSchema=z.enum(["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]);

export const VisualPlannerContextSchema=z.object({
  intent:z.string().max(2000).default(""),
  safeArea:z.object({
    profileId:z.string().min(1).default("generic"),
    top:z.number().min(0).max(.45),
    right:z.number().min(0).max(.45),
    bottom:z.number().min(0).max(.45),
    left:z.number().min(0).max(.45),
  }).optional(),
}).default({intent:""});

export const VisualPlacementSchema=z.object({
  x:z.number().min(-.5).max(.5).default(0),
  y:z.number().min(-.5).max(.5).default(0),
  scale:z.number().min(.1).max(2).default(1),
  anchor:VisualAnchorSchema.default("center"),
  rationale:z.string().optional(),
});

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
    placement:VisualPlacementSchema.optional(),
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
  context:VisualPlannerContextSchema.optional(),
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

export type VisualPlannerContext=z.infer<typeof VisualPlannerContextSchema>;
export type VisualPlacement=z.infer<typeof VisualPlacementSchema>;
export type VisualSuggestion=z.infer<typeof VisualSuggestionSchema>;
export type VisualPlan=z.infer<typeof VisualPlanSchema>;
export type VisualPlanDiff=z.infer<typeof VisualPlanDiffSchema>;
export type VisualDensity=z.infer<typeof VisualDensitySchema>;
