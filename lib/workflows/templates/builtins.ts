import type { WorkflowTemplate } from "./schema";

const baseOutputs = [
  { id: "default-16-9", aspectRatio: "16:9" as const },
  { id: "default-9-16", aspectRatio: "9:16" as const },
];

export const talkingHeadTemplate: WorkflowTemplate = {
  id: "talking-head",
  version: "1",
  name: "Talking Head",
  description: "Generate a talking head video draft.",
  scenario: "social-video",
  stages: [
    { id: "MEDIA_IMPORT" },
    { id: "TRANSCRIBE", dependsOn: ["MEDIA_IMPORT"] },
    { id: "CAPTION_GENERATION", dependsOn: ["TRANSCRIBE"] },
    { id: "VISUAL_PLANNING", dependsOn: ["TRANSCRIBE"] },
    { id: "FINAL_RENDER", dependsOn: ["VISUAL_PLANNING"] },
  ],
  outputProfiles: baseOutputs,
};

export const productAdTemplate: WorkflowTemplate = {
  id: "product-ad",
  version: "1",
  name: "Product Ad",
  description: "Generate a product advertisement workflow.",
  scenario: "advertisement",
  stages: [
    { id: "MEDIA_IMPORT" },
    { id: "VISUAL_PLANNING", dependsOn: ["MEDIA_IMPORT"] },
    { id: "MOTION_GENERATION", dependsOn: ["VISUAL_PLANNING"] },
    { id: "TIMELINE_ASSEMBLY", dependsOn: ["MOTION_GENERATION"] },
    { id: "FINAL_RENDER", dependsOn: ["TIMELINE_ASSEMBLY"] },
  ],
  outputProfiles: baseOutputs,
};

export const explainerTemplate: WorkflowTemplate = {
  id: "explainer",
  version: "1",
  name: "Explainer",
  description: "Generate an explainer workflow.",
  scenario: "education",
  stages: [
    { id: "MEDIA_IMPORT" },
    { id: "SCRIPT_ANALYSIS", dependsOn: ["MEDIA_IMPORT"] },
    { id: "VISUAL_PLANNING", dependsOn: ["SCRIPT_ANALYSIS"] },
    { id: "FINAL_RENDER", dependsOn: ["VISUAL_PLANNING"] },
  ],
  outputProfiles: baseOutputs,
};

export const builtinWorkflowTemplates = [
  talkingHeadTemplate,
  productAdTemplate,
  explainerTemplate,
];
