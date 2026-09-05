import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter,NodeFileSystemAdapter} from "@/adapters/filesystem";
import {
  CreativeAssetArtifactSchema,
  CreativeAssetSchema,
  CreativeAssetVersionSchema,
  type CreativeAssetVersion,
} from "@/lib/creative-assets/schema";
import {
  CreativeAssetRepository,
  CreativeAssetRepositoryError,
  creativeAssetRepositoryPaths,
} from "@/lib/creative-assets/repository";

const createdAt="2026-09-05T00:00:00.000Z";
const changedAt="2026-09-05T01:00:00.000Z";
const hashA="a".repeat(64);
const hashB="b".repeat(64);
const hashC="c".repeat(64);
const memoryKey=(path:string)=>path.replaceAll("\\","/");

const readyArtifact=(assetId:string,versionId:string,id="artifact-final")=>
  CreativeAssetArtifactSchema.parse({
    id,
    creativeAssetId:assetId,
    versionId,
    role:"final",
    state:"ready",
    profile:{id:"final-1080p",width:1920,height:1080,fps:30,durationInFrames:90,codec:"vp9",container:"webm"},
    engine:"hyperframes",
    engineVersion:"1.2.3",
    sourceFingerprint:hashA,
    relativePath:`render/${id}.webm`,
    fingerprint:hashB,
    fingerprintScope:"creative-asset-render-v1",
    createdAt,
    readyAt:createdAt,
  });

const acceptedVersion=(assetId:string,id="version-1")=>
  CreativeAssetVersionSchema.parse({
    id,
    creativeAssetId:assetId,
    engine:"hyperframes",
    engineVersion:"1.2.3",
    state:"READY",
    lineage:{origin:"created"},
    parameterValues:{text:"$49,900"},
    artifacts:[readyArtifact(assetId,id)],
    versionFingerprint:hashB,
    createdAt,
    acceptedAt:createdAt,
  });

const assetFixture=(id:string,versionId="version-1")=>
  CreativeAssetSchema.parse({
    id,
    name:`Price Highlight ${id}`,
    kind:"motion_graphic",
    engine:"hyperframes",
    editable:true,
    tags:["price","cta"],
    searchText:"price offer conversion",
    lifecycle:"active",
    latestVersionId:versionId,
    recommendedVersionId:versionId,
    createdAt,
    updatedAt:createdAt,
  });

const childDraft=(assetId:string,id:string,parentVersionId="version-1")=>
  CreativeAssetVersionSchema.parse({
    id,
    creativeAssetId:assetId,
    engine:"hyperframes",
    engineVersion:"1.2.3",
    state:"DRAFT",
    lineage:{origin:"cloned",parentVersionId},
    parameterValues:{text:`draft-${id}`},
    artifacts:[],
    createdAt:changedAt,
  });

const prepareAcceptableVersion=async(
  repository:CreativeAssetRepository,
  assetId:string,
  versionId="version-2",
):Promise<CreativeAssetVersion>=>{
  const draft=await repository.createDraftChildVersion(assetId,childDraft(assetId,versionId));
  await repository.updateMutableVersion(assetId,{...draft,state:"FINAL_RENDERING"});
  return repository.attachArtifactMetadata(assetId,versionId,readyArtifact(assetId,versionId,`${versionId}-final`));
};

const tempRoots:string[]=[];
afterEach(async()=>{
  await Promise.all(tempRoots.splice(0).map(path=>rm(path,{recursive:true,force:true})));
});

