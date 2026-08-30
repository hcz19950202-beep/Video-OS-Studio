import {notFound} from "next/navigation";
import {CampaignDashboardClient} from "@/components/campaign/CampaignDashboardClient";
import {ProductionCampaignNotFoundError} from "@/lib/production/campaign/errors";
import {parseProductionCampaignId} from "@/lib/production/campaign/http";
import {productionCampaignDashboardService} from "@/lib/server/campaign-runtime";
import type {ProductionCampaignDashboard} from "@/lib/production/campaign/dashboard";

export const dynamic="force-dynamic";

type Props={params:Promise<{campaignId:string}>};

export default async function CampaignPage({params}:Props){
  let dashboard:ProductionCampaignDashboard;
  try{
    const campaignId=parseProductionCampaignId((await params).campaignId);
    dashboard=await productionCampaignDashboardService.snapshot(campaignId);
  }catch(error){
    if(error instanceof ProductionCampaignNotFoundError)notFound();
    throw error;
  }
  return <CampaignDashboardClient initialDashboard={dashboard}/>;
}
