import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectRepository} from "@/lib/project/repository";
import {ProductionCampaignDashboardService} from "@/lib/production/campaign/dashboard";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";
import {ProductionCampaignRunner} from "@/lib/production/campaign/runner";
import {ProductionCampaignService} from "@/lib/production/campaign/service";
import type {ProductionCampaignMissionRef,ProductionCampaignMissionRunResult} from "@/lib/production/campaign/schema";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {ProductionWorkspaceService} from "@/lib/production/workspace/service";

const NOW="2026-08-29T13:45:00.000Z";
const DATA_ROOT="/data";
const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const CANCEL_CAMPAIGN_ID="11111111-1111-4111-8111-111111111112";
const PROJECT_IDS=["b7-project-a","b7-project-b","b7-project-c"] as const;
const MISSION_IDS=[
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
  "22222222-2222-4222-8222-222222222223",
] as const;
const REFS:ProductionCampaignMissionRef[]=PROJECT_IDS.map((projectId,index)=>({projectId,missionId:MISSION_IDS[index]!}));

const missionFor=(ref:ProductionCampaignMissionRef)=>ProductionMissionSchema.parse({
  id:ref.missionId,
  projectId:ref.projectId,
  title:`B7 ${ref.projectId}`,
  brief:"Deterministic B7 Campaign acceptance Mission.",
  target:{format:"product-ad",platform:"facebook"},
  autonomyPolicy:{mode:"full-production",finalReviewRequired:false},
  baseProjectRevision:0,
  status:"ready",
  createdAt:NOW,
  updatedAt:NOW,
});

const createWorkspace=async(fs:InMemoryFileSystemAdapter)=>{
  const projects=new ProjectRepository(fs,DATA_ROOT);
  const missions=new ProductionMissionRepository(fs,DATA_ROOT);
  for(const ref of REFS){
    await projects.create({id:ref.projectId,name:`Project ${ref.projectId}`,now:NOW});
    await missions.create(missionFor(ref));
  }
  return{projects,missions};
};

const workspaceReader=(fs:InMemoryFileSystemAdapter)=>new ProductionWorkspaceService(
  new ProjectRepository(fs,DATA_ROOT),
  new ProductionMissionRepository(fs,DATA_ROOT),
  new ProductionPlanRepository(fs,DATA_ROOT),
  new ProductionExecutionRepository(fs,DATA_ROOT),
  new QAReportRepository(fs,DATA_ROOT),
);

