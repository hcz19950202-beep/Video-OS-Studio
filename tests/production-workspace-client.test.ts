import {afterEach,describe,expect,it,vi} from "vitest";
import {cancelProductionMission,createProductionMission,getProductionWorkspace,listProductionMissions,updateProductionMission} from "@/lib/client/production-workspace";

const missionId="00000000-0000-4000-8000-000000000401";
const mission={id:missionId,projectId:"demo",title:"Mission",brief:"Bounded production.",target:{},autonomyPolicy:{mode:"guided",finalReviewRequired:true},baseProjectRevision:0,status:"draft",qaReportIds:[],agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-29T04:00:00.000Z",updatedAt:"2026-08-29T04:00:00.000Z"};
const workspace={mission};

afterEach(()=>vi.unstubAllGlobals());

const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});

describe("V2.4 B5c Production Workspace browser client",()=>{
  it("uses only scoped Mission endpoints and bounded JSON methods",async()=>{
    const fetch=vi.fn()
      .mockResolvedValueOnce(json({missions:[mission]}))
      .mockResolvedValueOnce(json({mission},201))
      .mockResolvedValueOnce(json({workspace}))
      .mockResolvedValueOnce(json({workspace}))
      .mockResolvedValueOnce(json({workspace}));
    vi.stubGlobal("fetch",fetch);
    await listProductionMissions("demo");
    await createProductionMission("demo",{title:"Mission",brief:"Bounded production.",autonomyPolicy:{mode:"guided",finalReviewRequired:true}});
    await getProductionWorkspace("demo",missionId);
    await updateProductionMission("demo",missionId,{autonomyPolicy:{mode:"assist",finalReviewRequired:true}});
    await cancelProductionMission("demo",missionId);
    expect(fetch.mock.calls.map(call=>String(call[0]))).toEqual([
      "/api/projects/demo/missions",
      "/api/projects/demo/missions",
      `/api/projects/demo/missions/${missionId}`,
      `/api/projects/demo/missions/${missionId}`,
      `/api/projects/demo/missions/${missionId}`,
    ]);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({method:"POST"});
    expect(fetch.mock.calls[3]?.[1]).toMatchObject({method:"PATCH"});
    expect(fetch.mock.calls[4]?.[1]).toMatchObject({method:"DELETE"});
  });
});
