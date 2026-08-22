import {z} from "zod";
import {SceneSemanticTypeSchema} from "@/schemas/scene";

export const ScenarioIdSchema=z.enum(["talking-head","product-ad","explainer","educational","motion","long-short","blank"]);
export type ScenarioId=z.infer<typeof ScenarioIdSchema>;

export const WorkflowStarterSchema=z.object({
  scenario:ScenarioIdSchema.default("blank"),
  starterPrompt:z.string().default(""),
  sceneTaxonomy:z.array(SceneSemanticTypeSchema).default([]),
  captionHint:z.string().default("primary"),
  visualIntensity:z.enum(["low","medium","high"]).default("medium"),
});
export type WorkflowStarter=z.infer<typeof WorkflowStarterSchema>;

export const SCENARIO_STARTERS:Record<ScenarioId,WorkflowStarter>={
  "talking-head":{scenario:"talking-head",starterPrompt:"Edit this talking-head video for clarity and retention. Remove visual clutter, identify Hook / Pain / Reframe / Solution / Proof / CTA, prioritize concrete numbers and proof, and keep motion density controlled.",sceneTaxonomy:["hook","pain","reframe","solution","proof","cta"],captionHint:"primary · emphasize numbers and keywords",visualIntensity:"medium"},
  "product-ad":{scenario:"product-ad",starterPrompt:"Structure this product ad around Hook / Problem / Solution / Proof / CTA. Prioritize product benefits, measurable proof and a clear final action without forcing a canvas orientation.",sceneTaxonomy:["hook","problem","solution","proof","cta"],captionHint:"bold · emphasize proof and CTA",visualIntensity:"high"},
  "explainer":{scenario:"explainer",starterPrompt:"Turn the content into a clear explainer. Prefer process, comparison and proof visuals, with enough breathing room for comprehension.",sceneTaxonomy:["hook","process","comparison","proof","cta"],captionHint:"minimal · emphasize terms and steps",visualIntensity:"medium"},
  "educational":{scenario:"educational",starterPrompt:"Organize the teaching into clear sections, highlight definitions and key numbers, and keep visual reinforcement useful rather than decorative.",sceneTaxonomy:["hook","context","process","proof","cta"],captionHint:"primary · emphasize key concepts",visualIntensity:"medium"},
  "motion":{scenario:"motion",starterPrompt:"Use motion graphics as the primary visual language. Keep hierarchy clear, respect safe areas, and avoid simultaneous competing cards.",sceneTaxonomy:["hook","process","comparison","proof","cta"],captionHint:"minimal · motion-first",visualIntensity:"high"},
  "long-short":{scenario:"long-short",starterPrompt:"Extract the strongest short-form narrative from the source. Prioritize an immediate hook, concise supporting proof and a clean CTA while removing low-value repetition.",sceneTaxonomy:["hook","pain","solution","proof","cta"],captionHint:"bold · short-form readability",visualIntensity:"high"},
  "blank":{scenario:"blank",starterPrompt:"",sceneTaxonomy:[],captionHint:"primary",visualIntensity:"medium"},
};

export const getScenarioStarter=(scenario:ScenarioId):WorkflowStarter=>WorkflowStarterSchema.parse(SCENARIO_STARTERS[scenario]);
export const DEFAULT_WORKFLOW_STARTER=getScenarioStarter("blank");
