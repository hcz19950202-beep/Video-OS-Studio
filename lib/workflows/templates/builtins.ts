import type {WorkflowTemplate} from "../schema";

const stage=(id:string,executorKey:string,dependsOn:string[]=[]):WorkflowTemplate["stages"][number]=>({
  id,
  kind:"job",
  dependsOn,
  retryable:true,
  reviewRequired:false,
  invalidates:[],
  executorKey,
});

export const talkingHeadTemplate:WorkflowTemplate={
  id:"talking-head",
  name:"Talking Head",
  description:"口播视频生产流程",
  category:"video",
  version:"1.0.0",
  stages:[
    stage("MEDIA_IMPORT","media-import"),
    stage("TRANSCRIBE","transcribe",["MEDIA_IMPORT"]),
    stage("CAPTION_GENERATION","caption-generation",["TRANSCRIBE"]),
    stage("VISUAL_PLANNING","visual-planning",["CAPTION_GENERATION"]),
    stage("FINAL_RENDER","final-render",["VISUAL_PLANNING"]),
  ],
  checkpoints:["draft-review"],
  outputProfiles:[],
};

export const productAdTemplate:WorkflowTemplate={
  id:"product-ad",
  name:"Product Advertisement",
  description:"产品广告生产流程",
  category:"advertisement",
  version:"1.0.0",
  stages:[
    stage("MEDIA_IMPORT","media-import"),
    stage("VISUAL_PLANNING","visual-planning",["MEDIA_IMPORT"]),
    stage("MOTION_GENERATION","motion-generation",["VISUAL_PLANNING"]),
    stage("FINAL_RENDER","final-render",["MOTION_GENERATION"]),
  ],
  checkpoints:["creative-review"],
  outputProfiles:[],
};

export const explainerTemplate:WorkflowTemplate={
  id:"explainer",
  name:"Explainer",
  description:"解释型视频生产流程",
  category:"education",
  version:"1.0.0",
  stages:[
    stage("MEDIA_IMPORT","media-import"),
    stage("SCRIPT_ANALYSIS","script-analysis",["MEDIA_IMPORT"]),
    stage("VISUAL_PLANNING","visual-planning",["SCRIPT_ANALYSIS"]),
    stage("FINAL_RENDER","final-render",["VISUAL_PLANNING"]),
  ],
  checkpoints:["content-review"],
  outputProfiles:[],
};

export const builtinWorkflowTemplates=[talkingHeadTemplate,productAdTemplate,explainerTemplate];
