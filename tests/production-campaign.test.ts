import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {ProductionMission} from "@/lib/production/mission/schema";
import {
  CreateProductionCampaignInputSchema,
  ProductionCampaignSchema,
  type ProductionCampaignMissionRef,
} from "@/lib/production/campaign/schema";
import {ProductionCampaignMissionUnavailableError,ProductionCampaignStateError} from "@/lib/production/campaign/errors";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";
import {ProductionCampaignService} from "@/lib/production/campaign/service";
import {ProductionCampaignRunner} from "@/lib/production/campaign/runner";

const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const NOW="2026-08-29T13:00:00.000Z";
const missionIds=[
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
  "22222222-2222-4222-8222-222222222223",
  "22222222-2222-4222-8222-222222222224",
];
const projectIds=["campaign-a","campaign-b","campaign-c","campaign-d"];
const refs:ProductionCampaignMissionRef[]=missionIds.map((missionId,index)=>({projectId:projectIds[index],missionId}));

const mission=(ref:ProductionCampaignMissionRef):ProductionMission=>({
  id:ref.missionId,
  projectId:ref.projectId,
  title:`Mission ${ref.projectId}`,
  brief:"Campaign fixture Mission.",
  target:{},
  autonomyPolicy:{mode:"full-production",finalReviewRequired:false},
  baseProjectRevision:1,
  status:"ready",
  qaReportIds:[],
  agentSessionIds:[],
  workflowRunIds:[],
  jobIds:[],
  createdAt:NOW,
  updatedAt:NOW,
});

const setup=()=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=new ProductionCampaignRepository(fs,"/data");
  const known=new Map(refs.map(ref=>[`${ref.projectId}:${ref.missionId}`,mission(ref)]));
  const service=new ProductionCampaignService(repository,{load:async(projectId,missionId)=>known.get(`${projectId}:${missionId}`)??null},{now:()=>new Date(NOW),createId:()=>CAMPAIGN_ID});
  return{fs,repository,service,known};
};

describe("B7 Production Campaign core",()=>{
  it("rejects duplicate mutable Projects and path-like shared references",()=>{
    expect(()=>CreateProductionCampaignInputSchema.parse({
      title:"Duplicate Project",
      missions:[refs[0],{projectId:refs[0].projectId,missionId:refs[1].missionId}],
    })).toThrow(/same mutable Project/);
    expect(()=>CreateProductionCampaignInputSchema.parse({
      title:"Path reference",
      sharedReferences:{assetIds:["C:\\secret\\asset.mp4"],policyIds:[],skillIds:[],exportTemplateIds:[]},
      missions:[refs[0]],
    })).toThrow(/logical IDs/);
  });

  it("creates durable Campaign control state without copying Project truth",async()=>{
    const{fs,repository,service}=setup();
    const created=await service.create({title:"Batch launch",brief:"Four independent Projects.",maxConcurrency:2,sharedReferences:{assetIds:["asset.hero"],policyIds:["policy.safe"],skillIds:[],exportTemplateIds:["export.social"]},missions:refs});
    expect(created).toMatchObject({id:CAMPAIGN_ID,status:"draft",revision:1,maxConcurrency:2});
    expect(created.missions).toEqual(refs.map(ref=>({...ref,status:"pending",attempt:0,finalArtifactIds:[]})));
    expect([...fs.files.keys()].some(path=>path.includes("/production/campaigns/"))).toBe(true);
    const loaded=await repository.require(CAMPAIGN_ID);
    expect(loaded.sharedReferences.assetIds).toEqual(["asset.hero"]);
    expect(JSON.stringify(loaded)).not.toContain("timeline");
  });

  it("fails closed when a referenced Mission is unavailable",async()=>{
    const{known,service}=setup();
    known.delete(`${refs[0].projectId}:${refs[0].missionId}`);
    await expect(service.create({title:"Missing Mission",missions:[refs[0]]})).rejects.toBeInstanceOf(ProductionCampaignMissionUnavailableError);
  });

  it("serializes repository mutations and preserves every Campaign revision",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Revision test",missions:[refs[0]]});
    await Promise.all(Array.from({length:8},(_,index)=>repository.mutate(CAMPAIGN_ID,current=>ProductionCampaignSchema.parse({...current,title:`Revision ${index}`,revision:current.revision+1,updatedAt:NOW}))));
    expect((await repository.require(CAMPAIGN_ID)).revision).toBe(9);
  });

  it("runs Missions through a bounded worker pool and aggregates final outcomes",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Bounded batch",maxConcurrency:2,missions:refs});
    let active=0;let maxActive=0;
    const runner=new ProductionCampaignRunner(repository,{runMission:async ref=>{
      active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,5));
      active--;
      return ref.projectId===refs[2].projectId?{status:"waiting-review",currentStep:"final-review",finalArtifactIds:[]}:{status:"completed",finalArtifactIds:[`artifact:${ref.projectId}`]};
    }},{now:()=>new Date(NOW)});
    const result=await runner.run(CAMPAIGN_ID);
    expect(maxActive).toBe(2);
    expect(result.status).toBe("waiting-review");
    expect(result.missions.filter(item=>item.status==="completed")).toHaveLength(3);
    expect(result.missions.find(item=>item.projectId===refs[2].projectId)).toMatchObject({status:"waiting-review",currentStep:"final-review"});
    expect(result.revision).toBe(11);
  });

  it("prevents a second concurrent Campaign run after the first has claimed running state",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Single owner",maxConcurrency:1,missions:[refs[0]]});
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const runner=new ProductionCampaignRunner(repository,{runMission:async()=>{await gate;return{status:"completed",finalArtifactIds:[]};}},{now:()=>new Date(NOW)});
    const first=runner.run(CAMPAIGN_ID);
    await new Promise(resolve=>setTimeout(resolve,0));
    await expect(runner.run(CAMPAIGN_ID)).rejects.toBeInstanceOf(ProductionCampaignStateError);
    release();
    await expect(first).resolves.toMatchObject({status:"completed"});
  });
});
