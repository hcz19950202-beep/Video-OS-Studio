import {z} from "zod";
import {MotionTransformSchema} from "@/schemas/clip";

export const AssetPresetSchema=z.object({
  id:z.string().min(1),
  name:z.string().min(1),
  engine:z.enum(["remotion","hyperframes"]),
  effectId:z.string().min(1),
  props:z.record(z.string(),z.unknown()),
  transform:MotionTransformSchema.optional(),
  durationInFrames:z.number().int().positive(),
  favorite:z.boolean().default(false),
  status:z.enum(["draft","production-ready"]).default("draft"),
  sourceProjectId:z.string().min(1).optional(),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
});

export const AssetRegistrySchema=z.object({version:z.literal(1),presets:z.array(AssetPresetSchema)});
export type AssetPreset=z.infer<typeof AssetPresetSchema>;
export type AssetRegistry=z.infer<typeof AssetRegistrySchema>;
