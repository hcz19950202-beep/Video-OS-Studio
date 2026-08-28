export class AssetIntelligenceNotFoundError extends Error{
  constructor(readonly projectId:string,readonly assetId:string){
    super(`Asset Intelligence not found for ${projectId}/${assetId}.`);
    this.name="AssetIntelligenceNotFoundError";
  }
}

export class AssetIntelligenceAssetNotFoundError extends Error{
  constructor(readonly projectId:string,readonly assetId:string){
    super(`Project asset ${assetId} was not found in Project ${projectId}.`);
    this.name="AssetIntelligenceAssetNotFoundError";
  }
}

export class AssetIntelligenceStaleError extends Error{
  constructor(readonly projectId:string,readonly assetId:string,readonly reason:"missing-asset"|"source-changed"){
    super(`Asset Intelligence for ${projectId}/${assetId} is stale: ${reason}.`);
    this.name="AssetIntelligenceStaleError";
  }
}
