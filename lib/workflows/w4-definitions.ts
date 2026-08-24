import {WorkflowDefinitionSchema,type WorkflowDefinition,type WorkflowScenario} from "@/lib/workflows/schema";
import {W3_REVIEW_WORKFLOW_DEFINITIONS} from "@/lib/workflows/production-definitions";
import type {WorkflowDefinitionRegistry} from "@/lib/workflows/registry";
import {W4_FINAL_RENDER_EXECUTOR_KEY} from "@/lib/workflows/w4-stages";

const createW4Definition=(scenario:WorkflowScenario):WorkflowDefinition=>{
  const source=W3_REVIEW_WORKFLOW_DEFINITIONS.find(item=>item.scenario===scenario);
  if(!source)throw new Error(`Missing W3 review workflow definition for ${scenario}.`);
  return WorkflowDefinitionSchema.parse({
    ...source,
    version:"2",
    name:`Video Production · ${scenario} · UI`,
    stages:source.stages.map(stage=>stage.id==="FINAL_RENDER"?{...stage,executorKey:W4_FINAL_RENDER_EXECUTOR_KEY}:stage),
    metadata:{description:"V2.2-W4 user-facing human-in-the-loop workflow. Version 2 preserves the accepted W3 @1 definition and binds final-render asset delivery to the request origin persisted on WorkflowRun."},
  });
};

export const W4_WORKFLOW_DEFINITIONS=[
  createW4Definition("talking-head"),
  createW4Definition("product-ad"),
  createW4Definition("explainer"),
] as const;

export const registerW4WorkflowDefinitions=(registry:WorkflowDefinitionRegistry)=>{
  for(const definition of W4_WORKFLOW_DEFINITIONS){
    try{registry.get(definition.id,definition.version);}catch{registry.register(definition);}
  }
  return registry;
};
