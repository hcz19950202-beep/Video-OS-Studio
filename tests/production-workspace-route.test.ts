import {beforeEach,describe,expect,it,vi} from "vitest";
import {ProductionMissionProjectUnavailableError} from "@/lib/production/mission/errors";
import {ProductionWorkspaceTruthInconsistentError} from "@/lib/production/workspace/errors";

const fakes=vi.hoisted(()=>({
  productionMissionService:{create:vi.fn(),updateDetails:vi.fn(),cancel:vi.fn()},
  productionWorkspaceService:{listMissions:vi.fn(),snapshot:vi.fn()},
}));
vi.mock("@/lib/server/runtime",()=>fakes);

import * as missionsRoute from "@/app/api/projects/[projectId]/missions/route";
import * as missionRoute from "@/app/api/projects/[projectId]/missions/[missionId]/route";

const missionId="00000000-0000-4000-8000-000000000301";
const mission={
  id:missionId,projectId:"demo",title:"Mission",brief:"Produce a bounded video.",target:{},autonomyPolicy:{mode:"guided",finalReviewRequired:true},baseProjectRevision:2,status:"draft",qaReportIds:[],agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-29T04:00:00.000Z",updatedAt:"2026-08-29T04:00:00.000Z",
};
const workspace={mission};

beforeEach(()=>vi.clearAllMocks());

describe("V2.4 B5c Production Workspace route contracts",()=>{
  it("lists and creates Missions with Project scope owned by the route",async()=>{
    fakes.productionWorkspaceService.listMissions.mockResolvedValue([mission]);
    fakes.productionMissionService.create.mockResolvedValue(mission);
    const context={params:Promise.resolve({projectId:"demo"})};
    const listed=await missionsRoute.GET(new Request("http://localhost/api/projects/demo/missions"),context);
    expect(listed.status).toBe(200);expect((await listed.json()).missions).toHaveLength(1);
    const created=await missionsRoute.POST(new Request("http://localhost/api/projects/demo/missions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Mission",brief:"Produce a bounded video.",autonomyPolicy:{mode:"guided",finalReviewRequired:true}})}),context);
    expect(created.status).toBe(201);
    expect(fakes.productionMissionService.create).toHaveBeenCalledWith(expect.objectContaining({projectId:"demo",title:"Mission"}));
  });

  it("rejects caller-supplied Project scope in the Mission body",async()=>{
    const response=await missionsRoute.POST(new Request("http://localhost/api/projects/demo/missions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId:"other",title:"Mission",brief:"Produce a bounded video.",autonomyPolicy:{mode:"guided",finalReviewRequired:true}})}),{params:Promise.resolve({projectId:"demo"})});
    expect(response.status).toBe(400);
    expect(fakes.productionMissionService.create).not.toHaveBeenCalled();
  });

  it("loads, updates, and cancels through durable Mission services without an execution action",async()=>{
    fakes.productionWorkspaceService.snapshot.mockResolvedValue(workspace);
    fakes.productionMissionService.updateDetails.mockResolvedValue(mission);
    fakes.productionMissionService.cancel.mockResolvedValue({...mission,status:"cancelled"});
    const context={params:Promise.resolve({projectId:"demo",missionId})};
    const loaded=await missionRoute.GET(new Request(`http://localhost/api/projects/demo/missions/${missionId}`),context);
    expect(loaded.status).toBe(200);
    const updated=await missionRoute.PATCH(new Request(`http://localhost/api/projects/demo/missions/${missionId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({autonomyPolicy:{mode:"assist",finalReviewRequired:true}})}),context);
    expect(updated.status).toBe(200);
    expect(fakes.productionMissionService.updateDetails).toHaveBeenCalledWith("demo",missionId,{autonomyPolicy:{mode:"assist",finalReviewRequired:true}});
    const cancelled=await missionRoute.DELETE(new Request(`http://localhost/api/projects/demo/missions/${missionId}`,{method:"DELETE"}),context);
    expect(cancelled.status).toBe(200);
    expect(fakes.productionMissionService.cancel).toHaveBeenCalledWith("demo",missionId);
    expect(fakes.productionWorkspaceService.snapshot).toHaveBeenCalledTimes(3);
  });

  it("normalizes unavailable Project reads without leaking repository details",async()=>{
    fakes.productionWorkspaceService.listMissions.mockRejectedValue(new ProductionMissionProjectUnavailableError("demo"));
    const response=await missionsRoute.GET(new Request("http://localhost/api/projects/demo/missions"),{params:Promise.resolve({projectId:"demo"})});
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({error:"project_unavailable",retryable:false});
  });

  it("returns a bounded conflict when Mission-linked durable truth is inconsistent",async()=>{
    fakes.productionWorkspaceService.snapshot.mockRejectedValue(new ProductionWorkspaceTruthInconsistentError());
    const response=await missionRoute.GET(new Request(`http://localhost/api/projects/demo/missions/${missionId}`),{params:Promise.resolve({projectId:"demo",missionId})});
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({error:"mission_truth_inconsistent",retryable:false});
  });

  it("sanitizes unexpected runtime failures",async()=>{
    fakes.productionWorkspaceService.snapshot.mockRejectedValue(new Error("C:\\Users\\secret\\mission.json"));
    const response=await missionRoute.GET(new Request(`http://localhost/api/projects/demo/missions/${missionId}`),{params:Promise.resolve({projectId:"demo",missionId})});
    expect(response.status).toBe(500);
    const body=await response.json();
    expect(JSON.stringify(body)).not.toContain("Users");
    expect(body.error).toBe("mission_workspace_failed");
  });
});
