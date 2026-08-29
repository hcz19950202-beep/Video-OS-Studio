import {describe,expect,it} from "vitest";
import {
  parseProductionCampaignId,
  ProductionCampaignActionRequestSchema,
  productionCampaignErrorResponse,
} from "@/lib/production/campaign/http";
import {
  ProductionCampaignMissionNotFoundError,
  ProductionCampaignNotFoundError,
  ProductionCampaignStateError,
} from "@/lib/production/campaign/errors";
import {ServerCampaignExecutionUnavailableError} from "@/lib/server/campaign-execution-runtime";

const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const MISSION_ID="22222222-2222-4222-8222-222222222222";

describe("B7 Campaign HTTP contract",()=>{
  it("accepts only bounded Campaign actions",()=>{
    expect(ProductionCampaignActionRequestSchema.parse({action:"enqueue"})).toEqual({action:"enqueue"});
    expect(ProductionCampaignActionRequestSchema.parse({action:"run"})).toEqual({action:"run"});
    expect(ProductionCampaignActionRequestSchema.parse({action:"retry-failed"})).toEqual({action:"retry-failed"});
    expect(ProductionCampaignActionRequestSchema.parse({action:"archive"})).toEqual({action:"archive"});
    expect(ProductionCampaignActionRequestSchema.parse({
      action:"cancel-mission",
      projectId:"campaign-project",
      missionId:MISSION_ID,
    })).toEqual({action:"cancel-mission",projectId:"campaign-project",missionId:MISSION_ID});
    expect(()=>ProductionCampaignActionRequestSchema.parse({action:"approve-review"})).toThrow();
    expect(()=>ProductionCampaignActionRequestSchema.parse({action:"run",shell:"cmd.exe"})).toThrow();
  });

  it("requires canonical Campaign IDs at the route boundary",()=>{
    expect(parseProductionCampaignId(CAMPAIGN_ID)).toBe(CAMPAIGN_ID);
    expect(()=>parseProductionCampaignId("../campaign.json")).toThrow();
  });

  it("maps durable Campaign errors without leaking internals",async()=>{
    const missing=productionCampaignErrorResponse(new ProductionCampaignNotFoundError(CAMPAIGN_ID));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({error:"campaign_not_found",retryable:false});

    const missionMissing=productionCampaignErrorResponse(new ProductionCampaignMissionNotFoundError(CAMPAIGN_ID,"project-a",MISSION_ID));
    expect(missionMissing.status).toBe(404);

    const conflict=productionCampaignErrorResponse(new ProductionCampaignStateError(CAMPAIGN_ID,"running"));
    expect(conflict.status).toBe(409);

    const unavailable=productionCampaignErrorResponse(new ServerCampaignExecutionUnavailableError());
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error:"campaign_execution_unavailable",
      message:"Campaign execution is unavailable until the bounded Production runtime is configured.",
      retryable:true,
    });

    const internal=productionCampaignErrorResponse(new Error("C:\\secret\\provider-key.txt"));
    expect(internal.status).toBe(500);
    expect(JSON.stringify(await internal.json())).not.toContain("secret");
  });
});
