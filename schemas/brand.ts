import {z} from "zod";

const BrandColorsSchema=z.object({
  background:z.string().min(1),surface:z.string().min(1),primary:z.string().min(1),secondary:z.string().min(1),data:z.string().min(1),success:z.string().min(1),danger:z.string().min(1),text:z.string().min(1),muted:z.string().min(1),
});

const BrandTypographySchema=z.object({
  headingFont:z.string().min(1),bodyFont:z.string().min(1),captionFont:z.string().min(1),
});

const BrandMotionSchema=z.object({
  speed:z.number().min(0.1).max(4),
  scale:z.number().min(0.1).max(5),
  intensity:z.enum(["minimal","balanced","strong"]),
});

export const BrandConfigSchema=z.object({
  mode:z.enum(["dark","light","custom"]),
  colors:BrandColorsSchema,
  typography:BrandTypographySchema,
  motion:BrandMotionSchema,
  captionStyleId:z.string().min(1).optional(),
});

export type BrandConfig=z.infer<typeof BrandConfigSchema>;

export const DEFAULT_BRAND_CONFIG:BrandConfig={
  mode:"dark",
  colors:{
    background:"#080B0F",
    surface:"#111820",
    primary:"#FF4B20",
    secondary:"#F5F7FA",
    data:"#3B82F6",
    success:"#55D187",
    danger:"#FF6565",
    text:"#F5F7FA",
    muted:"#85868D",
  },
  typography:{headingFont:"system-ui",bodyFont:"system-ui",captionFont:"system-ui"},
  motion:{speed:1,scale:1,intensity:"balanced"},
};
