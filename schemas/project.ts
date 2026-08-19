import { z } from "zod";
import { AssetSchema } from "@/schemas/asset";
import { ClipSchema, type ClipType } from "@/schemas/clip";

export const CURRENT_PROJECT_VERSION = "1.0.0" as const;

export const ProjectIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Project IDs may contain only letters, numbers, underscores, and hyphens");

export const CanvasSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
});

export const TrackSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["video", "caption", "motion", "broll", "audio"]),
    name: z.string().min(1),
    locked: z.boolean().default(false),
    hidden: z.boolean().default(false),
    clips: z.array(ClipSchema).default([]),
  })
  .superRefine((track, ctx) => {
    for (const [index, clip] of track.clips.entries()) {
      if (clip.type !== (track.type as ClipType)) {
        ctx.addIssue({
          code: "custom",
          path: ["clips", index, "type"],
          message: `Clip type ${clip.type} cannot live on ${track.type} track`,
        });
      }
    }
  });

export const ProjectSchema = z.object({
  version: z.literal(CURRENT_PROJECT_VERSION),
  project: z.object({
    id: ProjectIdSchema,
    name: z.string().min(1),
    revision: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  canvas: CanvasSchema,
  assets: z.array(AssetSchema).default([]),
  tracks: z.array(TrackSchema).default([]),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Track = z.infer<typeof TrackSchema>;
