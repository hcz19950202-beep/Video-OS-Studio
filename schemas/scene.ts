import {z} from "zod";

export const SceneSemanticTypeSchema=z.enum([
  "hook","pain","problem","reframe","solution","proof","process","comparison","cta","custom",
]);

export const SceneVisualStrategySchema=z.object({
  intensity:z.enum(["low","medium","high"]).default("medium"),
  preferredEngines:z.array(z.enum(["remotion","hyperframes","broll"])).default([]),
});

export const SceneSchema=z.object({
  id:z.string().min(1),
  name:z.string().min(1),
  semanticType:SceneSemanticTypeSchema.default("custom"),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  summary:z.string().optional(),
  styleId:z.string().min(1).optional(),
  visualStrategy:SceneVisualStrategySchema.optional(),
}).superRefine((scene,ctx)=>{
  if(scene.endFrame<=scene.startFrame)ctx.addIssue({code:"custom",path:["endFrame"],message:"endFrame must be greater than startFrame"});
});

export type SceneSemanticType=z.infer<typeof SceneSemanticTypeSchema>;
export type SceneVisualStrategy=z.infer<typeof SceneVisualStrategySchema>;
export type Scene=z.infer<typeof SceneSchema>;
