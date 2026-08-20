import {z} from "zod";

export const TranscriptWordSchema=z.object({
  id:z.string().min(1),
  text:z.string(),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  confidence:z.number().min(0).max(1).optional(),
}).superRefine((word,ctx)=>{
  if(word.endFrame<=word.startFrame)ctx.addIssue({code:"custom",path:["endFrame"],message:"endFrame must be greater than startFrame"});
});

export const ScriptSegmentSchema=z.object({
  id:z.string().min(1),
  sceneId:z.string().min(1).optional(),
  speaker:z.string().min(1).optional(),
  words:z.array(TranscriptWordSchema).default([]),
  status:z.enum(["active","removed"]).default("active"),
  semanticTags:z.array(z.string().min(1)).default([]),
});

export const ScriptDocumentSchema=z.object({
  transcriptAssetId:z.string().min(1).optional(),
  segments:z.array(ScriptSegmentSchema).default([]),
});

export type TranscriptWord=z.infer<typeof TranscriptWordSchema>;
export type ScriptSegment=z.infer<typeof ScriptSegmentSchema>;
export type ScriptDocument=z.infer<typeof ScriptDocumentSchema>;
