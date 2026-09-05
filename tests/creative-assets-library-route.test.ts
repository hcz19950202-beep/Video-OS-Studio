import {beforeEach,describe,expect,it,vi} from "vitest";
import {CreativeAssetManifestSchema,type CreativeAssetManifest} from "@/lib/creative-assets/schema";

const repositoryMocks=vi.hoisted(()=>({
  listAssets:vi.fn(),
  searchAssets:vi.fn(),
  getManifest:vi.fn(),
}));

vi.mock("@/lib/server/creative-asset-runtime",()=>({
  creativeAssetRepository:repositoryMocks,
}));

import {GET} from "@/app/api/creative-assets/route";

const createdAt="2026-09-05T00:00:00.000Z";
const hashA="a".repeat(64);
const hashB="b".repeat(64);

const manifestFixture=(
  id:string,
  overrides:Partial<CreativeAssetManifest["asset"]>={},
):CreativeAssetManifest=>CreativeAssetManifestSchema.parse({
  schemaVersion:1,
  asset:{
    id,
    name:`Creative ${id}`,
    kind:"motion_graphic",
    engine:"hyperframes",
    editable:true,
    tags:["price","cta"],
    searchText:"price offer conversion",
    lifecycle:"active",
    latestVersionId:"version-1",
    recommendedVersionId:"version-1",
    createdAt,
    updatedAt:createdAt,
    ...overrides,
  },
  versions:[{
    id:"version-1",
    creativeAssetId:id,
    engine:"hyperframes",
    engineVersion:"0.8.10",
    state:"READY",
    lineage:{origin:"created"},
    sourcePackage:{
      id:"source-1",
      creativeAssetId:id,
      versionId:"version-1",
      engine:"hyperframes",
      format:"hyperframes-html",
      rootPath:`source/${id}`,
      entrypoint:`source/${id}/index.html`,
      fingerprint:hashA,
      createdAt,
    },
    parameterValues:{text:"$49,900"},
    artifacts:[{
      id:"artifact-final",
      creativeAssetId:id,
      versionId:"version-1",
      role:"final",
      state:"ready",
      profile:{id:"final-1080p",width:1920,height:1080,fps:30,durationInFrames:90,codec:"vp9",container:"webm"},
      engine:"hyperframes",
      engineVersion:"0.8.10",
      sourceFingerprint:hashA,
      relativePath:`render/${id}.webm`,
      fingerprint:hashB,
      fingerprintScope:"creative-asset-render-v1",
      createdAt,
      readyAt:createdAt,
    }],
    versionFingerprint:hashB,
    createdAt,
    acceptedAt:createdAt,
  }],
});

const price=manifestFixture("asset-price");
const brand=manifestFixture("asset-brand",{
  name:"Brand Mark",
  kind:"brand_element",
  tags:["brand"],
  searchText:"identity logo brand",
});

beforeEach(()=>{
  vi.clearAllMocks();
  repositoryMocks.listAssets.mockResolvedValue([price.asset,brand.asset]);
  repositoryMocks.searchAssets.mockResolvedValue([price.asset]);
  repositoryMocks.getManifest.mockImplementation(async(id:string)=>{
    if(id===price.asset.id)return price;
    if(id===brand.asset.id)return brand;
    return null;
  });
});

describe("V2.6 C2 Creative Asset Library route",()=>{
  it("uses repository search, applies secondary filters and returns no-store browser-safe DTOs",async()=>{
    const response=await GET(new Request("http://localhost/api/creative-assets?q=conversion&kind=motion_graphic&tag=CTA"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(repositoryMocks.searchAssets).toHaveBeenCalledWith("conversion",{includeArchived:false});
    const body=await response.json();
    expect(body.items.map((item:{id:string})=>item.id)).toEqual(["asset-price"]);
    const serialized=JSON.stringify(body);
    for(const forbidden of ["rootPath","entrypoint","relativePath","sourceFingerprint","source/asset-price","render/asset-price.webm",hashA,hashB])expect(serialized).not.toContain(forbidden);
  });

  it("lists archived assets only when explicitly requested and normalizes bounded filters",async()=>{
    const response=await GET(new Request("http://localhost/api/creative-assets?includeArchived=true&kind=%20BRAND_ELEMENT%20&tag=%20brand%20"));
    expect(response.status).toBe(200);
    expect(repositoryMocks.listAssets).toHaveBeenCalledWith({includeArchived:true});
    const body=await response.json();
    expect(body.items.map((item:{id:string})=>item.id)).toEqual(["asset-brand"]);
  });

  it("returns a stable path-safe retryable 500 contract when repository access fails",async()=>{
    repositoryMocks.listAssets.mockRejectedValueOnce(new Error("C:\\Users\\private\\creative-assets\\manifest.json unavailable"));
    const response=await GET(new Request("http://localhost/api/creative-assets"));
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body=await response.json();
    expect(body).toMatchObject({
      error:"creative_asset_library_unavailable",
      message:"Creative Asset Library is unavailable.",
      retryable:true,
    });
    expect(JSON.stringify(body)).not.toContain("C:\\Users\\private");
  });
});
