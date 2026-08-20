import {z} from "zod";

export const VideoUseEdlSchema=z.object({
  version:z.number().int().default(1),
  sources:z.record(z.string(),z.string()).optional(),
  ranges:z.array(z.object({
    source:z.string().optional(),
    start:z.number().nonnegative(),
    end:z.number().positive(),
    beat:z.string().optional(),
    quote:z.string().optional(),
    reason:z.string().optional(),
  })).min(1),
}).refine((edl)=>edl.ranges.every((range)=>range.end>range.start),"Every EDL range must end after it starts");

export type VideoUseEdl=z.infer<typeof VideoUseEdlSchema>;
