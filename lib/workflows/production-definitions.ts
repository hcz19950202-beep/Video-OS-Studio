import {WorkflowDefinitionSchema,type WorkflowDefinition} from "@/lib/workflows/schema";
import type {WorkflowDefinitionRegistry} from "@/lib/workflows/registry";
import {W2_EXECUTOR_KEYS} from "@/lib/workflows/production-stages";

export const W3_REVIEW_EXECUTOR_KEYS={
  contentReview:"w3.content-review",
  assemblyReview:"w3.assembly-review",
} as const;

const stage=(id:string,executorKey:string,dependsOn:string[],kind:WorkflowDefinition["stages"][number]["kind"],retryable=true,reviewRequired=false):WorkflowDefinition["stages"][number]=>({id,kind,dependsOn,optional:false,retryable,reviewRequired,invalidates:[],executorKey});

const capabilityStages=():WorkflowDefinition["stages"]=>[
  stage("MEDIA_IMPORT",W2_EXECUTOR_KEYS.mediaImport,[],"analysis",false),
  stage("MEDIA_PROBE",W2_EXECUTOR_KEYS.mediaProbe,["MEDIA_IMPORT"],"analysis",false),
  stage("MEDIA_NORMALIZE",W2_EXECUTOR_KEYS.mediaNormalize,["MEDIA_PROBE"],"analysis",false),
  stage("TRANSCRIBE",W2_EXECUTOR_KEYS.transcribe,["MEDIA_NORMALIZE"],"job",true),
  stage("SCRIPT_ANALYSIS",W2_EXECUTOR_KEYS.scriptAnalysis,["TRANSCRIBE"],"analysis",true),
  stage("SCENE_DETECTION",W2_EXECUTOR_KEYS.sceneDetection,["SCRIPT_ANALYSIS"],"mutation",true),
  stage("CAPTION_GENERATION",W2_EXECUTOR_KEYS.captionGeneration,["SCENE_DETECTION"],"mutation",true),
  stage("VISUAL_PLANNING",W2_EXECUTOR_KEYS.visualPlanning,["CAPTION_GENERATION"],"analysis",true),
  stage("MOTION_GENERATION",W2_EXECUTOR_KEYS.motionGeneration,["VISUAL_PLANNING"],"job",true),
  stage("BROLL_ASSEMBLY",W2_EXECUTOR_KEYS.brollAssembly,["MOTION_GENERATION"],"mutation",true),
  stage("AUDIO_ASSEMBLY",W2_EXECUTOR_KEYS.audioAssembly,["BROLL_ASSEMBLY"],"mutation",true),
  stage("TIMELINE_ASSEMBLY",W2_EXECUTOR_KEYS.timelineAssembly,["AUDIO_ASSEMBLY"],"mutation",true),
  stage("PREVIEW",W2_EXECUTOR_KEYS.preview,["TIMELINE_ASSEMBLY"],"analysis",true),
  stage("FINAL_RENDER",W2_EXECUTOR_KEYS.finalRender,["PREVIEW"],"render",true),
];

