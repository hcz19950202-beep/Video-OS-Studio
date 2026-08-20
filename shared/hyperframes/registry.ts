import { z } from "zod";

export const HyperFramesEffectSchema = z.discriminatedUnion("effectId", [
  z.object({
    effectId: z.literal("process-flow"),
    props: z.object({
      title: z.string().min(1).default("HOW IT WORKS"),
      steps: z.array(z.string().min(1)).min(2).max(4).default(["INPUT", "PROCESS", "REVIEW", "OUTPUT"]),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFC400"),
    }),
  }),
  z.object({
    effectId: z.literal("map-route"),
    props: z.object({
      from: z.string().min(1).default("CHINA"),
      to: z.string().min(1).default("AUSTRALIA"),
      days: z.string().min(1).default("30 DAYS"),
      label: z.string().min(1).default("LOGISTICS"),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFC400"),
    }),
  }),
]);

export const HYPERFRAMES_EFFECTS = [
  { id: "process-flow", name: "Process Flow", category: "process", defaultDurationInFrames: 120, thumbnail: "/effects/hf-process-flow.svg", defaults: { title: "HOW IT WORKS", steps: ["INPUT", "PROCESS", "REVIEW", "OUTPUT"], accentColor: "#FFC400" } },
  { id: "map-route", name: "Map Route", category: "map", defaultDurationInFrames: 120, thumbnail: "/effects/hf-map-route.svg", defaults: { from: "CHINA", to: "AUSTRALIA", days: "30 DAYS", label: "LOGISTICS", accentColor: "#FFC400" } },
] as const;

export const parseHyperFramesEffect = (effectId: string, props: Record<string, unknown>) =>
  HyperFramesEffectSchema.parse({ effectId, props });
