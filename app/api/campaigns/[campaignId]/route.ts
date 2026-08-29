import {
  parseProductionCampaignId,
  ProductionCampaignActionRequestSchema,
  productionCampaignErrorResponse,
} from "@/lib/production/campaign/http";
import {
  productionCampaignDashboardService,
  productionCampaignService,
} from "@/lib/server/campaign-runtime";
import {
  getServerCampaignRunner,
  serverCampaignCancellationRunner,
} from "@/lib/server/campaign-execution-runtime";

export const runtime="nodejs";
type Context={params:Promise<{campaignId:string}>};

const id=async(params:Context["params"])=>parseProductionCampaignId((await params).campaignId);

export async function GET(_request:Request,{params}:Context){
  try{return Response.json({dashboard:await productionCampaignDashboardService.snapshot(await id(params))});}
  catch(error){return productionCampaignErrorResponse(error);}
}

export async function POST(request:Request,{params}:Context){
  try{
    const campaignId=await id(params);
    const action=ProductionCampaignActionRequestSchema.parse(await request.json());
    if(action.action==="enqueue")await productionCampaignService.enqueue(campaignId);
    else if(action.action==="resume")await productionCampaignService.resume(campaignId);
    else if(action.action==="retry-failed")await productionCampaignService.retryFailed(campaignId);
    else if(action.action==="archive")await productionCampaignService.archive(campaignId);
    else if(action.action==="cancel-mission")await serverCampaignCancellationRunner.cancelMission(campaignId,{
      projectId:action.projectId,
      missionId:action.missionId,
    });
    else await getServerCampaignRunner().run(campaignId);
    return Response.json({dashboard:await productionCampaignDashboardService.snapshot(campaignId)});
  }catch(error){return productionCampaignErrorResponse(error);}
}
