import {notFound} from "next/navigation";
import {CampaignDashboardClient} from "@/components/campaign/CampaignDashboardClient";
import {ProductionCampaignNotFoundError} from "@/lib/production/campaign/errors";
import {parseProductionCampaignId} from "@/lib/production/campaign/http";
import {productionCampaignDashboardService} from "@/lib/server/campaign-runtime";

export const dynamic="force-dynamic";

type Props={params:Promise<{campaignId:string}>};

export default async function CampaignPage({params}:Props){
  try{
    const campaignId=parseProductionCampaignId((await params).campaignId);
    const dashboard=await productionCampaignDashboardService.snapshot(campaignId);
    return <CampaignDashboardClient initialDashboard={dashboard}/>;
  }catch(error){
    if(error instanceof ProductionCampaignNotFoundError)notFound();
    throw error;
  }
}
