import type {ProductionExecutionService} from "@/lib/production/execution/service";
import type {ProductionExecution} from "@/lib/production/execution/schema";
import type {ProductionCampaignMissionExecutionPort} from "@/lib/production/campaign/runner";
import type {ProductionCampaignMissionRef,ProductionCampaignMissionRunResult} from "@/lib/production/campaign/schema";

export type ProductionCampaignExecutionControl=Pick<ProductionExecutionService,"advance"|"cancel">;
export type ProductionCampaignExecutionPortOptions={maxAdvances?:number};

const unique=<T>(items:T[])=>[...new Set(items)];
const latestFailure=(execution:ProductionExecution)=>{
  const active=execution.activeStepId?execution.steps.find(step=>step.stepId===execution.activeStepId):undefined;
  if(active?.lastFailure)return active.lastFailure;
  return[...execution.steps].reverse().find(step=>step.lastFailure)?.lastFailure;
};
const finalRenderIds=(execution:ProductionExecution)=>unique(execution.steps.flatMap(step=>step.status==="completed"?step.evidence.filter(item=>item.kind==="render").map(item=>item.id):[]));

export class ProductionExecutionCampaignMissionPort implements ProductionCampaignMissionExecutionPort{
  private readonly maxAdvances:number;
  constructor(private readonly execution:ProductionCampaignExecutionControl,options:ProductionCampaignExecutionPortOptions={}){
    this.maxAdvances=Math.max(1,Math.min(256,Math.floor(options.maxAdvances??128)));
  }

  async cancelMission(ref:ProductionCampaignMissionRef):Promise<void>{
    await this.execution.cancel(ref.projectId,ref.missionId);
  }

  async runMission(ref:ProductionCampaignMissionRef,signal?:AbortSignal):Promise<ProductionCampaignMissionRunResult>{
    for(let advance=0;advance<this.maxAdvances;advance+=1){
      if(signal?.aborted){
        await this.execution.cancel(ref.projectId,ref.missionId);
        return{status:"cancelled",finalArtifactIds:[]};
      }
      const state=await this.execution.advance(ref.projectId,ref.missionId);
      if(state.status==="running")continue;
      if(state.status==="completed")return{status:"completed",finalArtifactIds:finalRenderIds(state)};
      if(state.status==="waiting-review")return{status:"waiting-review",currentStep:state.activeStepId??"review",finalArtifactIds:[]};
      if(state.status==="cancelled")return{status:"cancelled",finalArtifactIds:[]};
      const failure=latestFailure(state);
      if(state.status==="failed")return{
        status:"failed",
        finalArtifactIds:[],
        error:{code:failure?.code??"PRODUCTION_EXECUTION_FAILED",message:failure?.message??"Production Mission execution failed without durable failure details."},
      };
      return{
        status:"blocked",
        currentStep:state.activeStepId,
        blocker:failure?.message??"Production Mission execution reached a durable blocked state.",
        finalArtifactIds:[],
      };
    }
    return{
      status:"blocked",
      blocker:"Production Mission stopped at the bounded Campaign advance limit and requires explicit inspection before continuing.",
      finalArtifactIds:[],
    };
  }
}
