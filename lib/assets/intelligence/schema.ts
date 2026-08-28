import {z} from "zod";
import {AssetKindSchema} from "@/schemas/asset";
import {ProjectIdSchema} from "@/schemas/project";
import {SceneSemanticTypeSchema} from "@/schemas/scene";

const UnsafeSourceTextPattern=/(?:[A-Za-z]:[\\/]|(?:^|\s)(?:\/Users\/|\/home\/|\/tmp\/|\/var\/|\/mnt\/)|(?:^|\s)\.\.?[\\/]|(?:^|\s)(?:input|output|assets?|media|original)[\\/]|\\Users\\|[A-Za-z0-9 _.-]+\.(?:mp4|mov|mkv|avi|webm|wav|mp3|m4a|aac|flac|png|jpe?g|webp|gif|srt|vtt|json)\b)/i;
const safeText=(max:number)=>z.string().trim().min(1).max(max).refine(
  value=>!UnsafeSourceTextPattern.test(value),
  "Asset Intelligence text must not contain filesystem paths or media filenames",
);

export const AssetIntelligenceAssetIdSchema=z.string().trim().min(1).max(256).refine(
  value=>!/[\\/]/.test(value)&&!value.includes("..")&&!/^[A-Za-z]:/.test(value),
  "Asset Intelligence requires logical asset IDs, not filesystem paths",
);

export const AssetIntelligenceTagSchema=z.string().trim().min(1).max(80).refine(
  value=>!/[\\/]/.test(value)&&!value.includes("..")&&!UnsafeSourceTextPattern.test(value),
  "Asset Intelligence tags must not contain filesystem paths or media filenames",
);

export const AssetIntelligenceSafeLabelSchema=safeText(200);
export const AssetIntelligenceSummarySchema=safeText(2_000);
export const AssetIntelligenceRangeSummarySchema=safeText(500);
export const AssetIntelligenceFingerprintScopeSchema=z.literal("project-asset-descriptor-v1");

export const AssetIntelligenceAnalyzerModeSchema=z.enum(["deterministic","local","provider"]);
export const AssetIntelligenceAnalyzerSchema=z.object({
  id:z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/),
  version:z.string().trim().min(1).max(64),
  mode:AssetIntelligenceAnalyzerModeSchema,
}).strict();
export type AssetIntelligenceAnalyzerDescriptor=z.infer<typeof AssetIntelligenceAnalyzerSchema>;

export const AssetIntelligenceRangeSchema=z.object({
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  summary:AssetIntelligenceRangeSummarySchema.optional(),
  tags:z.array(AssetIntelligenceTagSchema).max(32).default([]),
  confidence:z.number().finite().min(0).max(1).optional(),
}).strict().superRefine((range,ctx)=>{
  if(range.endFrame<=range.startFrame)ctx.addIssue({code:"custom",path:["endFrame"],message:"Asset Intelligence range endFrame must be greater than startFrame."});
  if(new Set(range.tags.map(tag=>tag.toLocaleLowerCase())).size!==range.tags.length)ctx.addIssue({code:"custom",path:["tags"],message:"Asset Intelligence range tags must be unique."});
});
export type AssetIntelligenceRange=z.infer<typeof AssetIntelligenceRangeSchema>;

export const AssetIntelligenceDraftSchema=z.object({
  summary:AssetIntelligenceSummarySchema,
  tags:z.array(AssetIntelligenceTagSchema).max(64).default([]),
  usableRanges:z.array(AssetIntelligenceRangeSchema).max(64).default([]),
}).strict().superRefine((draft,ctx)=>{
  if(new Set(draft.tags.map(tag=>tag.toLocaleLowerCase())).size!==draft.tags.length)ctx.addIssue({code:"custom",path:["tags"],message:"Asset Intelligence tags must be unique."});
});
export type AssetIntelligenceDraft=z.infer<typeof AssetIntelligenceDraftSchema>;

export const AssetIntelligenceRecordSchema=z.object({
  version:z.literal(1),
  projectId:ProjectIdSchema,
  assetId:AssetIntelligenceAssetIdSchema,
  sourceFingerprint:z.string().regex(/^[a-f0-9]{64}$/),
  sourceFingerprintScope:AssetIntelligenceFingerprintScopeSchema,
  sourceProjectRevision:z.number().int().nonnegative(),
  analyzer:AssetIntelligenceAnalyzerSchema,
  summary:AssetIntelligenceSummarySchema,
  tags:z.array(AssetIntelligenceTagSchema).max(64),
  usableRanges:z.array(AssetIntelligenceRangeSchema).max(64),
  generatedAt:z.string().datetime(),
}).strict().superRefine((record,ctx)=>{
  if(new Set(record.tags.map(tag=>tag.toLocaleLowerCase())).size!==record.tags.length)ctx.addIssue({code:"custom",path:["tags"],message:"Asset Intelligence tags must be unique."});
});
export type AssetIntelligenceRecord=z.infer<typeof AssetIntelligenceRecordSchema>;

export const AssetIntelligenceAnalyzerInputSchema=z.object({
  projectId:ProjectIdSchema,
  sourceProjectRevision:z.number().int().nonnegative(),
  asset:z.object({
    id:AssetIntelligenceAssetIdSchema,
    kind:AssetKindSchema,
    label:AssetIntelligenceSafeLabelSchema.optional(),
    mimeType:z.string().trim().min(1).max(200).optional(),
    durationInFrames:z.number().int().positive().optional(),
    width:z.number().int().positive().optional(),
    height:z.number().int().positive().optional(),
    sourceFps:z.number().finite().positive().optional(),
    hasAudio:z.boolean().optional(),
    sizeBytes:z.number().int().nonnegative().optional(),
  }).strict(),
}).strict();
export type AssetIntelligenceAnalyzerInput=z.infer<typeof AssetIntelligenceAnalyzerInputSchema>;

export const AssetIntelligenceQuerySchema=z.object({
  query:z.string().trim().min(1).max(1_000).optional(),
  requiredTags:z.array(AssetIntelligenceTagSchema).max(16).default([]),
  preferredKinds:z.array(AssetKindSchema).max(5).default([]),
  sceneSemanticType:SceneSemanticTypeSchema.optional(),
  maxResults:z.number().int().min(1).max(20).default(8),
}).strict().superRefine((query,ctx)=>{
  if(new Set(query.requiredTags.map(tag=>tag.toLocaleLowerCase())).size!==query.requiredTags.length)ctx.addIssue({code:"custom",path:["requiredTags"],message:"requiredTags must be unique."});
  if(new Set(query.preferredKinds).size!==query.preferredKinds.length)ctx.addIssue({code:"custom",path:["preferredKinds"],message:"preferredKinds must be unique."});
});
export type AssetIntelligenceQuery=z.infer<typeof AssetIntelligenceQuerySchema>;

export const AssetIntelligenceSearchResultSchema=z.object({
  assetId:AssetIntelligenceAssetIdSchema,
  kind:AssetKindSchema,
  label:AssetIntelligenceSafeLabelSchema.optional(),
  score:z.number().finite().min(0).max(1),
  summary:AssetIntelligenceSummarySchema,
  tags:z.array(AssetIntelligenceTagSchema).max(64),
  usableRanges:z.array(AssetIntelligenceRangeSchema).max(8),
  analyzer:AssetIntelligenceAnalyzerSchema,
  generatedAt:z.string().datetime(),
}).strict();
export type AssetIntelligenceSearchResult=z.infer<typeof AssetIntelligenceSearchResultSchema>;
