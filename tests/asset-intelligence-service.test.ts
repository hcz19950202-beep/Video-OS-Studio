import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AssetIntelligenceRepository} from "@/lib/assets/intelligence/repository";
import {AssetIntelligenceStaleError} from "@/lib/assets/intelligence/errors";
import {AssetIntelligenceService,DeterministicAssetIntelligenceAnalyzer,fingerprintProjectAsset,type AssetIntelligenceAnalyzer} from "@/lib/assets/intelligence/service";
import type {Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const ASSET_ID="asset:hero";

const projectAt=(revision:number,relativePath="input/hero.mp4"):Project=>({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Project One",revision,createdAt:"2026-08-28T11:00:00.000Z",updatedAt:"2026-08-28T11:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
  assets:[{id:ASSET_ID,kind:"video",relativePath,originalRelativePath:"original/hero.mov",originalName:"secret-user-file.mov",label:"Hero talking head",mimeType:"video/mp4",durationInFrames:900,width:1080,height:1920,sourceFps:30,hasAudio:true,sizeBytes:123456}],
  tracks:[],script:{baseSourceRanges:[],segments:[]},scenes:[],markers:[],
  brand:{name:"",primaryColor:"#ffffff",secondaryColor:"#111111",accentColor:"#2563eb",fontFamily:"Inter",logoAssetId:null},linkedStyles:[],
  language:{source:"auto",target:"en",captionLanguage:"en"},
  workflow:{scenario:"product-ad",starterPrompt:"",sceneTaxonomy:["hook","problem","solution","proof","cta"],captionHint:"primary",visualIntensity:"high"},
} as unknown as Project);

const setup=(reader:{load:(projectId:string)=>Promise<Project>},analyzer:AssetIntelligenceAnalyzer=new DeterministicAssetIntelligenceAnalyzer())=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=new AssetIntelligenceRepository(fs,"/data");
  const service=new AssetIntelligenceService(reader,repository,analyzer,{now:()=>"2026-08-28T12:00:00.000Z"});
  return{fs,repository,service};
};

describe("AssetIntelligenceService",()=>{
  it("creates deterministic metadata intelligence without exposing Project paths or original filenames",async()=>{
    const project=projectAt(4);
    const{service}=setup({load:async()=>project});
    const record=await service.analyzeAsset(PROJECT_ID,ASSET_ID);
    expect(record).toMatchObject({projectId:PROJECT_ID,assetId:ASSET_ID,sourceProjectRevision:4,sourceFingerprintScope:"project-asset-descriptor-v1",tags:["video","has-audio","portrait","long"]});
    expect(record.sourceFingerprint).toBe(fingerprintProjectAsset(project.assets[0]));
    const serialized=JSON.stringify(record);
    expect(serialized).not.toContain("input/hero.mp4");
    expect(serialized).not.toContain("original/hero.mov");
    expect(serialized).not.toContain("secret-user-file.mov");
  });

  it("does not invalidate intelligence for an unrelated Project revision change",async()=>{
    let project=projectAt(4);
    const{service}=setup({load:async()=>project});
    await service.analyzeAsset(PROJECT_ID,ASSET_ID);
    project=projectAt(5);
    expect(await service.inspectFreshness(PROJECT_ID,ASSET_ID)).toMatchObject({currentProjectRevision:5,stale:false,reason:"fresh"});
  });

  it("marks intelligence stale when the source Asset descriptor changes",async()=>{
    let project=projectAt(4);
    const{service}=setup({load:async()=>project});
    await service.analyzeAsset(PROJECT_ID,ASSET_ID);
    project=projectAt(5,"input/hero-v2.mp4");
    expect(await service.inspectFreshness(PROJECT_ID,ASSET_ID)).toMatchObject({stale:true,reason:"source-changed"});
    await expect(service.requireFresh(PROJECT_ID,ASSET_ID)).rejects.toBeInstanceOf(AssetIntelligenceStaleError);
  });

  it("changes the descriptor fingerprint when an analyzer-visible safe label changes",()=>{
    const first=projectAt(4);
    const second=structuredClone(first);
    second.assets[0].label="Updated hero talking head";
    expect(fingerprintProjectAsset(first.assets[0])).not.toBe(fingerprintProjectAsset(second.assets[0]));
  });

  it("omits an original-filename label from analyzer input",async()=>{
    const project=projectAt(4);
    project.assets[0].label="secret-user-file.mov";
    let captured:unknown;
    const analyzer:AssetIntelligenceAnalyzer={
      descriptor:{id:"capture-analyzer",version:"1",mode:"deterministic"},
      analyze:input=>{captured=input;return{summary:"Bounded metadata analysis.",tags:["video"],usableRanges:[]};},
    };
    const{service}=setup({load:async()=>project},analyzer);
    await service.analyzeAsset(PROJECT_ID,ASSET_ID);
    expect(captured).toMatchObject({asset:{id:ASSET_ID,kind:"video"}});
    expect((captured as {asset:{label?:string}}).asset.label).toBeUndefined();
    expect(JSON.stringify(captured)).not.toContain("secret-user-file.mov");
  });

  it("rejects unsafe analyzer text before persistence",async()=>{
    const project=projectAt(4);
    const analyzer:AssetIntelligenceAnalyzer={
      descriptor:{id:"unsafe-analyzer",version:"1",mode:"deterministic"},
      analyze:()=>({summary:"Use E:\\Video-OS-Studio\\private\\hero.mp4",tags:["video"],usableRanges:[]}),
    };
    const{repository,service}=setup({load:async()=>project},analyzer);
    await expect(service.analyzeAsset(PROJECT_ID,ASSET_ID)).rejects.toThrow("filesystem paths or media filenames");
    expect(await repository.load(PROJECT_ID,ASSET_ID)).toBeNull();
  });

  it("fails closed if the source Asset changes while analysis is running and persists no record",async()=>{
    let loads=0;
    const first=projectAt(4,"input/hero.mp4");
    const changed=projectAt(5,"input/hero-v2.mp4");
    const analyzer:AssetIntelligenceAnalyzer={
      descriptor:{id:"test-analyzer",version:"1",mode:"deterministic"},
      analyze:()=>({summary:"Bounded metadata analysis.",tags:["video"],usableRanges:[]}),
    };
    const{repository,service}=setup({load:async()=>++loads===1?first:changed},analyzer);
    await expect(service.analyzeAsset(PROJECT_ID,ASSET_ID)).rejects.toBeInstanceOf(AssetIntelligenceStaleError);
    expect(await repository.load(PROJECT_ID,ASSET_ID)).toBeNull();
  });

  it("excludes stale records from search results",async()=>{
    let project=projectAt(4);
    const{service}=setup({load:async()=>project});
    await service.analyzeAsset(PROJECT_ID,ASSET_ID);
    project=projectAt(5,"input/hero-v2.mp4");
    expect(await service.search(PROJECT_ID,{query:"portrait video",requiredTags:[],preferredKinds:[],maxResults:8})).toEqual([]);
  });
});
