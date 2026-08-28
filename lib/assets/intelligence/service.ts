import {createHash} from "node:crypto";
import type {Asset} from "@/schemas/asset";
import type {Project} from "@/schemas/project";
import {AssetIntelligenceAssetNotFoundError,AssetIntelligenceStaleError} from "@/lib/assets/intelligence/errors";
import {AssetIntelligenceRepository} from "@/lib/assets/intelligence/repository";
import {AssetIntelligenceAnalyzerInputSchema,AssetIntelligenceDraftSchema,AssetIntelligenceQuerySchema,AssetIntelligenceRecordSchema,AssetIntelligenceSafeLabelSchema,type AssetIntelligenceAnalyzerDescriptor,type AssetIntelligenceAnalyzerInput,type AssetIntelligenceDraft,type AssetIntelligenceQuery,type AssetIntelligenceRecord,type AssetIntelligenceSearchResult} from "@/lib/assets/intelligence/schema";
import {rankAssetIntelligence} from "@/lib/assets/intelligence/retrieval";

export interface AssetIntelligenceProjectReader{
  load(projectId:string):Promise<Project>;
}

export interface AssetIntelligenceAnalyzer{
  readonly descriptor:AssetIntelligenceAnalyzerDescriptor;
  analyze(input:AssetIntelligenceAnalyzerInput):AssetIntelligenceDraft|Promise<AssetIntelligenceDraft>;
}

export interface AssetIntelligenceServiceOptions{
  now?:()=>string;
}

const canonicalAssetDescriptor=(asset:Asset)=>({
  id:asset.id,
  kind:asset.kind,
  relativePath:asset.relativePath,
  originalRelativePath:asset.originalRelativePath??null,
  mimeType:asset.mimeType??null,
  originalMimeType:asset.originalMimeType??null,
  durationInFrames:asset.durationInFrames??null,
  width:asset.width??null,
  height:asset.height??null,
  sourceFps:asset.sourceFps??null,
  hasAudio:asset.hasAudio??null,
  sizeBytes:asset.sizeBytes??null,
});

export const fingerprintProjectAsset=(asset:Asset)=>createHash("sha256").update(JSON.stringify(canonicalAssetDescriptor(asset))).digest("hex");

const safeAssetLabel=(asset:Asset)=>{
  if(!asset.label)return undefined;
  if(asset.originalName&&asset.label.trim().toLocaleLowerCase()===asset.originalName.trim().toLocaleLowerCase())return undefined;
  const parsed=AssetIntelligenceSafeLabelSchema.safeParse(asset.label);
  return parsed.success?parsed.data:undefined;
};

const toAnalyzerInput=(project:Project,asset:Asset):AssetIntelligenceAnalyzerInput=>{
  const label=safeAssetLabel(asset);
  return AssetIntelligenceAnalyzerInputSchema.parse({
    projectId:project.project.id,
    sourceProjectRevision:project.project.revision,
    asset:{
      id:asset.id,
      kind:asset.kind,
      ...(label?{label}:{}),
      ...(asset.mimeType?{mimeType:asset.mimeType}:{}),
      ...(asset.durationInFrames?{durationInFrames:asset.durationInFrames}:{}),
      ...(asset.width?{width:asset.width}:{}),
      ...(asset.height?{height:asset.height}:{}),
      ...(asset.sourceFps?{sourceFps:asset.sourceFps}:{}),
      ...(asset.hasAudio!==undefined?{hasAudio:asset.hasAudio}:{}),
      ...(asset.sizeBytes!==undefined?{sizeBytes:asset.sizeBytes}:{}),
    },
  });
};

const unique=(values:string[])=>[...new Set(values.map(value=>value.trim().toLocaleLowerCase()).filter(Boolean))];

export class DeterministicAssetIntelligenceAnalyzer implements AssetIntelligenceAnalyzer{
  readonly descriptor={id:"deterministic-media-metadata",version:"1",mode:"deterministic" as const};

