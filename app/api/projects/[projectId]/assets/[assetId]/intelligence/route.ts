import {AssetIntelligenceAssetNotFoundError,AssetIntelligenceNotFoundError,AssetIntelligenceStaleError} from "@/lib/assets/intelligence/errors";
import {assetIntelligenceService} from "@/lib/server/runtime";

export const runtime="nodejs";
type Context={params:Promise<{projectId:string;assetId:string}>};

const errorResponse=(error:unknown)=>{
  if(error instanceof AssetIntelligenceAssetNotFoundError||error instanceof AssetIntelligenceNotFoundError)return Response.json({error:"Asset intelligence is not available for this logical asset ID.",retryable:false},{status:404});
  if(error instanceof AssetIntelligenceStaleError)return Response.json({error:"Asset intelligence became stale because the source asset changed. Analyze the asset again.",retryable:true},{status:409});
  return Response.json({error:"Asset intelligence operation failed without exposing internal runtime details.",retryable:true},{status:500});
};

export async function GET(_request:Request,{params}:Context){
  try{
    const{projectId,assetId}=await params;
    return Response.json(await assetIntelligenceService.inspectFreshness(projectId,assetId));
  }catch(error){return errorResponse(error);}
}

export async function POST(_request:Request,{params}:Context){
  try{
    const{projectId,assetId}=await params;
    return Response.json({record:await assetIntelligenceService.analyzeAsset(projectId,assetId)});
  }catch(error){return errorResponse(error);}
}
