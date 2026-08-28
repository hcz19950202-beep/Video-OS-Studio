import {describe,expect,it} from "vitest";
import {rankAssetIntelligence} from "@/lib/assets/intelligence/retrieval";
import {AssetIntelligenceRecordSchema,type AssetIntelligenceRecord} from "@/lib/assets/intelligence/schema";
import type {Asset} from "@/schemas/asset";

const record=(assetId:string,summary:string,tags:string[],generatedAt="2026-08-28T12:00:00.000Z"):AssetIntelligenceRecord=>AssetIntelligenceRecordSchema.parse({
  version:1,projectId:"project-1",assetId,sourceFingerprint:"a".repeat(64),sourceProjectRevision:1,
  analyzer:{id:"deterministic-media-metadata",version:"1",mode:"deterministic"},summary,tags,usableRanges:[],generatedAt,
});

const assets:Asset[]=[
  {id:"asset-portrait",kind:"video",relativePath:"input/private-portrait.mp4",originalName:"customer-secret.mov",label:"Portrait speaker",width:1080,height:1920,hasAudio:true},
  {id:"asset-proof",kind:"image",relativePath:"input/private-proof.png",originalName:"factory-price.png",label:"Factory proof",width:1600,height:900},
  {id:"asset-audio",kind:"audio",relativePath:"input/private-voice.wav",originalName:"voice.wav",label:"Voice over",hasAudio:true},
];

const records=[
  record("asset-portrait","Portrait talking head with audio.",["video","portrait","has-audio"]),
  record("asset-proof","Factory construction proof image.",["image","proof","factory"]),
  record("asset-audio","Narration audio source.",["audio","voice","has-audio"]),
];

describe("rankAssetIntelligence",()=>{
  it("ranks semantic/tag matches deterministically",()=>{
    const result=rankAssetIntelligence(records,assets,{query:"factory proof",requiredTags:[],preferredKinds:[],maxResults:8});
    expect(result[0]).toMatchObject({assetId:"asset-proof",kind:"image"});
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("uses required tags as a hard filter and preferred kinds as a bounded ranking signal",()=>{
    const filtered=rankAssetIntelligence(records,assets,{query:"audio",requiredTags:["has-audio"],preferredKinds:["audio"],maxResults:8});
    expect(filtered.map(item=>item.assetId)).toEqual(["asset-audio","asset-portrait"]);
  });

  it("returns only bounded logical metadata and never source paths/original filenames",()=>{
    const result=rankAssetIntelligence(records,assets,{query:"portrait",requiredTags:[],preferredKinds:["video"],maxResults:1});
    expect(result).toHaveLength(1);
    const serialized=JSON.stringify(result);
    expect(serialized).not.toContain("relativePath");
    expect(serialized).not.toContain("originalName");
    expect(serialized).not.toContain("private-portrait.mp4");
    expect(serialized).not.toContain("customer-secret.mov");
  });

  it("uses stable Asset ID tie-breaking when scores are equal",()=>{
    const same=[record("asset-b","Same summary.",["video"]),record("asset-a","Same summary.",["video"])];
    const sameAssets:Asset[]=[
      {id:"asset-b",kind:"video",relativePath:"input/b.mp4"},
      {id:"asset-a",kind:"video",relativePath:"input/a.mp4"},
    ];
    expect(rankAssetIntelligence(same,sameAssets,{requiredTags:[],preferredKinds:[],maxResults:8}).map(item=>item.assetId)).toEqual(["asset-a","asset-b"]);
  });
});
