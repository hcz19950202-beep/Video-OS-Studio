import {beforeEach,describe,expect,it,vi} from "vitest";

const CAMPAIGN_ID="11111111-1111-4111-8111-111111111111";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PROJECT_ID="route-project";

const mocks=vi.hoisted(()=>({
  list:vi.fn(),
  create:vi.fn(),
  enqueue:vi.fn(),
  resume:vi.fn(),
  retryFailed:vi.fn(),
  archive:vi.fn(),
  snapshot:vi.fn(),
  run:vi.fn(),
  cancelMission:vi.fn(),
}));

vi.mock("@/lib/server/campaign-runtime",()=>({
  productionCampaignService:{
    list:mocks.list,
    create:mocks.create,
    enqueue:mocks.enqueue,
    resume:mocks.resume,
    retryFailed:mocks.retryFailed,
    archive:mocks.archive,
  },
  productionCampaignDashboardService:{snapshot:mocks.snapshot},
}));

vi.mock("@/lib/server/campaign-execution-runtime",()=>({
  getServerCampaignRunner:()=>({run:mocks.run}),
  serverCampaignCancellationRunner:{cancelMission:mocks.cancelMission},
}));

import {GET as listCampaigns,POST as createCampaign} from "@/app/api/campaigns/route";
import {GET as getCampaign,POST as actOnCampaign} from "@/app/api/campaigns/[campaignId]/route";

const params=Promise.resolve({campaignId:CAMPAIGN_ID});
const dashboard={campaign:{id:CAMPAIGN_ID,status:"draft"},missions:[]};

const request=(body:unknown)=>new Request("http://127.0.0.1:3000/api/campaigns",{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify(body),
});

beforeEach(()=>{
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue({id:CAMPAIGN_ID});
  mocks.snapshot.mockResolvedValue(dashboard);
  mocks.enqueue.mockResolvedValue({id:CAMPAIGN_ID,status:"queued"});
  mocks.resume.mockResolvedValue({id:CAMPAIGN_ID,status:"queued"});
  mocks.retryFailed.mockResolvedValue({id:CAMPAIGN_ID,status:"queued"});
  mocks.archive.mockResolvedValue({id:CAMPAIGN_ID,status:"archived"});
  mocks.run.mockResolvedValue({id:CAMPAIGN_ID,status:"completed"});
  mocks.cancelMission.mockResolvedValue({id:CAMPAIGN_ID});
});

describe("B7 Campaign route handlers",()=>{
  it("lists and creates Campaigns through the bounded service",async()=>{
    const listed=await listCampaigns();
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual({campaigns:[]});

    const created=await createCampaign(request({
      title:"Route Campaign",
      maxConcurrency:2,
      sharedReferences:{assetIds:["asset.route"],policyIds:[],skillIds:[],exportTemplateIds:[]},
      missions:[{projectId:PROJECT_ID,missionId:MISSION_ID}],
    }));
    expect(created.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("returns a live dashboard and dispatches only explicit actions",async()=>{
    const got=await getCampaign(new Request(`http://127.0.0.1:3000/api/campaigns/${CAMPAIGN_ID}`),{params});
    expect(got.status).toBe(200);
    expect(mocks.snapshot).toHaveBeenCalledWith(CAMPAIGN_ID);

    for(const action of ["enqueue","resume","retry-failed","archive"] as const){
      const response=await actOnCampaign(request({action}),{params});
      expect(response.status).toBe(200);
    }
    expect(mocks.enqueue).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mocks.resume).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mocks.retryFailed).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(mocks.archive).toHaveBeenCalledWith(CAMPAIGN_ID);

    const runResponse=await actOnCampaign(request({action:"run"}),{params});
    expect(runResponse.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith(CAMPAIGN_ID);

    const cancelResponse=await actOnCampaign(request({action:"cancel-mission",projectId:PROJECT_ID,missionId:MISSION_ID}),{params});
    expect(cancelResponse.status).toBe(200);
    expect(mocks.cancelMission).toHaveBeenCalledWith(CAMPAIGN_ID,{projectId:PROJECT_ID,missionId:MISSION_ID});
  });

  it("does not bind durable Campaign execution to the HTTP abort signal",async()=>{
    const controller=new AbortController();
    const runRequest=new Request("http://127.0.0.1:3000/api/campaigns",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({action:"run"}),
      signal:controller.signal,
    });
    controller.abort();
    const response=await actOnCampaign(runRequest,{params});
    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith(CAMPAIGN_ID);
  });

  it("fails closed on unknown or over-privileged actions",async()=>{
    const unknown=await actOnCampaign(request({action:"approve-review"}),{params});
    expect(unknown.status).toBe(400);
    const smuggled=await actOnCampaign(request({action:"run",shell:"cmd.exe"}),{params});
    expect(smuggled.status).toBe(400);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
