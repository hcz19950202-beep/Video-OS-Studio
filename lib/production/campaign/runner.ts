import {
  ProductionCampaignMissionRunResultSchema,
  type ProductionCampaign,
  type ProductionCampaignMissionRef,
  type ProductionCampaignMissionRunResult,
  type ProductionCampaignStatus,
} from "@/lib/production/campaign/schema";
import {
  ProductionCampaignMissionNotFoundError,
  ProductionCampaignStateError,
} from "@/lib/production/campaign/errors";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";

export type ProductionCampaignMissionExecutionPort={
  runMission:(mission:ProductionCampaignMissionRef,signal?:AbortSignal)=>Promise<ProductionCampaignMissionRunResult>;
  cancelMission?:(mission:ProductionCampaignMissionRef)=>Promise<void>;
};

export type ProductionCampaignRunnerOptions={now?:()=>Date};
type MissionPreparation="start"|"resume"|"cancel"|"skip";

const aggregateCampaignStatus=(missions:ProductionCampaign["missions"]):ProductionCampaignStatus=>{
  if(missions.some(mission=>mission.status==="failed"))return"failed";
  if(missions.some(mission=>mission.status==="blocked"))return"blocked";
  if(missions.some(mission=>mission.status==="waiting-review"))return"waiting-review";
  if(missions.some(mission=>mission.status==="cancelled"))return"cancelled";
  if(missions.every(mission=>mission.status==="completed"))return"completed";
  return"blocked";
};

const normalizedExecutionFailure=(error:unknown):ProductionCampaignMissionRunResult=>({
  status:"failed",
  finalArtifactIds:[],
  error:{code:"CAMPAIGN_MISSION_EXECUTION_FAILED",message:error instanceof Error?error.message:String(error)},
});

export class ProductionCampaignRunner{
  private readonly now:()=>Date;

  constructor(
    readonly repository:ProductionCampaignRepository,
    private readonly execution:ProductionCampaignMissionExecutionPort,
    options:ProductionCampaignRunnerOptions={},
  ){
    this.now=options.now??(()=>new Date());
  }

  private async prepareMission(campaignId:string,ref:ProductionCampaignMissionRef):Promise<MissionPreparation>{
    const now=this.now().toISOString();
    let preparation:MissionPreparation="skip";
    await this.repository.mutate(campaignId,current=>{
      const target=current.missions.find(mission=>mission.projectId===ref.projectId&&mission.missionId===ref.missionId);
      if(!target)throw new ProductionCampaignMissionNotFoundError(campaignId,ref.projectId,ref.missionId);
      if(target.status==="running"){
        preparation=target.cancellationRequestedAt===undefined?"resume":"cancel";
        return current;
      }
      if(target.status!=="pending"||target.cancellationRequestedAt!==undefined)return current;
      preparation="start";
      return{
        ...current,
        revision:current.revision+1,
        updatedAt:now,
        missions:current.missions.map(mission=>mission!==target?mission:{
          ...mission,
          status:"running" as const,
          attempt:mission.attempt+1,
          currentStep:undefined,
          blocker:undefined,
          error:undefined,
          finalArtifactIds:[],
          startedAt:now,
          finishedAt:undefined,
        }),
      };
    });
    return preparation;
  }

