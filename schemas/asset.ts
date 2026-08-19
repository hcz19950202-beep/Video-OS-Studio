import { z } from "zod";

export const AssetKindSchema = z.enum([
  "video",
  "audio",
  "image",
  "overlay",
  "subtitle",
]);

export const ProjectRelativePathSchema = z.string().min(1).refine(
  (value) => {
    if (value.startsWith("/") || value.startsWith("\\")) return false;
    if (/^[A-Za-z]:[\\/]/.test(value)) return false;
    if (value.includes("\\")) return false;
    return !value.split("/").some((segment) => segment === "..");
  },
  "Asset paths must be project-relative POSIX-style paths without parent traversal",
);

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: AssetKindSchema,
  relativePath: ProjectRelativePathSchema,
  label: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  durationInFrames: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type Asset = z.infer<typeof AssetSchema>;
