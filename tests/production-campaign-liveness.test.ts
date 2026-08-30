import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionCampaignRunnerBusyError} from "@/lib/production/campaign/errors";
import {
  ProductionCampaignRepository,
  type ProductionCampaignRunnerClaim,
} from "@/lib/production/campaign/repository";
import {ProductionCampaignRunner} from "@/lib/production/campaign/runner";
import type {ProductionCampaign,ProductionCampaignMissionRef} from "@/lib/production/campaign/schema";
import {ProductionCampaignService} from "@/lib/production/campaign/service";
import type {ProductionMission} from "@/lib/production/mission/schema";

const CAMPAIGN_ID="91111111-1111-4111-8111-111111111111";
const MISSION_ID="92222222-2222-4222-8222-222222222222";
const PROJECT_ID="campaign-liveness-project";
const NOW="2026-08-30T12:00:00.000Z";
const ref:ProductionCampaignMissionRef={projectId:PROJECT_ID,missionId:MISSION_ID};

const mission:ProductionMission={
  id:MISSION_ID,
  projectId:PROJECT_ID,
  title:"Campaign liveness Mission",
  brief:"Fixture Mission.",
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
};

class FailOnceCampaignRepository extends ProductionCampaignRepository{
  failMissionFinalization=false;
  failCampaignFinalization=false;

  override async mutate(
    campaignId:string,
    mutation:(current:ProductionCampaign)=>ProductionCampaign|Promise<ProductionCampaign>,
  ):Promise<ProductionCampaign>{
    return super.mutate(campaignId,async current=>{
      const candidate=await mutation(current);
      const missionFinalization=current.missions.some(item=>item.status==="running")&&candidate.missions.some(item=>item.status==="completed");
      if(this.failMissionFinalization&&missionFinalization){
        this.failMissionFinalization=false;
        throw new Error("fixture mission finalization persistence failure");
      }
      const campaignFinalization=current.status==="running"&&candidate.status==="completed"&&current.missions.every(item=>item.status==="completed");
      if(this.failCampaignFinalization&&campaignFinalization){
        this.failCampaignFinalization=false;
        throw new Error("fixture campaign finalization persistence failure");
      }
      return candidate;
    });
  }
}

const setup=async(repositoryFactory?:(fs:InMemoryFileSystemAdapter)=>ProductionCampaignRepository)=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=repositoryFactory?.(fs)??new ProductionCampaignRepository(fs,"/data");
  const service=new ProductionCampaignService(
    repository,
    {load:async(projectId,missionId)=>projectId===PROJECT_ID&&missionId===MISSION_ID?mission:null},
    {now:()=>new Date(NOW),createId:()=>CAMPAIGN_ID},
  );
  await service.create({title:"Campaign liveness",maxConcurrency:1,missions:[ref]});
  return{fs,repository};
};

const runnerClaimPath=`/data/production/campaigns/${CAMPAIGN_ID}.runner-claim.json`;
const readClaim=(fs:InMemoryFileSystemAdapter)=>JSON.parse(fs.files.get(runnerClaimPath)??"null") as ProductionCampaignRunnerClaim|null;

