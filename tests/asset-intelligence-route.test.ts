import {beforeEach,describe,expect,it,vi} from "vitest";
import {AssetIntelligenceAssetNotFoundError,AssetIntelligenceNotFoundError,AssetIntelligenceStaleError} from "@/lib/assets/intelligence/errors";

const fakes=vi.hoisted(()=>({
  assetIntelligenceService:{
    analyzeAsset:vi.fn(),
    inspectFreshness:vi.fn(),
  },
}));

vi.mock("@/lib/server/runtime",()=>fakes);

import * as route from "@/app/api/projects/[projectId]/assets/[assetId]/intelligence/route";

const context={params:Promise.resolve({projectId:"project-1",assetId:"asset:hero"})};
const record={
  version:1,
  projectId:"project-1",
  assetId:"asset:hero",
  sourceFingerprint:"a".repeat(64),
  sourceFingerprintScope:"project-asset-descriptor-v1",
  sourceProjectRevision:4,
  analyzer:{id:"deterministic-media-metadata",version:"1",mode:"deterministic"},
  summary:"Portrait talking-head metadata profile.",
  tags:["video","portrait"],
  usableRanges:[],
  generatedAt:"2026-08-28T12:00:00.000Z",
};

beforeEach(()=>vi.clearAllMocks());

describe("Asset Intelligence route",()=>{
  it("runs bounded analysis for the logical Project Asset ID",async()=>{
    fakes.assetIntelligenceService.analyzeAsset.mockResolvedValue(record);
    const response=await route.POST(new Request("http://localhost/api/projects/project-1/assets/asset%3Ahero/intelligence",{method:"POST"}),context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({record});
    expect(fakes.assetIntelligenceService.analyzeAsset).toHaveBeenCalledWith("project-1","asset:hero");
  });

  it("returns freshness without exposing source paths",async()=>{
    fakes.assetIntelligenceService.inspectFreshness.mockResolvedValue({record,currentProjectRevision:5,currentFingerprint:"a".repeat(64),stale:false,reason:"fresh"});
    const response=await route.GET(new Request("http://localhost/api/projects/project-1/assets/asset%3Ahero/intelligence"),context);
    expect(response.status).toBe(200);
    const body=await response.json();
    expect(body).toMatchObject({stale:false,reason:"fresh",currentProjectRevision:5});
    expect(JSON.stringify(body)).not.toContain("relativePath");
    expect(JSON.stringify(body)).not.toContain("originalName");
  });

  it.each([
    [new AssetIntelligenceAssetNotFoundError("project-1","asset:hero"),404],
    [new AssetIntelligenceNotFoundError("project-1","asset:hero"),404],
    [new AssetIntelligenceStaleError("project-1","asset:hero","source-changed"),409],
  ])("normalizes known failures without internal details",async(error,status)=>{
    fakes.assetIntelligenceService.analyzeAsset.mockRejectedValue(error);
    const response=await route.POST(new Request("http://localhost/api/projects/project-1/assets/asset%3Ahero/intelligence",{method:"POST"}),context);
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain("/data/");
  });

  it("sanitizes unexpected runtime failures containing a Windows path",async()=>{
    fakes.assetIntelligenceService.analyzeAsset.mockRejectedValue(new Error("failed at E:\\Video-OS-Studio\\private\\hero.mp4"));
    const response=await route.POST(new Request("http://localhost/api/projects/project-1/assets/asset%3Ahero/intelligence",{method:"POST"}),context);
    expect(response.status).toBe(500);
    const body=await response.json();
    expect(body).toMatchObject({retryable:true});
    expect(JSON.stringify(body)).not.toContain("E:\\Video-OS-Studio");
    expect(JSON.stringify(body)).not.toContain("hero.mp4");
  });
});
