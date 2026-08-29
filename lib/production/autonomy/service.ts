import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {evaluateProductionEditProtection} from "@/lib/production/autonomy/policy";
import {
  ProductionEditProtectionRecordSchema,
  ProductionLogicalTargetSchema,
  productionLogicalTargetKey,
  type ProductionEditOwnershipState,
  type ProductionEditProtectionRecord,
  type ProductionLogicalTarget,
  type ProductionMutationTarget,
  type ProductionProtectionAssessment,
} from "@/lib/production/autonomy/schema";
import type {ProductionPlanStep} from "@/lib/production/plan/schema";
import type {Project} from "@/schemas/project";

export interface ProductionStepProtectionInspector{
  inspect(project:Project,targets:ProductionMutationTarget[]):Promise<ProductionProtectionAssessment>;
  inspectStep(project:Project,step:ProductionPlanStep):Promise<ProductionProtectionAssessment>;
}

export class ProductionEditProtectionService implements ProductionStepProtectionInspector{
  constructor(private readonly repository:ProductionEditProtectionRepository,private readonly now:()=>string=()=>new Date().toISOString()){}

  private async setRecord(projectId:string,targetInput:ProductionLogicalTarget,state:ProductionEditOwnershipState,source:"agent"|"human"|"system",projectRevision:number,reason?:string){
    const target=ProductionLogicalTargetSchema.parse(targetInput);
    const record=ProductionEditProtectionRecordSchema.parse({target,state,source,projectRevision,reason,updatedAt:this.now()});
    const key=productionLogicalTargetKey(target);
    return this.repository.mutate(projectId,current=>({
      ...current,
      records:[...current.records.filter(item=>productionLogicalTargetKey(item.target)!==key),record],
      updatedAt:this.now(),
    }));
  }

  markAiOwned(projectId:string,target:ProductionLogicalTarget,projectRevision:number,reason?:string){
    return this.setRecord(projectId,target,"ai-owned","agent",projectRevision,reason);
  }
  markHumanModified(projectId:string,target:ProductionLogicalTarget,projectRevision:number,reason?:string){
    return this.setRecord(projectId,target,"human-modified","human",projectRevision,reason);
  }
  protect(projectId:string,target:ProductionLogicalTarget,projectRevision:number,reason?:string){
    return this.setRecord(projectId,target,"protected","human",projectRevision,reason);
  }
  protectSystem(projectId:string,target:ProductionLogicalTarget,projectRevision:number,reason?:string){
    return this.setRecord(projectId,target,"protected","system",projectRevision,reason);
  }

  async clear(projectId:string,targetInput:ProductionLogicalTarget){
    const target=ProductionLogicalTargetSchema.parse(targetInput);
    const key=productionLogicalTargetKey(target);
    return this.repository.mutate(projectId,current=>({
      ...current,
      records:current.records.filter(item=>productionLogicalTargetKey(item.target)!==key),
      updatedAt:this.now(),
    }));
  }

  async records(projectId:string):Promise<ProductionEditProtectionRecord[]>{
    return(await this.repository.load(projectId)).records;
  }

  async inspect(project:Project,targets:ProductionMutationTarget[]):Promise<ProductionProtectionAssessment>{
    const snapshot=await this.repository.load(project.project.id);
    return evaluateProductionEditProtection(project,targets,snapshot.records);
  }

  inspectStep(project:Project,step:ProductionPlanStep){
    return this.inspect(project,step.targets??[]);
  }
}