  analyze(input:AssetIntelligenceAnalyzerInput):AssetIntelligenceDraft{
    const asset=input.asset;
    const tags=[asset.kind];
    if(asset.hasAudio===true)tags.push("has-audio");
    if(asset.hasAudio===false)tags.push("silent");
    if(asset.width&&asset.height){
      if(asset.width>asset.height)tags.push("landscape");
      else if(asset.height>asset.width)tags.push("portrait");
      else tags.push("square");
    }
    if(asset.durationInFrames){
      if(asset.durationInFrames<=150)tags.push("short");
      else if(asset.durationInFrames>=900)tags.push("long");
    }
    const facts=[asset.kind];
    if(asset.width&&asset.height)facts.push(`${asset.width}x${asset.height}`);
    if(asset.hasAudio!==undefined)facts.push(asset.hasAudio?"with audio":"without audio");
    const summary=`Deterministic metadata profile: ${facts.join(", ")}.`;
    return AssetIntelligenceDraftSchema.parse({summary,tags:unique(tags),usableRanges:[]});
  }
}

export type AssetIntelligenceFreshness={
  record:AssetIntelligenceRecord;
  currentProjectRevision:number;
  currentFingerprint?:string;
  stale:boolean;
  reason:"fresh"|"missing-asset"|"source-changed";
};

export class AssetIntelligenceService{
  private readonly now:()=>string;

  constructor(
    private readonly projects:AssetIntelligenceProjectReader,
    private readonly records:AssetIntelligenceRepository,
    private readonly analyzer:AssetIntelligenceAnalyzer,
    options:AssetIntelligenceServiceOptions={},
  ){
    this.now=options.now??(()=>new Date().toISOString());
  }

  async analyzeAsset(projectId:string,assetId:string):Promise<AssetIntelligenceRecord>{
    const baseline=await this.projects.load(projectId);
    const asset=baseline.assets.find(candidate=>candidate.id===assetId);
    if(!asset)throw new AssetIntelligenceAssetNotFoundError(projectId,assetId);
    const fingerprint=fingerprintProjectAsset(asset);
    const draft=AssetIntelligenceDraftSchema.parse(await this.analyzer.analyze(toAnalyzerInput(baseline,asset)));

    const latest=await this.projects.load(projectId);
    const latestAsset=latest.assets.find(candidate=>candidate.id===assetId);
    if(!latestAsset)throw new AssetIntelligenceStaleError(projectId,assetId,"missing-asset");
    if(fingerprintProjectAsset(latestAsset)!==fingerprint)throw new AssetIntelligenceStaleError(projectId,assetId,"source-changed");

    const record=AssetIntelligenceRecordSchema.parse({
      version:1,
      projectId,
      assetId,
      sourceFingerprint:fingerprint,
      sourceProjectRevision:baseline.project.revision,
      analyzer:this.analyzer.descriptor,
      summary:draft.summary,
      tags:draft.tags,
      usableRanges:draft.usableRanges,
      generatedAt:this.now(),
    });
    return this.records.upsert(record);
  }

  async inspectFreshness(projectId:string,assetId:string):Promise<AssetIntelligenceFreshness>{
    const record=await this.records.require(projectId,assetId);
    const project=await this.projects.load(projectId);
    const asset=project.assets.find(candidate=>candidate.id===assetId);
    if(!asset)return{record,currentProjectRevision:project.project.revision,stale:true,reason:"missing-asset"};
    const currentFingerprint=fingerprintProjectAsset(asset);
    const stale=currentFingerprint!==record.sourceFingerprint;
    return{record,currentProjectRevision:project.project.revision,currentFingerprint,stale,reason:stale?"source-changed":"fresh"};
  }

  async requireFresh(projectId:string,assetId:string):Promise<AssetIntelligenceRecord>{
    const freshness=await this.inspectFreshness(projectId,assetId);
    if(freshness.stale)throw new AssetIntelligenceStaleError(projectId,assetId,freshness.reason as "missing-asset"|"source-changed");
    return freshness.record;
  }

  async search(projectId:string,queryInput:AssetIntelligenceQuery):Promise<AssetIntelligenceSearchResult[]>{
    const query=AssetIntelligenceQuerySchema.parse(queryInput);
    const project=await this.projects.load(projectId);
    const byAssetId=new Map(project.assets.map(asset=>[asset.id,asset]));
    const records=(await this.records.list(projectId)).filter(record=>{
      const asset=byAssetId.get(record.assetId);
      return asset!==undefined&&fingerprintProjectAsset(asset)===record.sourceFingerprint;
    });
    return rankAssetIntelligence(records,project.assets,query);
  }
}
