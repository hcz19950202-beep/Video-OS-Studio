import {z} from "zod";
import {WorkflowDefinitionSchema, WorkflowStageDefinitionSchema} from "@/lib/workflows/schema";

export const WorkflowTemplateIdSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
export const WorkflowTemplateCategorySchema=z.string().min(1).max(64);

export const WorkflowTemplateOutputProfileSchema=z.object({
  id:z.string().min(1),
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  fps:z.number().int().positive(),
});

export const WorkflowTemplateSchema=z.object({
  id:WorkflowTemplateIdSchema,
  name:z.string().min(1).max(200),
  description:z.string().max(2000).optional(),
  category:WorkflowTemplateCategorySchema,
  version:z.string().min(1).max(64),
  stages:z.array(WorkflowStageDefinitionSchema).min(1),
  checkpoints:z.array(z.string().min(1)).default([]),
  outputProfiles:z.array(WorkflowTemplateOutputProfileSchema).default([]),
}).superRefine((template,ctx)=>{
  const ids=new Set<string>();
  for(const [index,stage] of template.stages.entries()){
    if(ids.has(stage.id)){
      ctx.addIssue({code:"custom",path:["stages",index,"id"],message:`Duplicate stage ${stage.id}`});
    }
    ids.add(stage.id);
  }
});

export type WorkflowTemplate=z.infer<typeof WorkflowTemplateSchema>;

export const workflowTemplateToDefinition=(template:WorkflowTemplate)=>WorkflowDefinitionSchema.parse({
  id:template.id,
  version:template.version,
  name:template.name,
  scenario:template.id,
  stages:template.stages,
  entryStageIds:template.stages.filter(stage=>stage.dependsOn.length===0).map(stage=>stage.id),
  metadata:{description:template.description},
});
