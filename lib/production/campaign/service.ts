import {randomUUID} from "node:crypto";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {
  CreateProductionCampaignInputSchema,
  ProductionCampaignSchema,
  type CreateProductionCampaignInput,
  type ProductionCampaign,
  type ProductionCampaignMissionRef,
} from "@/lib/production/campaign/schema";
import {ProductionCampaignMissionUnavailableError} from "@/lib/production/campaign/errors";
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

  async get(campaignId:string){return this.repository.require(campaignId);}
  async list(){return this.repository.list();}
}