describe("V2.4 B7 deterministic Campaign acceptance",()=>{
  it("proves isolation, bounded concurrency, retry, durable reload, archive safety and cancel isolation",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const{projects,missions}=await createWorkspace(fs);
    const campaigns=new ProductionCampaignRepository(fs,DATA_ROOT);
    let idIndex=0;
    const campaignIds=[CAMPAIGN_ID,CANCEL_CAMPAIGN_ID];
    const service=new ProductionCampaignService(campaigns,{
      load:(projectId,missionId)=>missions.load(projectId,missionId),
    },{now:()=>new Date(NOW),createId:()=>campaignIds[idIndex++]!});

    const created=await service.create({
      title:"B7 deterministic batch",
      brief:"Three isolated outputs with one first-pass failure.",
      maxConcurrency:2,
      sharedReferences:{
        assetIds:["asset.brand-hero"],
        policyIds:["policy.safe-production"],
        skillIds:["skill.numeric-proof"],
        exportTemplateIds:["export.facebook-feed"],
      },
      missions:REFS,
    });
    expect(created.revision).toBe(1);
    const queued=await service.enqueue(CAMPAIGN_ID);
    const duplicateQueue=await service.enqueue(CAMPAIGN_ID);
    expect(duplicateQueue.revision).toBe(queued.revision);

    let active=0;
    let maxActive=0;
    const firstCalls:string[]=[];
    const firstRunner=new ProductionCampaignRunner(campaigns,{
      runMission:async ref=>{
        firstCalls.push(ref.projectId);
        active+=1;
        maxActive=Math.max(maxActive,active);
        await new Promise(resolve=>setTimeout(resolve,8));
        active-=1;
        if(ref.projectId===PROJECT_IDS[1])return{
          status:"failed",
          finalArtifactIds:[],
          error:{code:"B7_EXPECTED_FIXTURE_FAILURE",message:"Expected isolated first-pass failure."},
        };
        return{status:"completed",finalArtifactIds:[`render:${ref.projectId}`]};
      },
    },{now:()=>new Date(NOW)});
    const firstResult=await firstRunner.run(CAMPAIGN_ID);
    expect(firstCalls.sort()).toEqual([...PROJECT_IDS].sort());
    expect(maxActive).toBe(2);
    expect(firstResult.status).toBe("failed");
    expect(firstResult.missions.find(item=>item.projectId===PROJECT_IDS[0])).toMatchObject({status:"completed",attempt:1});
    expect(firstResult.missions.find(item=>item.projectId===PROJECT_IDS[1])).toMatchObject({status:"failed",attempt:1});
    expect(firstResult.missions.find(item=>item.projectId===PROJECT_IDS[2])).toMatchObject({status:"completed",attempt:1});

    const restartedRepository=new ProductionCampaignRepository(fs,DATA_ROOT);
    const restartedMissions=new ProductionMissionRepository(fs,DATA_ROOT);
    const restartedDashboard=new ProductionCampaignDashboardService(restartedRepository,workspaceReader(fs));
    const reloaded=await restartedDashboard.snapshot(CAMPAIGN_ID);
    expect(reloaded.campaign.status).toBe("failed");
    expect(reloaded.missions).toHaveLength(3);
    expect(reloaded.missions.every(item=>item.live?.projectRevision===0)).toBe(true);
    expect(new Set(reloaded.missions.map(item=>item.run.projectId)).size).toBe(3);

    const restartedService=new ProductionCampaignService(restartedRepository,{
      load:(projectId,missionId)=>restartedMissions.load(projectId,missionId),
    },{now:()=>new Date(NOW)});
    const retryQueued=await restartedService.retryFailed(CAMPAIGN_ID);
    expect(retryQueued.missions.find(item=>item.projectId===PROJECT_IDS[0])?.status).toBe("completed");
    expect(retryQueued.missions.find(item=>item.projectId===PROJECT_IDS[1])?.status).toBe("pending");
    expect(retryQueued.missions.find(item=>item.projectId===PROJECT_IDS[2])?.status).toBe("completed");

    const retryCalls:string[]=[];
    const retryRunner=new ProductionCampaignRunner(restartedRepository,{
      runMission:async ref=>{
        retryCalls.push(ref.projectId);
        return{status:"completed",finalArtifactIds:[`render:${ref.projectId}:retry`]};
      },
    },{now:()=>new Date(NOW)});
    const completed=await retryRunner.run(CAMPAIGN_ID);
    expect(completed.status).toBe("completed");
    expect(retryCalls).toEqual([PROJECT_IDS[1]]);
    expect(completed.missions.find(item=>item.projectId===PROJECT_IDS[0])?.attempt).toBe(1);
    expect(completed.missions.find(item=>item.projectId===PROJECT_IDS[1])?.attempt).toBe(2);
    expect(completed.missions.find(item=>item.projectId===PROJECT_IDS[2])?.attempt).toBe(1);

    const archived=await restartedService.archive(CAMPAIGN_ID);
    expect(archived.status).toBe("archived");
    await expect(projects.load(PROJECT_IDS[0])).resolves.toMatchObject({project:{id:PROJECT_IDS[0]}});
    await expect(missions.require(PROJECT_IDS[0],MISSION_IDS[0])).resolves.toMatchObject({id:MISSION_IDS[0]});

    await service.create({title:"B7 cancellation isolation",maxConcurrency:2,missions:REFS.slice(0,2)});
    let startedCount=0;
    let bothStartedResolve!:()=>void;
    const bothStarted=new Promise<void>(resolve=>{bothStartedResolve=resolve;});
    let releaseCancelled!:()=>void;
    let releaseSibling!:()=>void;
    const cancelledGate=new Promise<void>(resolve=>{releaseCancelled=resolve;});
    const siblingGate=new Promise<void>(resolve=>{releaseSibling=resolve;});
    const cancellationCalls:string[]=[];
    const cancelRunner=new ProductionCampaignRunner(campaigns,{
      runMission:async ref=>{
        startedCount+=1;
        if(startedCount===2)bothStartedResolve();
        await(ref.projectId===PROJECT_IDS[0]?cancelledGate:siblingGate);
        return{status:"completed",finalArtifactIds:[`render:${ref.projectId}:cancel-case`]};
      },
      cancelMission:async ref=>{
        cancellationCalls.push(ref.projectId);
        if(ref.projectId===PROJECT_IDS[0])releaseCancelled();
      },
    },{now:()=>new Date(NOW)});
    const cancelRun=cancelRunner.run(CANCEL_CAMPAIGN_ID);
    await bothStarted;
    await cancelRunner.cancelMission(CANCEL_CAMPAIGN_ID,REFS[0]!);
    releaseSibling();
    const cancelledResult=await cancelRun;
    expect(cancellationCalls).toEqual([PROJECT_IDS[0]]);
    expect(cancelledResult.status).toBe("cancelled");
    expect(cancelledResult.missions.find(item=>item.projectId===PROJECT_IDS[0])?.status).toBe("cancelled");
    expect(cancelledResult.missions.find(item=>item.projectId===PROJECT_IDS[1])?.status).toBe("completed");

    const evidence={
      campaignId:CAMPAIGN_ID,
      missionCount:3,
      distinctProjects:3,
      maxConcurrencyConfigured:2,
      maxConcurrencyObserved:maxActive,
      duplicateEnqueueRevision:duplicateQueue.revision,
      firstRunStatus:firstResult.status,
      firstRunAttempts:Object.fromEntries(firstResult.missions.map(item=>[item.projectId,item.attempt])),
      restartReloadStatus:reloaded.campaign.status,
      retryCalls,
      finalStatus:completed.status,
      archivedStatus:archived.status,
      projectAndMissionTruthSurvivedArchive:true,
      cancellationCampaignStatus:cancelledResult.status,
      cancelledProject:PROJECT_IDS[0],
      siblingStatus:cancelledResult.missions.find(item=>item.projectId===PROJECT_IDS[1])?.status,
    };
    console.log(`B7_ACCEPTANCE_EVIDENCE=${JSON.stringify(evidence)}`);
  });
});