describe("V2.4.2 Production Campaign liveness",()=>{
  it("blocks a second live runner owner",async()=>{
    const{repository}=await setup();
    const claim=await repository.claimRunner(CAMPAIGN_ID);
    await expect(repository.claimRunner(CAMPAIGN_ID)).rejects.toBeInstanceOf(ProductionCampaignRunnerBusyError);
    await expect(repository.releaseRunnerClaim(CAMPAIGN_ID,claim.ownerToken)).resolves.toBe(true);
  });

  it("recovers a PID-reused runner claim and prevents the old owner from deleting the replacement",async()=>{
    const{fs,repository}=await setup();
    const oldClaim=await repository.claimRunner(CAMPAIGN_ID);
    fs.files.set(runnerClaimPath,JSON.stringify({...oldClaim,processStartedAt:(oldClaim.processStartedAt??1)+60_000},null,2)+"\n");

    const replacement=await repository.claimRunner(CAMPAIGN_ID);
    expect(replacement.ownerToken).not.toBe(oldClaim.ownerToken);
    await expect(repository.releaseRunnerClaim(CAMPAIGN_ID,oldClaim.ownerToken)).resolves.toBe(false);
    expect(readClaim(fs)?.ownerToken).toBe(replacement.ownerToken);
    await expect(repository.releaseRunnerClaim(CAMPAIGN_ID,replacement.ownerToken)).resolves.toBe(true);
  });

  it("resumes a durable running Mission without incrementing its Campaign attempt",async()=>{
    const{repository}=await setup();
    await repository.mutate(CAMPAIGN_ID,current=>({
      ...current,
      status:"running",
      revision:current.revision+1,
      startedAt:NOW,
      updatedAt:NOW,
      missions:current.missions.map(item=>({...item,status:"running" as const,attempt:1,startedAt:NOW})),
    }));
    let executions=0;
    const runner=new ProductionCampaignRunner(
      repository,
      {runMission:async()=>{executions+=1;return{status:"completed",finalArtifactIds:["render:recovered"]};}},
      {now:()=>new Date(NOW)},
    );

    const completed=await runner.run(CAMPAIGN_ID);
    expect(executions).toBe(1);
    expect(completed.status).toBe("completed");
    expect(completed.missions[0]).toMatchObject({status:"completed",attempt:1,finalArtifactIds:["render:recovered"]});
  });

  it("retries durable Campaign Mission finalization after the external Mission already succeeded",async()=>{
    const{repository}=await setup(fs=>new FailOnceCampaignRepository(fs,"/data"));
    const failing=repository as FailOnceCampaignRepository;
    failing.failMissionFinalization=true;
    let executions=0;
    const runner=new ProductionCampaignRunner(
      repository,
      {runMission:async()=>{executions+=1;return{status:"completed",finalArtifactIds:["render:stable-operation"]};}},
      {now:()=>new Date(NOW)},
    );

    await expect(runner.run(CAMPAIGN_ID)).rejects.toThrow("fixture mission finalization persistence failure");
    const stranded=await repository.require(CAMPAIGN_ID);
    expect(stranded).toMatchObject({status:"running"});
    expect(stranded.missions[0]).toMatchObject({status:"running",attempt:1});
    expect(readClaim((repository as unknown as {fs?:InMemoryFileSystemAdapter}).fs??new InMemoryFileSystemAdapter())).toBeNull();

    const recovered=await runner.run(CAMPAIGN_ID);
    expect(executions).toBe(2);
    expect(recovered.status).toBe("completed");
    expect(recovered.missions[0]).toMatchObject({status:"completed",attempt:1,finalArtifactIds:["render:stable-operation"]});
  });

  it("recovers a failed final Campaign aggregate write without rerunning completed Missions",async()=>{
    const{repository}=await setup(fs=>new FailOnceCampaignRepository(fs,"/data"));
    const failing=repository as FailOnceCampaignRepository;
    failing.failCampaignFinalization=true;
    let executions=0;
    const runner=new ProductionCampaignRunner(
      repository,
      {runMission:async()=>{executions+=1;return{status:"completed",finalArtifactIds:["render:complete"]};}},
      {now:()=>new Date(NOW)},
    );

    await expect(runner.run(CAMPAIGN_ID)).rejects.toThrow("fixture campaign finalization persistence failure");
    const stranded=await repository.require(CAMPAIGN_ID);
    expect(stranded.status).toBe("running");
    expect(stranded.missions[0]?.status).toBe("completed");

    const recovered=await runner.run(CAMPAIGN_ID);
    expect(executions).toBe(1);
    expect(recovered.status).toBe("completed");
  });
});
