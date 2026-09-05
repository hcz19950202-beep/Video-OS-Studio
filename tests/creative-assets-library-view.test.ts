import {describe,expect,it} from "vitest";
import {CreativeAssetManifestSchema,type CreativeAssetManifest} from "@/lib/creative-assets/schema";
import {
  buildCreativeAssetLibraryResponse,
  filterCreativeAssetLibraryManifests,
  toCreativeAssetLibraryItem,
} from "@/lib/creative-assets/library-view";

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
      rootPath:"source/private-composition",
      entrypoint:"source/private-composition/index.html",
      fingerprint:hashA,
      createdAt,
    },
    parameterValues:{text:"$49,900",scale:1.2},
    artifacts:[{
      id:"artifact-final",
      creativeAssetId:id,
      versionId:"version-1",
      role:"final",
      state:"ready",
      profile:{
        id:"final-1080p",
        width:1920,
        height:1080,
        fps:30,
        durationInFrames:90,
        codec:"vp9",
        container:"webm",
      },
      engine:"hyperframes",
      engineVersion:"0.8.10",
      sourceFingerprint:hashA,
      relativePath:"render/private-final.webm",
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

describe("V2.6 C2 Creative Asset Library view",()=>{
  it("projects manifests into browser-safe metadata without filesystem or fingerprint fields",()=>{
    const item=toCreativeAssetLibraryItem(manifestFixture("asset-price"));
    const serialized=JSON.stringify(item);

    expect(item.versions[0]?.parameterValues).toEqual({text:"$49,900",scale:1.2});
    expect(item.versions[0]?.artifacts[0]?.profile).toMatchObject({
      width:1920,
      height:1080,
      fps:30,
      durationInFrames:90,
    });
    for(const forbidden of [
      "rootPath",
      "entrypoint",
      "relativePath",
      "fingerprint",
      "sourceFingerprint",
      "source/private-composition",
      "render/private-final.webm",
      hashA,
      hashB,
    ])expect(serialized).not.toContain(forbidden);
  });

  it("filters kind and tag case-insensitively while keeping archived policy in the repository layer",()=>{
    const price=manifestFixture("asset-price");
    const brand=manifestFixture("asset-brand",{
      name:"Brand Mark",
      kind:"brand_element",
      tags:["Brand"],
      searchText:"identity mark",
    });
    const manifests=[price,brand];

    expect(filterCreativeAssetLibraryManifests(manifests,{kind:" BRAND_ELEMENT "}).map(item=>item.asset.id)).toEqual(["asset-brand"]);
    expect(filterCreativeAssetLibraryManifests(manifests,{tag:" brand "}).map(item=>item.asset.id)).toEqual(["asset-brand"]);
    expect(filterCreativeAssetLibraryManifests(manifests,{kind:"motion_graphic",tag:"CTA"}).map(item=>item.asset.id)).toEqual(["asset-price"]);
  });

  it("builds deterministic filters and exposes staged C5/C7 actions as disabled",()=>{
    const response=buildCreativeAssetLibraryResponse([
      manifestFixture("asset-price"),
      manifestFixture("asset-brand",{
        name:"Brand Mark",
        kind:"brand_element",
        tags:["brand","cta"],
        searchText:"identity mark",
      }),
    ]);

    expect(response.filters.kinds).toEqual(["brand_element","motion_graphic"]);
    expect(response.filters.tags).toEqual(["brand","cta","price"]);
    expect(response.items[0]?.actions.addToTimeline).toMatchObject({enabled:false,availableIn:"C5"});
    expect(response.items[0]?.actions.duplicateAndEdit).toMatchObject({enabled:false,availableIn:"C7"});
  });
});
