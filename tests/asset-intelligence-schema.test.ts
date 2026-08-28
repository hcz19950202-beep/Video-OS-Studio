import {describe,expect,it} from "vitest";
import {AssetIntelligenceAssetIdSchema,AssetIntelligenceDraftSchema,AssetIntelligenceRecordSchema,AssetIntelligenceSearchResultSchema,AssetIntelligenceTagSchema} from "@/lib/assets/intelligence/schema";

const recordFixture=()=>({
  version:1 as const,
  projectId:"project-1",
  assetId:"asset:hero",
  sourceFingerprint:"a".repeat(64),
  sourceFingerprintScope:"project-asset-descriptor-v1" as const,
  sourceProjectRevision:4,
  analyzer:{id:"deterministic-media-metadata",version:"1",mode:"deterministic" as const},
  summary:"Portrait talking head with construction proof.",
  tags:["video","portrait","proof"],
  usableRanges:[],
  generatedAt:"2026-08-28T12:00:00.000Z",
});

describe("Asset Intelligence schemas",()=>{
  it("accepts logical Asset IDs but rejects path-shaped IDs",()=>{
    expect(AssetIntelligenceAssetIdSchema.parse("asset:hero")).toBe("asset:hero");
    expect(()=>AssetIntelligenceAssetIdSchema.parse("input/hero.mp4")).toThrow("logical asset IDs");
    expect(()=>AssetIntelligenceAssetIdSchema.parse("E:\\media\\hero.mp4")).toThrow("logical asset IDs");
  });

  it("rejects filesystem paths and media filenames in normalized analyzer text",()=>{
    expect(()=>AssetIntelligenceDraftSchema.parse({summary:"Use E:\\Video-OS-Studio\\private\\hero.mp4",tags:[],usableRanges:[]})).toThrow("filesystem paths or media filenames");
    expect(()=>AssetIntelligenceDraftSchema.parse({summary:"Use the proof shot.",tags:[],usableRanges:[{startFrame:0,endFrame:30,summary:"From input/hero.mp4",tags:[]}]})).toThrow("filesystem paths or media filenames");
    expect(()=>AssetIntelligenceTagSchema.parse("customer-secret.mov")).toThrow("filesystem paths or media filenames");
  });

  it("accepts ordinary production language that contains no source identifiers",()=>{
    expect(()=>AssetIntelligenceDraftSchema.parse({summary:"Use a portrait speaker, construction proof, and a direct call to action.",tags:["portrait","proof"],usableRanges:[{startFrame:0,endFrame:30,summary:"Strong opening proof moment.",tags:["hook"],confidence:0.9}]})).not.toThrow();
  });

  it("requires an explicit descriptor fingerprint scope",()=>{
    expect(AssetIntelligenceRecordSchema.parse(recordFixture())).toMatchObject({sourceFingerprintScope:"project-asset-descriptor-v1"});
    const withoutScope={...recordFixture(),sourceFingerprintScope:undefined};
    expect(()=>AssetIntelligenceRecordSchema.parse(withoutScope)).toThrow();
  });

  it("rejects unsafe labels at the Agent-facing search-result boundary",()=>{
    const record=recordFixture();
    expect(()=>AssetIntelligenceSearchResultSchema.parse({assetId:record.assetId,kind:"video",label:"customer-secret.mov",score:0.8,summary:record.summary,tags:record.tags,usableRanges:[],analyzer:record.analyzer,generatedAt:record.generatedAt})).toThrow("filesystem paths or media filenames");
  });
});