  private async finishMission(campaignId:string,ref:ProductionCampaignMissionRef,resultInput:ProductionCampaignMissionRunResult){
    const result=ProductionCampaignMissionRunResultSchema.parse(resultInput);
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>({
      ...current,
      revision:current.revision+1,
      updatedAt:now,
      missions:current.missions.map(mission=>{
        if(mission.projectId!==ref.projectId||mission.missionId!==ref.missionId)return mission;
        if(mission.cancellationRequestedAt!==undefined)return{
          ...mission,
          status:"cancelled" as const,
          currentStep:undefined,
          blocker:undefined,
          error:undefined,
          finalArtifactIds:[],
          finishedAt:now,
        };
        return{
          ...mission,
          status:result.status,
          currentStep:result.currentStep,
          blocker:result.blocker,
          error:result.error,
          finalArtifactIds:result.finalArtifactIds,
          finishedAt:result.status==="completed"||result.status==="cancelled"||result.status==="failed"?now:undefined,
          ...(result.status==="cancelled"?{cancellationRequestedAt:now}:{}),
        };
      }),
    }));
  }

  async cancelMission(campaignId:string,ref:ProductionCampaignMissionRef):Promise<ProductionCampaign>{
    const requestedAt=this.now().toISOString();
    let notifyExecution=false;
    const requested=await this.repository.mutate(campaignId,current=>{
      const target=current.missions.find(mission=>mission.projectId===ref.projectId&&mission.missionId===ref.missionId);
      if(!target)throw new ProductionCampaignMissionNotFoundError(campaignId,ref.projectId,ref.missionId);
      if(target.status==="cancelled")return current;
      if(target.status==="completed"||target.status==="failed")throw new ProductionCampaignStateError(current.id,current.status,"A terminal Campaign Mission cannot be cancelled.");
      notifyExecution=target.status==="running";
      const immediate=target.status!=="running";
      return{
        ...current,
        revision:current.revision+1,
        updatedAt:requestedAt,
        missions:current.missions.map(mission=>mission!==target?mission:{
          ...mission,
          status:immediate?"cancelled" as const:mission.status,
          cancellationRequestedAt:requestedAt,
          currentStep:immediate?undefined:mission.currentStep,
          blocker:immediate?undefined:mission.blocker,
          error:immediate?undefined:mission.error,
          finalArtifactIds:immediate?[]:mission.finalArtifactIds,
          finishedAt:immediate?requestedAt:mission.finishedAt,
        }),
      };
    });
    if(notifyExecution)await this.execution.cancelMission?.(ref);
    return requested;
  }

  private async runOwned(campaignId:string,signal?:AbortSignal):Promise<ProductionCampaign>{
    const startedAt=this.now().toISOString();
    const started=await this.repository.mutate(campaignId,current=>{
      if(current.status==="running")return current;
      if(current.status!=="draft"&&current.status!=="queued")throw new ProductionCampaignStateError(current.id,current.status);
      return{
        ...current,
        status:"running" as const,
        revision:current.revision+1,
        startedAt:current.startedAt??startedAt,
        finishedAt:undefined,
        updatedAt:startedAt,
      };
    });

    const refs=started.missions.map(({projectId,missionId})=>({projectId,missionId}));
    let nextIndex=0;
    const worker=async()=>{
      for(;;){
        const index=nextIndex++;
        if(index>=refs.length)return;
        const ref=refs[index]!;
        const preparation=await this.prepareMission(campaignId,ref);
        if(preparation==="skip")continue;
        if(preparation==="cancel"){
          await this.execution.cancelMission?.(ref);
          await this.finishMission(campaignId,ref,{status:"cancelled",finalArtifactIds:[]});
          continue;
        }
        let result:ProductionCampaignMissionRunResult;
        if(signal?.aborted){
          if(preparation==="resume")await this.execution.cancelMission?.(ref);
          result={status:"cancelled",finalArtifactIds:[]};
        }else{
          try{result=ProductionCampaignMissionRunResultSchema.parse(await this.execution.runMission(ref,signal));}
          catch(error){result=normalizedExecutionFailure(error);}
        }
        await this.finishMission(campaignId,ref,result);
      }
    };

    const workerCount=Math.min(started.maxConcurrency,refs.length);
    await Promise.all(Array.from({length:workerCount},()=>worker()));

    const completedAt=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>{
      const status=aggregateCampaignStatus(current.missions);
      const terminal=status==="completed"||status==="cancelled"||status==="failed";
      return{
        ...current,
        status,
        revision:current.revision+1,
        updatedAt:completedAt,
        finishedAt:terminal?completedAt:undefined,
      };
    });
  }

  async run(campaignId:string,signal?:AbortSignal):Promise<ProductionCampaign>{
    const claim=await this.repository.claimRunner(campaignId);
    let result:ProductionCampaign|undefined;
    let runError:unknown;
    let runFailed=false;
    try{result=await this.runOwned(campaignId,signal);}
    catch(error){runFailed=true;runError=error;}
    try{await this.repository.releaseRunnerClaim(campaignId,claim.ownerToken);}
    catch(releaseError){
      if(runFailed)throw new AggregateError([runError,releaseError],`Production Campaign ${campaignId} failed and its runner claim could not be released.`);
      throw releaseError;
    }
    if(runFailed)throw runError;
    return result!;
  }
}
