import {assertProductionMutationTargetsDeclared,ProductionMutationScopeError} from "@/lib/production/autonomy/commands";
import type {ProductionStepProtectionInspector} from "@/lib/production/autonomy/service";
import {ProductionMutationTargetSchema,type ProductionMutationTarget} from "@/lib/production/autonomy/schema";
import type {ProductionExecutionProjectReader,ProductionStepRunner,ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import type {StepExecutionResult} from "@/lib/production/execution/schema";

export interface ProductionStepTargetResolver{
  resolve(input:ProductionStepRunnerInput):Promise<ProductionMutationTarget[]>;
}

const blocked=(code:string,message:string):StepExecutionResult=>({status:"blocked",code,message});
const approvedCheckpoint=(input:ProductionStepRunnerInput)=>input.execution.steps.find(item=>item.stepId===input.step.id)?.checkpoint?.status==="approved";
const isProtectedMutationStep=(input:ProductionStepRunnerInput)=>input.step.kind==="edit-project"||input.step.kind==="repair";

export class ProtectedProductionStepRunner implements ProductionStepRunner{
  constructor(
    private readonly delegate:ProductionStepRunner,
    private readonly projects:ProductionExecutionProjectReader,
    private readonly protections:ProductionStepProtectionInspector,
    private readonly targets?:ProductionStepTargetResolver,
  ){}

  async execute(input:ProductionStepRunnerInput):Promise<StepExecutionResult>{
    if(!isProtectedMutationStep(input))return this.delegate.execute(input);
    if(!this.targets)return blocked("EDIT_TARGET_RESOLVER_UNAVAILABLE","Autonomous Project mutations are blocked until an application-owned target resolver is configured.");

    let actualTargets:ProductionMutationTarget[];
    try{
      actualTargets=(await this.targets.resolve(input)).map(target=>ProductionMutationTargetSchema.parse(target));
      if(actualTargets.length===0){
        if(input.step.kind==="repair")return this.delegate.execute(input);
        return blocked("EDIT_TARGETS_UNRESOLVED","Autonomous Project edits are blocked when the bounded application cannot resolve affected logical targets.");
      }
      assertProductionMutationTargetsDeclared(actualTargets,input.step.targets??[]);
    }catch(error){
      if(error instanceof ProductionMutationScopeError)return blocked(error.code,error.message);
      return blocked("EDIT_TARGET_RESOLUTION_FAILED","The bounded application could not resolve a valid logical mutation target scope.");
    }

    const project=await this.projects.load(input.mission.projectId);
    if(project.project.revision!==input.expectedProjectRevision){
      const state=input.execution.steps.find(item=>item.stepId===input.step.id);
      const recoverableAppliedRevision=state?.status==="running"&&project.project.revision===input.expectedProjectRevision+1;
      if(recoverableAppliedRevision)return this.delegate.execute(input);
      return blocked("PRODUCTION_EXECUTION_STALE_PROJECT","Autonomous Project mutation stopped because current Project revision no longer matches the execution revision.");
    }

    const assessment=await this.protections.inspect(project,actualTargets);
    if(assessment.decision==="block")return blocked("EDIT_PROTECTION_BLOCKED","Autonomous Project mutation targets explicitly protected or locked work and was blocked before mutation.");
    if(assessment.decision==="review"&&!approvedCheckpoint(input))return blocked("EDIT_PROTECTION_REVIEW_REQUIRED","Autonomous Project mutation targets human-modified or ownership-unknown work and requires explicit review before mutation.");
    return this.delegate.execute(input);
  }
}
