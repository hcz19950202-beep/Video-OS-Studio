import {z} from "zod";

export const MarkerSchema=z.object({
  id:z.string().min(1),
  frame:z.number().int().nonnegative(),
  label:z.string().optional(),
  color:z.string().min(1).optional(),
  type:z.enum(["note","beat","cta","visual"]).default("note"),
});

export type Marker=z.infer<typeof MarkerSchema>;
