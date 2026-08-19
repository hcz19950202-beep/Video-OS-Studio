import { z } from "zod";
export const BigNumberPropsSchema=z.object({label:z.string().default("KEY METRIC"),value:z.string().default("15"),suffix:z.string().default("DAYS"),accentColor:z.string().default("#ffc400")});
