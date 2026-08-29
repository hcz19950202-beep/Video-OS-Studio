import {
  ProductionCampaignMissionRunResultSchema,
  type ProductionCampaign,
  type ProductionCampaignMissionRef,
  type ProductionCampaignMissionRunResult,
  type ProductionCampaignStatus,
} from "@/lib/production/campaign/schema";
import {ProductionCampaignStateError} from "@/lib/production/campaign/errors";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";

export type ProductionCampaignMissionExecutionPort={
  runMission:(mission:ProductionCampaignMissionRef,signal?:AbortSignal)=>Promise<ProductionCampaignMissionRunResult>;
};

export type ProductionCampaignRunnerOptions={now?:()=>Date};

const terminalCampaignStatus=(missions:ProductionCampaign["missions"]):ProductionCampaignStatus=>{
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

  private async beginMission(campaignId:string,ref:ProductionCampaignMissionRef){
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>({
      ...current,
      revision:current.revision+1,
      updatedAt:now,
      missions:current.missions.map(mission=>mission.projectId===ref.projectId&&mission.missionId===ref.missionId?{
        ...mission,
        status:"running" as const,
        attempt:mission.attempt+1,
        currentStep:undefined,
        blocker:undefined,
        error:undefined,
        finalArtifactIds:[],
        startedAt:now,
        finishedAt:undefined,
      }:mission),
    }));
  }

  private async finishMission(campaignId:string,ref:ProductionCampaignMissionRef,resultInput:ProductionCampaignMissionRunResult){
    const result=ProductionCampaignMissionRunResultSchema.parse(resultInput);
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>({
      ...current,
      revision:current.revision+1,
      updatedAt:now,
      missions:current.missions.map(mission=>mission.projectId===ref.projectId&&mission.missionId===ref.missionId?{
        ...mission,
        status:result.status,
        currentStep:result.currentStep,
        blocker:result.blocker,
        error:result.error,
        finalArtifactIds:result.finalArtifactIds,
        finishedAt:result.status==="completed"||result.status==="cancelled"||result.status==="failed"?now:undefined,
      }:mission),
    }));
  }

  async run(campaignId:string,signal?:AbortSignal):Promise<ProductionCampaign>{
    const startedAt=this.now().toISOString();
    const started=await this.repository.mutate(campaignId,current=>{
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
        const ref=refs[index];
        await this.beginMission(campaignId,ref);
        let result:ProductionCampaignMissionRunResult;
        if(signal?.aborted){
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
      const status=terminalCampaignStatus(current.missions);
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
}
