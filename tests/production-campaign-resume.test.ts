import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionCampaignRepository} from "@/lib/production/campaign/repository";
import {ProductionCampaignService} from "@/lib/production/campaign/service";
import type {ProductionMission} from "@/lib/production/mission/schema";

const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const NOW="2026-08-29T13:00:00.000Z";
const ref={projectId:"resume-project",missionId:MISSION_ID};
const mission:ProductionMission={
  id:MISSION_ID,
  projectId:ref.projectId,
  title:"Resume Mission",
  brief:"Resume fixture.",
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

describe("B7 Campaign resume",()=>{
  it("requeues only waiting-review or blocked Missions without changing underlying Mission truth",async()=>{
    const repository=new ProductionCampaignRepository(new InMemoryFileSystemAdapter(),"/data");
    const service=new ProductionCampaignService(repository,{load:async()=>mission},{now:()=>new Date(NOW),createId:()=>CAMPAIGN_ID});
    await service.create({title:"Resume Campaign",missions:[ref]});
    await repository.mutate(CAMPAIGN_ID,current=>({
      ...current,
      status:"waiting-review",
      revision:2,
      missions:current.missions.map(item=>({...item,status:"waiting-review" as const,currentStep:"review-final",attempt:1})),
    }));
    const resumed=await service.resume(CAMPAIGN_ID);
    expect(resumed.status).toBe("queued");
    expect(resumed.missions[0]).toMatchObject({status:"pending",attempt:1});
    expect(resumed.missions[0]?.currentStep).toBeUndefined();
    expect(mission.status).toBe("ready");
  });
});
