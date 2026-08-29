import {CreateProductionCampaignInputSchema} from "@/lib/production/campaign/schema";
import {productionCampaignErrorResponse} from "@/lib/production/campaign/http";
import {productionCampaignService} from "@/lib/server/campaign-runtime";

export const runtime="nodejs";

export async function GET(){
  try{return Response.json({campaigns:await productionCampaignService.list()});}
  catch(error){return productionCampaignErrorResponse(error);}
}

export async function POST(request:Request){
  try{
    const input=CreateProductionCampaignInputSchema.parse(await request.json());
    const campaign=await productionCampaignService.create(input);
    return Response.json({campaign},{status:201});
  }catch(error){return productionCampaignErrorResponse(error);}
}
