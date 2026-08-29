import {z} from "zod";
import {ProductionCampaignSchema,ProductionCampaignMissionRunSchema} from "@/lib/production/campaign/schema";
import {ProductionWorkspaceActivityStateSchema,ProductionWorkspaceFinalReadinessSchema,ProductionWorkspaceQAStateSchema,type ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";

const CampaignMissionLiveSummarySchema=z.object({
  projectRevision:z.number().int().nonnegative(),
  activity:ProductionWorkspaceActivityStateSchema,
  progressPercent:z.number().finite().min(0).max(100),
  qaState:ProductionWorkspaceQAStateSchema,
  finalRenderReadiness:ProductionWorkspaceFinalReadinessSchema,
  stale:z.boolean(),
}).strict();

const CampaignMissionUnavailableSchema=z.object({
  code:z.literal("CAMPAIGN_MISSION_WORKSPACE_UNAVAILABLE"),
  message:z.literal("Current Mission workspace state is unavailable."),
}).strict();

export const ProductionCampaignDashboardMissionSchema=z.object({
  run:ProductionCampaignMissionRunSchema,
  live:CampaignMissionLiveSummarySchema.nullable(),
  unavailable:CampaignMissionUnavailableSchema.optional(),
}).strict();

export const ProductionCampaignDashboardSchema=z.object({
  campaign:ProductionCampaignSchema,
  missions:z.array(ProductionCampaignDashboardMissionSchema).min(1).max(128),
}).strict();
export type ProductionCampaignDashboard=z.infer<typeof ProductionCampaignDashboardSchema>;

export type ProductionCampaignWorkspaceReader={
  snapshot:(projectId:string,missionId:string)=>Promise<ProductionWorkspaceSnapshot>;
};

export class ProductionCampaignDashboardService{
  constructor(
    private readonly campaigns:ProductionCampaignRepository,
    private readonly workspaces:ProductionCampaignWorkspaceReader,
  ){}

  async snapshot(campaignId:string):Promise<ProductionCampaignDashboard>{
    const campaign=await this.campaigns.require(campaignId);
    const missions=await Promise.all(campaign.missions.map(async run=>{
      try{
        const workspace=await this.workspaces.snapshot(run.projectId,run.missionId);
        return{
          run,
          live:{
            projectRevision:workspace.project.currentRevision,
            activity:workspace.activity.state,
            progressPercent:workspace.progress.percent,
            qaState:workspace.qa.state,
            finalRenderReadiness:workspace.finalRenderReadiness,
            stale:workspace.stale.plan||workspace.stale.execution||workspace.stale.qa,
          },
        };
      }catch{
        return{run,live:null,unavailable:{code:"CAMPAIGN_MISSION_WORKSPACE_UNAVAILABLE" as const,message:"Current Mission workspace state is unavailable." as const}};
      }
    }));
    return ProductionCampaignDashboardSchema.parse({campaign,missions});
  }
}
