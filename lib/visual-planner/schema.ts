import {z} from "zod";

const BaseSlot=z.object({
  id:z.string().min(1),
  startFrame:z.number().int().nonnegative(),
  durationInFrames:z.number().int().positive(),
  spokenText:z.string(),
  purpose:z.string().min(1),
  reason:z.string().min(1),
  confidence:z.number().min(0).max(1),
  props:z.record(z.string(),z.unknown()),
});

export const VisualSlotSchema=z.discriminatedUnion("engine",[
  BaseSlot.extend({engine:z.literal("remotion"),effectId:z.enum(["big-number","metric-focus","keyword-impact","lower-third"])}),
  BaseSlot.extend({engine:z.literal("hyperframes"),effectId:z.enum(["process-flow","map-route"])}),
]);

export const VisualPlanSchema=z.object({
  version:z.literal(1),
  projectId:z.string().min(1),
  generatedAt:z.string().datetime(),
  source:z.enum(["rules","provider"]).default("rules"),
  slots:z.array(VisualSlotSchema),
});

export type VisualSlot=z.infer<typeof VisualSlotSchema>;
export type VisualPlan=z.infer<typeof VisualPlanSchema>;
