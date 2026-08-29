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
import {ProductionCampaignDashboardService} from "@/lib/production/campaign/dashboard";
import type {ProductionWorkspaceSnapshot} from "@/lib/production/workspace/schema";

const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const NOW="2026-08-29T13:00:00.000Z";
const missionIds=[
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
  "22222222-2222-4222-8222-222222222223",
  "22222222-2222-4222-8222-222222222224",
];
const projectIds=["campaign-a","campaign-b","campaign-c","campaign-d"];
const refs:ProductionCampaignMissionRef[]=missionIds.map((missionId,index)=>({projectId:projectIds[index]!,missionId}));

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

const liveWorkspace=(ref:ProductionCampaignMissionRef,revision=3)=>({
  project:{id:ref.projectId,name:ref.projectId,currentRevision:revision},
  activity:{state:"running"},
  progress:{totalSteps:4,completedSteps:2,percent:50},
  qa:{state:"not-run",pass:0,fail:0,notEvaluated:0},
  stale:{plan:false,execution:false,qa:false},
  finalRenderReadiness:"pending",
}) as ProductionWorkspaceSnapshot;

describe("B7 Production Campaign core",()=>{
  it("rejects duplicate mutable Projects and path-like shared references",()=>{
    expect(()=>CreateProductionCampaignInputSchema.parse({
      title:"Duplicate Project",
      missions:[refs[0]!,{projectId:refs[0]!.projectId,missionId:refs[1]!.missionId}],
    })).toThrow(/same mutable Project/);
    expect(()=>CreateProductionCampaignInputSchema.parse({
      title:"Path reference",
      sharedReferences:{assetIds:["C:\\secret\\asset.mp4"],policyIds:[],skillIds:[],exportTemplateIds:[]},
      missions:[refs[0]!],
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
    known.delete(`${refs[0]!.projectId}:${refs[0]!.missionId}`);
    await expect(service.create({title:"Missing Mission",missions:[refs[0]!]})).rejects.toBeInstanceOf(ProductionCampaignMissionUnavailableError);
  });

  it("serializes repository mutations and preserves every Campaign revision",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Revision test",missions:[refs[0]!]});
    await Promise.all(Array.from({length:8},(_,index)=>repository.mutate(CAMPAIGN_ID,current=>ProductionCampaignSchema.parse({...current,title:`Revision ${index}`,revision:current.revision+1,updatedAt:NOW}))));
    expect((await repository.require(CAMPAIGN_ID)).revision).toBe(9);
  });

  it("enqueues idempotently and retries only failed Missions",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Queue",missions:[refs[0]!,refs[1]!]});
    expect((await service.enqueue(CAMPAIGN_ID)).revision).toBe(2);
    expect((await service.enqueue(CAMPAIGN_ID)).revision).toBe(2);
    await repository.mutate(CAMPAIGN_ID,current=>ProductionCampaignSchema.parse({
      ...current,status:"failed",revision:3,finishedAt:NOW,updatedAt:NOW,
      missions:current.missions.map((item,index)=>index===0?{...item,status:"failed",attempt:1,error:{code:"fixture",message:"fixture"},startedAt:NOW,finishedAt:NOW}:item),
    }));
    const retried=await service.retryFailed(CAMPAIGN_ID);
    expect(retried.status).toBe("queued");
    expect(retried.missions[0]).toMatchObject({status:"pending",attempt:1});
    expect(retried.missions[1]).toMatchObject({status:"pending",attempt:0});
  });

  it("runs Missions through a bounded worker pool and aggregates final outcomes",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Bounded batch",maxConcurrency:2,missions:refs});
    let active=0;let maxActive=0;
    const runner=new ProductionCampaignRunner(repository,{runMission:async ref=>{
      active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,5));
      active--;
      return ref.projectId===refs[2]!.projectId?{status:"waiting-review",currentStep:"final-review",finalArtifactIds:[]}:{status:"completed",finalArtifactIds:[`artifact:${ref.projectId}`]};
    }},{now:()=>new Date(NOW)});
    const result=await runner.run(CAMPAIGN_ID);
    expect(maxActive).toBe(2);
    expect(result.status).toBe("waiting-review");
    expect(result.missions.filter(item=>item.status==="completed")).toHaveLength(3);
    expect(result.missions.find(item=>item.projectId===refs[2]!.projectId)).toMatchObject({status:"waiting-review",currentStep:"final-review"});
    expect(result.revision).toBe(11);
  });

  it("cancels one pending Mission without starting it or killing siblings",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Cancel isolated",maxConcurrency:1,missions:[refs[0]!,refs[1]!]});
    const executed:string[]=[];
    const runner=new ProductionCampaignRunner(repository,{runMission:async ref=>{executed.push(ref.missionId);return{status:"completed",finalArtifactIds:[`artifact:${ref.projectId}`]};}},{now:()=>new Date(NOW)});
    await runner.cancelMission(CAMPAIGN_ID,refs[0]!);
    const result=await runner.run(CAMPAIGN_ID);
    expect(executed).toEqual([refs[1]!.missionId]);
    expect(result.missions[0]).toMatchObject({status:"cancelled",attempt:0});
    expect(result.missions[1]).toMatchObject({status:"completed",attempt:1});
    expect(result.status).toBe("cancelled");
  });

  it("requests cancellation for one active Mission and isolates the sibling",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Active cancel",maxConcurrency:2,missions:[refs[0]!,refs[1]!]});
    let release!:()=>void;let active!:()=>void;
    const activeReached=new Promise<void>(resolve=>{active=resolve;});
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const cancelled:string[]=[];
    const runner=new ProductionCampaignRunner(repository,{
      runMission:async ref=>{if(ref.missionId===refs[0]!.missionId){active();await gate;}return{status:"completed",finalArtifactIds:[`artifact:${ref.projectId}`]};},
      cancelMission:async ref=>{cancelled.push(ref.missionId);},
    },{now:()=>new Date(NOW)});
    const run=runner.run(CAMPAIGN_ID);
    await activeReached;
    await runner.cancelMission(CAMPAIGN_ID,refs[0]!);
    release();
    const result=await run;
    expect(cancelled).toEqual([refs[0]!.missionId]);
    expect(result.missions.find(item=>item.missionId===refs[0]!.missionId)?.status).toBe("cancelled");
    expect(result.missions.find(item=>item.missionId===refs[1]!.missionId)?.status).toBe("completed");
  });

  it("prevents a second concurrent Campaign run after the first has claimed running state",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Single owner",maxConcurrency:1,missions:[refs[0]!]});
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const runner=new ProductionCampaignRunner(repository,{runMission:async()=>{await gate;return{status:"completed",finalArtifactIds:[]};}},{now:()=>new Date(NOW)});
    const first=runner.run(CAMPAIGN_ID);
    await new Promise(resolve=>setTimeout(resolve,0));
    await expect(runner.run(CAMPAIGN_ID)).rejects.toBeInstanceOf(ProductionCampaignStateError);
    release();
    await expect(first).resolves.toMatchObject({status:"completed"});
  });

  it("archives Campaign metadata without deleting or mutating referenced Missions",async()=>{
    const{known,service}=setup();
    await service.create({title:"Archive",missions:[refs[0]!]});
    const before=known.get(`${refs[0]!.projectId}:${refs[0]!.missionId}`);
    const archived=await service.archive(CAMPAIGN_ID);
    expect(archived.status).toBe("archived");
    expect(known.get(`${refs[0]!.projectId}:${refs[0]!.missionId}`)).toEqual(before);
  });

  it("rebuilds dashboard live state from durable Campaign references after reload",async()=>{
    const{repository,service}=setup();
    await service.create({title:"Dashboard",missions:[refs[0]!,refs[1]!]});
    let revision=5;
    const dashboard=new ProductionCampaignDashboardService(repository,{snapshot:async(projectId,missionId)=>{
      const ref={projectId,missionId};
      if(projectId===refs[1]!.projectId)throw new Error("fixture unavailable");
      return liveWorkspace(ref,revision);
    }});
    const first=await dashboard.snapshot(CAMPAIGN_ID);
    expect(first.missions[0]!.live).toMatchObject({projectRevision:5,progressPercent:50});
    expect(first.missions[1]).toMatchObject({live:null,unavailable:{code:"CAMPAIGN_MISSION_WORKSPACE_UNAVAILABLE"}});
    revision=6;
    const reloaded=new ProductionCampaignDashboardService(repository,{snapshot:async(projectId,missionId)=>liveWorkspace({projectId,missionId},revision)});
    expect((await reloaded.snapshot(CAMPAIGN_ID)).missions[0]!.live?.projectRevision).toBe(6);
  });
});