describe("V2.6 C1 durable Creative Asset repository",()=>{
  it("creates, reads and restarts from durable manifest truth",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const first=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await first.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await first.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"));

    const restarted=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    const manifest=await restarted.requireManifest("asset-1");
    expect(manifest.versions.map(version=>version.id)).toEqual(["version-1","version-2"]);
    expect((await restarted.requireAsset("asset-1")).latestVersionId).toBe("version-2");
  });

  it("stores unrelated logical IDs under deterministic Windows-safe hash directories",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"C:\\VideoOSData",()=>changedAt);
    await repository.createAsset(assetFixture("asset:offer-1"),[acceptedVersion("asset:offer-1")]);
    const paths=creativeAssetRepositoryPaths("C:\\VideoOSData","asset:offer-1");
    const key=paths.assetDir.split(/[\\/]/).at(-1)!;
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(paths.assetDir).not.toContain("asset:offer-1");
    expect(()=>creativeAssetRepositoryPaths("/data","C:\\Users\\me\\asset")).toThrow();
  });

  it("lists and searches cross-project library metadata without exposing archived assets by default",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-price"),[acceptedVersion("asset-price")]);
    await repository.createAsset(
      CreativeAssetSchema.parse({...assetFixture("asset-logo"),name:"Brand Logo",tags:["brand"],searchText:"identity mark"}),
      [acceptedVersion("asset-logo")],
    );
    await repository.archiveAsset("asset-logo");

    expect((await repository.listAssets()).map(asset=>asset.id)).toEqual(["asset-price"]);
    expect((await repository.searchAssets("conversion")).map(asset=>asset.id)).toEqual(["asset-price"]);
    expect((await repository.searchAssets("brand",{includeArchived:true})).map(asset=>asset.id)).toEqual(["asset-logo"]);
  });

  it("recovers a corrupted primary from the last valid backup without overwriting that backup",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"));
    const paths=creativeAssetRepositoryPaths("/data","asset-1");
    const backupBefore=await fs.readText(paths.manifestBackup);
    fs.files.set(memoryKey(paths.manifest),"{broken-primary\n");

    const restarted=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    const recovered=await restarted.requireManifest("asset-1");
    expect(recovered.versions.map(version=>version.id)).toEqual(["version-1"]);
    expect(await fs.readText(paths.manifestBackup)).toBe(backupBefore);
    const repairedPrimary=await fs.readText(paths.manifest);
    expect(()=>JSON.parse(repairedPrimary)).not.toThrow();
  });

  it("recovers backup-only assets for direct reads and list/search discovery",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"));
    const paths=creativeAssetRepositoryPaths("/data","asset-1");
    await fs.removeFile(paths.manifest);

    const restarted=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    expect((await restarted.requireManifest("asset-1")).versions).toHaveLength(1);
    expect((await restarted.listAssets()).map(asset=>asset.id)).toEqual(["asset-1"]);
    expect((await restarted.searchAssets("price")).map(asset=>asset.id)).toEqual(["asset-1"]);
    expect(await fs.exists(paths.manifest)).toBe(true);
  });

  it("removes interrupted atomic-write residue and reports unrecoverable manifest keys without poisoning valid assets",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-good"),[acceptedVersion("asset-good")]);
    const goodPaths=creativeAssetRepositoryPaths("/data","asset-good");
    fs.files.set(memoryKey(`${goodPaths.manifest}.deadbeef.tmp`),"partial");
    fs.files.set(memoryKey(`${goodPaths.index}.deadbeef.tmp`),"partial");

    const badKey="d".repeat(64);
    fs.files.set(memoryKey(join(goodPaths.assetsDir,badKey,"manifest.json")),"{bad-primary");
    fs.files.set(memoryKey(join(goodPaths.assetsDir,badKey,"manifest.backup.json")),"{bad-backup");

    const report=await repository.recoverRepository();
    expect(report.assetCount).toBe(1);
    expect(report.invalidStorageKeys).toEqual([badKey]);
    expect(report.removedTempFiles).toBe(2);
    expect(await fs.exists(`${goodPaths.manifest}.deadbeef.tmp`)).toBe(false);
    expect((await repository.listAssets()).map(asset=>asset.id)).toEqual(["asset-good"]);
  });

  it("serializes concurrent same-asset child-version writes without lost updates",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await Promise.all(
      Array.from({length:12},(_,index)=>repository.createDraftChildVersion("asset-1",childDraft("asset-1",`version-${index+2}`))),
    );

    const manifest=await repository.requireManifest("asset-1");
    expect(manifest.versions).toHaveLength(13);
    expect(new Set(manifest.versions.map(version=>version.id)).size).toBe(13);
    for(const version of manifest.versions.slice(1))expect(version.lineage.rootVersionId).toBe("version-1");
  });

  it("accepts a rendered version idempotently and rejects fingerprint drift",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await prepareAcceptableVersion(repository,"asset-1");

    const first=await repository.acceptVersion("asset-1","version-2",hashC);
    const second=await repository.acceptVersion("asset-1","version-2",hashC);
    expect(first.state).toBe("READY");
    expect(first.acceptedAt).toBe(changedAt);
    expect(second).toEqual(first);
    await expect(repository.acceptVersion("asset-1","version-2",hashA)).rejects.toMatchObject({code:"fingerprint_conflict"});
  });

  it("fails closed when normal mutation APIs try to overwrite an accepted immutable version",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await prepareAcceptableVersion(repository,"asset-1");
    const accepted=await repository.acceptVersion("asset-1","version-2",hashC);

    await expect(
      repository.attachArtifactMetadata(
        "asset-1",
        "version-2",
        readyArtifact("asset-1","version-2","replacement-final"),
      ),
    ).rejects.toThrow(/immutable/i);
    await expect(repository.archiveVersion("asset-1","version-2")).rejects.toThrow(/immutable/i);
    expect((await repository.requireVersion("asset-1","version-2")).parameterValues).toEqual(accepted.parameterValues);
  });

  it("archives mutable version history and keeps it readable while rejecting invalid child lineage",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"));
    expect((await repository.archiveVersion("asset-1","version-2")).state).toBe("ARCHIVED");
    expect((await repository.requireVersion("asset-1","version-2")).state).toBe("ARCHIVED");

    await expect(
      repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-3","missing-parent")),
    ).rejects.toMatchObject({code:"invalid_child_version"});
  });

  it("rejects duplicate assets, duplicate versions and invalid logical IDs with typed repository errors",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new CreativeAssetRepository(fs,"/data",()=>changedAt);
    await repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")]);
    await expect(repository.createAsset(assetFixture("asset-1"),[acceptedVersion("asset-1")])).rejects.toBeInstanceOf(CreativeAssetRepositoryError);
    await repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"));
    await expect(repository.createDraftChildVersion("asset-1",childDraft("asset-1","version-2"))).rejects.toMatchObject({code:"version_already_exists"});
    await expect(repository.getAsset("../../escape")).rejects.toThrow();
  });

  it("persists and recovers through the real Node filesystem adapter across repository instances",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-c1-"));
    tempRoots.push(root);
    const fs=new NodeFileSystemAdapter();
    const first=new CreativeAssetRepository(fs,root,()=>changedAt);
    await first.createAsset(assetFixture("asset-real"),[acceptedVersion("asset-real")]);
    await first.createDraftChildVersion("asset-real",childDraft("asset-real","version-2"));

    const restarted=new CreativeAssetRepository(new NodeFileSystemAdapter(),root,()=>changedAt);
    const report=await restarted.recoverRepository();
    expect(report.invalidStorageKeys).toEqual([]);
    expect((await restarted.requireManifest("asset-real")).versions).toHaveLength(2);
    expect((await restarted.rebuildIndex()).entries.map(entry=>entry.assetId)).toEqual(["asset-real"]);
  });
});
