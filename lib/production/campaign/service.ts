import {randomUUID} from "node:crypto";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {
  CreateProductionCampaignInputSchema,
  ProductionCampaignSchema,
  type CreateProductionCampaignInput,
  type ProductionCampaign,
  type ProductionCampaignMissionRef,
} from "@/lib/production/campaign/schema";
import {
  ProductionCampaignMissionUnavailableError,
  ProductionCampaignStateError,
} from "@/lib/production/campaign/errors";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";

export type ProductionCampaignMissionResolver={
  load:(projectId:string,missionId:string)=>Promise<ProductionMission|null>;
};

export type ProductionCampaignServiceOptions={
  now?:()=>Date;
  createId?:()=>string;
};

export class ProductionCampaignService{
  private readonly now:()=>Date;
  private readonly createId:()=>string;

  constructor(
    readonly repository:ProductionCampaignRepository,
    private readonly missions:ProductionCampaignMissionResolver,
    options:ProductionCampaignServiceOptions={},
  ){
    this.now=options.now??(()=>new Date());
    this.createId=options.createId??randomUUID;
  }

  private async requireMission(ref:ProductionCampaignMissionRef){
    const mission=await this.missions.load(ref.projectId,ref.missionId);
    if(!mission||mission.id!==ref.missionId||mission.projectId!==ref.projectId)throw new ProductionCampaignMissionUnavailableError(ref.projectId,ref.missionId);
    return mission;
  }

  async create(input:CreateProductionCampaignInput):Promise<ProductionCampaign>{
    const parsed=CreateProductionCampaignInputSchema.parse(input);
    for(const ref of parsed.missions)await this.requireMission(ref);
    const now=this.now().toISOString();
    return this.repository.create(ProductionCampaignSchema.parse({
      id:this.createId(),
      title:parsed.title,
      brief:parsed.brief,
      status:"draft",
      revision:1,
      maxConcurrency:parsed.maxConcurrency,
      sharedReferences:parsed.sharedReferences??{},
      missions:parsed.missions.map(ref=>({...ref,status:"pending" as const,attempt:0,finalArtifactIds:[]})),
      createdAt:now,
      updatedAt:now,
    }));
  }

  async enqueue(campaignId:string):Promise<ProductionCampaign>{
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>{
      if(current.status==="queued"||current.status==="running")return current;
      if(current.status!=="draft")throw new ProductionCampaignStateError(current.id,current.status,"Only a draft Campaign can be enqueued.");
      return{...current,status:"queued",revision:current.revision+1,updatedAt:now};
    });
  }

  async retryFailed(campaignId:string):Promise<ProductionCampaign>{
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>{
      if(current.status==="running"||current.status==="queued"||current.status==="archived")throw new ProductionCampaignStateError(current.id,current.status,"Campaign retry requires a settled non-archived Campaign.");
      if(!current.missions.some(mission=>mission.status==="failed"))throw new ProductionCampaignStateError(current.id,current.status,"Campaign has no failed Missions to retry.");
      return{
        ...current,
        status:"queued",
        revision:current.revision+1,
        updatedAt:now,
        finishedAt:undefined,
        missions:current.missions.map(mission=>mission.status!=="failed"?mission:{
          ...mission,
          status:"pending" as const,
          currentStep:undefined,
          blocker:undefined,
          error:undefined,
          cancellationRequestedAt:undefined,
          startedAt:undefined,
          finishedAt:undefined,
          finalArtifactIds:[],
        }),
      };
    });
  }

  async archive(campaignId:string):Promise<ProductionCampaign>{
    const now=this.now().toISOString();
    return this.repository.mutate(campaignId,current=>{
      if(current.status==="archived")return current;
      if(current.status==="running"||current.status==="queued")throw new ProductionCampaignStateError(current.id,current.status,"An active Campaign cannot be archived.");
      return{...current,status:"archived",revision:current.revision+1,updatedAt:now,finishedAt:current.finishedAt??now};
    });
  }

  async get(campaignId:string){return this.repository.require(campaignId);}
  async list(){return this.repository.list();}
}
