import {validateWorkflowTemplate} from "./validator";
import type {WorkflowTemplate} from "./schema";

export class WorkflowTemplateRegistry {
  private readonly templates=new Map<string,WorkflowTemplate>();

  register(template:WorkflowTemplate){
    const validated=validateWorkflowTemplate(template);
    this.templates.set(validated.id,validated);
    return validated;
  }

  get(id:string){
    return this.templates.get(id);
  }

  list(){
    return [...this.templates.values()];
  }

  validate(template:unknown){
    return validateWorkflowTemplate(template);
  }
}
