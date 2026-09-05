import {resolve} from "node:path";
import {expect,test} from "@playwright/test";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {CreativeAssetRepository} from "@/lib/creative-assets/repository";
import {
  CreativeAssetArtifactSchema,
  CreativeAssetSchema,
  CreativeAssetVersionSchema,
} from "@/lib/creative-assets/schema";

const createdAt="2026-09-05T00:00:00.000Z";
const hashA="a".repeat(64);
const hashB="b".repeat(64);
const dataRoot=resolve(process.env.VIDEO_OS_DATA_ROOT??".video-os-data");
const repository=new CreativeAssetRepository(new NodeFileSystemAdapter(),dataRoot,()=>createdAt);

const readyArtifact=(assetId:string,versionId:string,id:string)=>CreativeAssetArtifactSchema.parse({
  id,
  creativeAssetId:assetId,
  versionId,
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
  relativePath:`render/${id}.webm`,
  fingerprint:hashB,
  fingerprintScope:"creative-asset-render-v1",
  createdAt,
  readyAt:createdAt,
});

const acceptedVersion=(assetId:string,versionId:string,text:string)=>CreativeAssetVersionSchema.parse({
  id:versionId,
  creativeAssetId:assetId,
  engine:"hyperframes",
  engineVersion:"0.8.10",
  state:"READY",
  lineage:{origin:"created"},
  sourcePackage:{
    id:`source-${assetId}`,
    creativeAssetId:assetId,
    versionId,
    engine:"hyperframes",
    format:"hyperframes-html",
    rootPath:`source/${assetId}`,
    entrypoint:`source/${assetId}/index.html`,
    fingerprint:hashA,
    createdAt,
  },
  parameterValues:{text},
  artifacts:[readyArtifact(assetId,versionId,`${assetId}-final`)],
  versionFingerprint:hashB,
  createdAt,
  acceptedAt:createdAt,
});

const ensureAsset=async(
  id:string,
  input:{name:string;kind:"motion_graphic"|"brand_element";tags:string[];searchText:string;text:string},
)=>{
  if(await repository.getAsset(id))return;
  const versionId="version-1";
  await repository.createAsset(
    CreativeAssetSchema.parse({
      id,
      name:input.name,
      kind:input.kind,
      engine:"hyperframes",
      editable:true,
      tags:input.tags,
      searchText:input.searchText,
      lifecycle:"active",
      latestVersionId:versionId,
      recommendedVersionId:versionId,
      createdAt,
      updatedAt:createdAt,
    }),
    [acceptedVersion(id,versionId,input.text)],
  );
};

test.beforeAll(async()=>{
  await ensureAsset("c2-price-highlight",{
    name:"C2 Price Highlight",
    kind:"motion_graphic",
    tags:["price","cta"],
    searchText:"price offer conversion",
    text:"$49,900",
  });
  await ensureAsset("c2-brand-mark",{
    name:"C2 Brand Mark",
    kind:"brand_element",
    tags:["brand"],
    searchText:"identity logo brand",
    text:"VIDEO OS",
  });
});

test("V2.6 C2 browses, searches and inspects Creative Assets without exposing storage paths",async({page})=>{
  await page.setViewportSize({width:1600,height:1000});
  await page.addInitScript(()=>{
    localStorage.setItem("video-os-studio-locale","en-US");
    localStorage.setItem("video-os-studio-theme","dark");
  });

  await page.goto("/");
  await page.getByRole("button",{name:"Library",exact:true}).click();
  const library=page.getByTestId("creative-asset-library");
  await expect(library).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();

  const apiResponse=await page.request.get("/api/creative-assets?q=conversion");
  expect(apiResponse.ok()).toBeTruthy();
  expect(apiResponse.headers()["cache-control"]).toBe("no-store");
  const apiBody=await apiResponse.json();
  expect(apiBody.items.map((item:{id:string})=>item.id)).toEqual(["c2-price-highlight"]);
  const serialized=JSON.stringify(apiBody);
  for(const forbidden of [
    dataRoot,
    "rootPath",
    "entrypoint",
    "relativePath",
    "sourceFingerprint",
    `source/c2-price-highlight`,
    `render/c2-price-highlight-final.webm`,
  ])expect(serialized).not.toContain(forbidden);

  const search=page.getByLabel("Search creative assets");
  await search.fill("conversion");
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toHaveCount(0);
  await search.fill("");
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();

  await page.getByLabel("Asset kind").selectOption("brand_element");
  await expect(page.getByTestId("creative-asset-card-c2-brand-mark")).toBeVisible();
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toHaveCount(0);
  await page.getByLabel("Asset kind").selectOption("");
  await expect(page.getByTestId("creative-asset-card-c2-price-highlight")).toBeVisible();

  await page.getByTestId("creative-asset-card-c2-price-highlight").click();
  const detail=page.getByTestId("creative-asset-detail");
  await expect(detail).toContainText("C2 Price Highlight");
  await expect(detail).toContainText("1920×1080");
  await expect(detail).toContainText("30 fps");
  await expect(detail).toContainText("90f");
  await expect(page.getByTestId("creative-asset-parameters")).toContainText("$49,900");
  await expect(page.getByRole("button",{name:/Add to Timeline/})).toBeDisabled();
  await expect(page.getByRole("button",{name:/Duplicate & Edit/})).toBeDisabled();
});
