import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("V2.5 C6 Campaign navigation and Project handoff",()=>{
  it("keeps Campaign as a separate top-level surface while exposing it from the Studio command strip",()=>{
    const command=read("components/studio/AgentNativeCommandStrip.tsx");
    const campaigns=read("app/campaigns/page.tsx");
    expect(command).toContain('data-testid="open-campaigns"');
    expect(command).toContain("onOpenCampaigns");
    expect(campaigns).toContain('href="/"');
    expect(campaigns).toContain("CampaignDashboardClient");
  });

  it("hands a Campaign Mission to Studio using logical Project and Mission IDs only",()=>{
    const dashboard=read("components/campaign/CampaignDashboardClient.tsx");
    const page=read("app/page.tsx");
    expect(dashboard).toContain('query:{projectId:run.projectId,missionId:run.missionId}');
    expect(dashboard).toContain('data-testid={`open-mission-project-${run.missionId}`}');
    expect(page).toContain("ProjectIdSchema.safeParse");
    expect(page).toContain("ProductionMissionIdSchema.safeParse");
    expect(page).toContain("CampaignMissionHandoffController");
    expect(page).not.toContain("ProductionCampaign");
  });

  it("loads the real Project and keeps Campaign state out of Project truth",()=>{
    const controller=read("components/studio/CampaignMissionHandoffController.tsx");
    expect(controller).toContain("loadStudioProject(projectId)");
    expect(controller).toContain("useProjectStore.getState().setProject(project)");
    expect(controller).toContain("setPreferredMissionId(missionId)");
    expect(controller).not.toContain("CampaignDashboard");
    expect(controller).not.toContain("setCampaign");
  });

  it("opens the handed-off Mission context and clears ephemeral handoff when the user navigates elsewhere",()=>{
    const shell=read("components/studio/ResizableWorkspaceShell.tsx");
    const surface=read("components/studio/ProductionContextSurface.tsx");
    expect(shell).toContain('effectiveContextTab=preferredMissionId?"mission":contextTab');
    expect(shell).toContain("clearHandoff");
    expect(shell).toContain("preferredMissionId={preferredMissionId??undefined}");
    expect(surface).toContain("preferredMissionId&&next.some(item=>item.id===preferredMissionId)");
    expect(surface).toContain("getProductionWorkspace(projectId,missionId)");
  });

  it("does not weaken existing Campaign cancel/retry isolation contracts",()=>{
    const dashboard=read("components/campaign/CampaignDashboardClient.tsx");
    expect(dashboard).toContain('{action:"retry-failed"}');
    expect(dashboard).toContain('{action:"cancel-mission",projectId:run.projectId,missionId:run.missionId}');
    expect(dashboard).not.toContain("useProjectStore");
  });
});
