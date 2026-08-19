import {z} from "zod";export const LowerThirdPropsSchema=z.object({name:z.string().default("Your Name"),role:z.string().default("Builder / Founder"),accentColor:z.string().default("#ffc400")});
