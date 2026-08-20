import {z} from "zod";

export const LinkedStyleSchema=z.object({
  id:z.string().min(1),
  name:z.string().min(1),
  target:z.enum(["motion","caption","text","cta"]),
  properties:z.record(z.string(),z.unknown()).default({}),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
});

export type LinkedStyle=z.infer<typeof LinkedStyleSchema>;