const reviewStages=():WorkflowDefinition["stages"]=>[
  stage("MEDIA_IMPORT",W2_EXECUTOR_KEYS.mediaImport,[],"analysis",false),
  stage("MEDIA_PROBE",W2_EXECUTOR_KEYS.mediaProbe,["MEDIA_IMPORT"],"analysis",false),
  stage("MEDIA_NORMALIZE",W2_EXECUTOR_KEYS.mediaNormalize,["MEDIA_PROBE"],"analysis",false),
  stage("TRANSCRIBE",W2_EXECUTOR_KEYS.transcribe,["MEDIA_NORMALIZE"],"job",true),
  stage("SCRIPT_ANALYSIS",W2_EXECUTOR_KEYS.scriptAnalysis,["TRANSCRIBE"],"analysis",true),
  stage("SCENE_DETECTION",W2_EXECUTOR_KEYS.sceneDetection,["SCRIPT_ANALYSIS"],"mutation",true),
  stage("CAPTION_GENERATION",W2_EXECUTOR_KEYS.captionGeneration,["SCENE_DETECTION"],"mutation",true),
  stage("VISUAL_PLANNING",W2_EXECUTOR_KEYS.visualPlanning,["CAPTION_GENERATION"],"analysis",true),
  stage("CONTENT_REVIEW",W3_REVIEW_EXECUTOR_KEYS.contentReview,["VISUAL_PLANNING"],"checkpoint",false,true),
  stage("MOTION_GENERATION",W2_EXECUTOR_KEYS.motionGeneration,["CONTENT_REVIEW"],"job",true),
  stage("BROLL_ASSEMBLY",W2_EXECUTOR_KEYS.brollAssembly,["MOTION_GENERATION"],"mutation",true),
  stage("AUDIO_ASSEMBLY",W2_EXECUTOR_KEYS.audioAssembly,["BROLL_ASSEMBLY"],"mutation",true),
  stage("TIMELINE_ASSEMBLY",W2_EXECUTOR_KEYS.timelineAssembly,["AUDIO_ASSEMBLY"],"mutation",true),
  stage("PREVIEW",W2_EXECUTOR_KEYS.preview,["TIMELINE_ASSEMBLY"],"analysis",true),
  stage("ASSEMBLY_REVIEW",W3_REVIEW_EXECUTOR_KEYS.assemblyReview,["PREVIEW"],"checkpoint",false,true),
  stage("FINAL_RENDER",W2_EXECUTOR_KEYS.finalRender,["ASSEMBLY_REVIEW"],"render",true),
];

export const createW2CapabilityWorkflowDefinition=(scenario:"talking-head"|"product-ad"|"explainer")=>WorkflowDefinitionSchema.parse({
  id:`w2-capability-${scenario}`,
  version:"1",
  name:`W2 Capability Integration · ${scenario}`,
  scenario,
  stages:capabilityStages(),
  entryStageIds:["MEDIA_IMPORT"],
  metadata:{description:"Internal V2.2-W2 capability-integration workflow. It proves Stage adapters and real engines before W3 human-review/invalidation and W4 Generate First Draft UI are introduced. PREVIEW is a Project readiness barrier; FINAL_RENDER is the encoded render Stage."},
});

export const createW3ReviewWorkflowDefinition=(scenario:"talking-head"|"product-ad"|"explainer")=>WorkflowDefinitionSchema.parse({
  id:`video-production-${scenario}`,
  version:"1",
  name:`Video Production · ${scenario}`,
  scenario,
  stages:reviewStages(),
  entryStageIds:["MEDIA_IMPORT"],
  metadata:{description:"V2.2 human-in-the-loop production workflow with CONTENT_REVIEW and ASSEMBLY_REVIEW durable checkpoints. Existing W2 capability definitions remain immutable for accepted runs."},
});

export const W2_CAPABILITY_WORKFLOW_DEFINITIONS=[
  createW2CapabilityWorkflowDefinition("talking-head"),
  createW2CapabilityWorkflowDefinition("product-ad"),
  createW2CapabilityWorkflowDefinition("explainer"),
] as const;

export const W3_REVIEW_WORKFLOW_DEFINITIONS=[
  createW3ReviewWorkflowDefinition("talking-head"),
  createW3ReviewWorkflowDefinition("product-ad"),
  createW3ReviewWorkflowDefinition("explainer"),
] as const;

const registerDefinitions=(registry:WorkflowDefinitionRegistry,definitions:readonly WorkflowDefinition[])=>{
  for(const definition of definitions){
    try{registry.get(definition.id,definition.version);}catch{registry.register(definition);}
  }
  return registry;
};

export const registerW2CapabilityWorkflowDefinitions=(registry:WorkflowDefinitionRegistry)=>registerDefinitions(registry,W2_CAPABILITY_WORKFLOW_DEFINITIONS);
export const registerW3ReviewWorkflowDefinitions=(registry:WorkflowDefinitionRegistry)=>registerDefinitions(registry,W3_REVIEW_WORKFLOW_DEFINITIONS);
export const registerProductionWorkflowDefinitions=(registry:WorkflowDefinitionRegistry)=>registerW3ReviewWorkflowDefinitions(registerW2CapabilityWorkflowDefinitions(registry));
