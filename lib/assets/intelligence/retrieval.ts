import type {Asset} from "@/schemas/asset";
import {AssetIntelligenceQuerySchema,AssetIntelligenceSearchResultSchema,type AssetIntelligenceQuery,type AssetIntelligenceRecord,type AssetIntelligenceSearchResult} from "@/lib/assets/intelligence/schema";

const tokens=(value:string)=>[...new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(token=>token.length>1))];
const normalizedTags=(values:string[])=>new Set(values.map(value=>value.toLocaleLowerCase()));
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function rankAssetIntelligence(
  records:readonly AssetIntelligenceRecord[],
  assets:readonly Asset[],
  queryInput:AssetIntelligenceQuery,
):AssetIntelligenceSearchResult[]{
  const query=AssetIntelligenceQuerySchema.parse(queryInput);
  const assetById=new Map(assets.map(asset=>[asset.id,asset]));
  const queryTerms=tokens([query.query,query.sceneSemanticType].filter(Boolean).join(" "));
  const required=query.requiredTags.map(tag=>tag.toLocaleLowerCase());

  const ranked=records.flatMap(record=>{
    const asset=assetById.get(record.assetId);
    if(!asset)return[];
    const tagSet=normalizedTags(record.tags);
    if(required.some(tag=>!tagSet.has(tag)))return[];

    const documentTerms=new Set(tokens([record.summary,record.tags.join(" "),asset.label??"",asset.kind].join(" ")));
    const semanticHits=queryTerms.filter(term=>documentTerms.has(term)).length;
    const tagHits=queryTerms.filter(term=>tagSet.has(term)).length;
    const overlap=queryTerms.length?semanticHits/queryTerms.length:0;
    const tagOverlap=queryTerms.length?tagHits/queryTerms.length:0;
    const preferredKind=query.preferredKinds.includes(asset.kind)?0.2:0;
    const score=clamp01((queryTerms.length?0:0.2)+overlap*0.6+tagOverlap*0.2+preferredKind);
    const usableRanges=[...record.usableRanges]
      .sort((a,b)=>(b.confidence??0)-(a.confidence??0)||a.startFrame-b.startFrame||a.endFrame-b.endFrame)
      .slice(0,8);

    return[AssetIntelligenceSearchResultSchema.parse({
      assetId:record.assetId,
      kind:asset.kind,
      ...(asset.label?{label:asset.label}:{}),
      score,
      summary:record.summary,
      tags:record.tags,
      usableRanges,
      analyzer:record.analyzer,
      generatedAt:record.generatedAt,
    })];
  });

  return ranked
    .sort((a,b)=>b.score-a.score||a.assetId.localeCompare(b.assetId))
    .slice(0,query.maxResults);
}
