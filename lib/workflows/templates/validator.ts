import {WorkflowDefinitionSchema} from "@/lib/workflows/schema";
import {WorkflowTemplateSchema, workflowTemplateToDefinition, type WorkflowTemplate} from "./schema";

export const validateWorkflowTemplate=(template:unknown)=>{
  const parsed=WorkflowTemplateSchema.parse(template);
  WorkflowDefinitionSchema.parse(workflowTemplateToDefinition(parsed));
  return parsed;
};

export const isValidWorkflowTemplate=(template:unknown):template is WorkflowTemplate=>{
  try{
    validateWorkflowTemplate(template);
    return true;
  }catch{
    return false;
  }
};
