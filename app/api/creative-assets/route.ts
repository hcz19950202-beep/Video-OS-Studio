import {
  buildCreativeAssetLibraryResponse,
  filterCreativeAssetLibraryManifests,
} from "@/lib/creative-assets/library-view";
import {creativeAssetRepository} from "@/lib/server/creative-asset-runtime";

export const runtime="nodejs";

const normalizedParam=(value:string|null,maxLength:number)=>{
  const normalized=value?.normalize("NFKC").trim();
  if(!normalized)return undefined;
  return normalized.slice(0,maxLength);
};

export async function GET(request:Request){
  try{
    const url=new URL(request.url);
    const query=normalizedParam(url.searchParams.get("q"),200)??"";
    const kind=normalizedParam(url.searchParams.get("kind"),80);
    const tag=normalizedParam(url.searchParams.get("tag"),80);
    const includeArchived=url.searchParams.get("includeArchived")==="true";
    const assets=query
      ?await creativeAssetRepository.searchAssets(query,{includeArchived})
      :await creativeAssetRepository.listAssets({includeArchived});
    const manifests=(await Promise.all(assets.map(asset=>creativeAssetRepository.getManifest(asset.id))))
      .filter(manifest=>manifest!==null);
    const filtered=filterCreativeAssetLibraryManifests(manifests,{kind,tag});
    return Response.json(buildCreativeAssetLibraryResponse(filtered),{
      headers:{"Cache-Control":"no-store"},
    });
  }catch{
    return Response.json(
      {
        error:"creative_asset_library_unavailable",
        message:"Creative Asset Library is unavailable.",
        retryable:true,
      },
      {status:500,headers:{"Cache-Control":"no-store"}},
    );
  }
}
