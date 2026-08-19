import type { ComponentType } from "react";
import type { z } from "zod";

export type EffectComponentProps = { props: Record<string, unknown> };
export type EffectCategory = "number" | "data" | "text" | "brand";

export type EffectDefinition = {
  id: string;
  name: string;
  engine: "remotion";
  category: EffectCategory;
  tags: string[];
  thumbnail: string;
  defaultDurationInFrames: number;
  schema: z.ZodType<Record<string, unknown>>;
  defaults: Record<string, unknown>;
  component: ComponentType<EffectComponentProps>;
};
