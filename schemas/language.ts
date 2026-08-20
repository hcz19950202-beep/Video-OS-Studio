import {z} from "zod";

export const CaptionLanguageTrackSchema=z.object({
  language:z.string().min(1),
  role:z.enum(["original","translation"]),
});

export const LanguageConfigSchema=z.object({
  sourceLanguage:z.string().min(1).default("unknown"),
  captionTracks:z.array(CaptionLanguageTrackSchema).default([]),
});

export type CaptionLanguageTrack=z.infer<typeof CaptionLanguageTrackSchema>;
export type LanguageConfig=z.infer<typeof LanguageConfigSchema>;

export const DEFAULT_LANGUAGE_CONFIG:LanguageConfig={
  sourceLanguage:"unknown",
  captionTracks:[],
};
