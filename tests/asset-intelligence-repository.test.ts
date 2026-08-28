import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AssetIntelligenceRepository} from "@/lib/assets/intelligence/repository";
import {AssetIntelligenceRecordSchema,type AssetIntelligenceRecord} from "@/lib/assets/intelligence/schema";

const PROJECT_ID="project-1";
const ASSET_ID="asset:hero";
const HASH=createHash("sha256").update(ASSET_ID).digest("hex");
const PRIMARY=`/data/projects/${PROJECT_ID}/production/asset-intelligence/${HASH}.json`;
const BACKUP=`/data/projects/${PROJECT_ID}/production/asset-intelligence/${HASH}.backup.json`;

const record=(overrides:Partial<AssetIntelligenceRecord>={}):AssetIntelligenceRecord=>AssetIntelligenceRecordSchema.parse({
  version:1,
  projectId:PROJECT_ID,
  assetId:ASSET_ID,
  sourceFingerprint:"a".repeat(64),
  sourceProjectRevision:3,
  analyzer:{id:"deterministic-media-metadata",version:"1",mode:"deterministic"},
  summary:"A portrait talking-head source with audio.",
  tags:["video","portrait","has-audio"],
  usableRanges:[],
  generatedAt:"2026-08-28T12:00:00.000Z",
  ...overrides,
});

describe("AssetIntelligenceRepository",()=>{
  it("uses a Windows-safe hashed storage key while preserving the logical Asset ID",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new AssetIntelligenceRepository(fs,"/data");
    await repository.upsert(record());
    const filenames=[...fs.files.keys()].filter(path=>path.includes("asset-intelligence"));
    expect(filenames).toEqual([PRIMARY]);
    expect(await repository.require(PROJECT_ID,ASSET_ID)).toMatchObject({assetId:ASSET_ID});
  });

  it("recovers the last valid backup when the primary record is corrupt",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new AssetIntelligenceRepository(fs,"/data");
    const first=record({summary:"First valid analysis.",generatedAt:"2026-08-28T12:00:00.000Z"});
    const second=record({summary:"Second valid analysis.",generatedAt:"2026-08-28T12:01:00.000Z"});
    await repository.upsert(first);
    await repository.upsert(second);
    fs.files.set(PRIMARY,"{broken");
    const recovered=await repository.require(PROJECT_ID,ASSET_ID);
    expect(recovered).toEqual(first);
    expect(JSON.parse(fs.files.get(PRIMARY)!)).toMatchObject({summary:"First valid analysis."});
  });

  it("recovers backup-only records during list so retrieval cannot silently lose them",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new AssetIntelligenceRepository(fs,"/data");
    const first=record({summary:"Backup analysis.",generatedAt:"2026-08-28T12:00:00.000Z"});
    const second=record({summary:"Current analysis.",generatedAt:"2026-08-28T12:01:00.000Z"});
    await repository.upsert(first);
    await repository.upsert(second);
    expect(fs.files.has(BACKUP)).toBe(true);
    fs.files.delete(PRIMARY);
    expect(await repository.list(PROJECT_ID)).toEqual([first]);
    expect(fs.files.has(PRIMARY)).toBe(true);
  });

  it("rejects repository-key identity substitution",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new AssetIntelligenceRepository(fs,"/data");
    await repository.upsert(record());
    fs.files.set(PRIMARY,JSON.stringify(record({assetId:"other-asset"})));
    await expect(repository.require(PROJECT_ID,ASSET_ID)).rejects.toThrow("identity does not match");
  });
});
