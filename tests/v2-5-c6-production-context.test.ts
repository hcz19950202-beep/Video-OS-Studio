import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("V2.5 C6 production Context surfaces",()=>{
  it("reads Mission and QA from the durable Production Workspace instead of copying truth into Project UI state",()=>{
    const surface=read("components/studio/ProductionContextSurface.tsx");
    expect(surface).toContain("listProductionMissions");
    expect(surface).toContain("getProductionWorkspace");
    expect(surface).toContain("ProductionWorkspaceSnapshot");
    expect(surface).toContain("workspace.finalRenderReadiness");
    expect(surface).toContain("workspace.evidence");
    expect(surface).toContain("workspace.latestQA?.findings");
    expect(surface).not.toContain("createProductionMission");
    expect(surface).not.toContain("updateProductionMission");
    expect(surface).not.toContain("cancelProductionMission");
  });

  it("routes Mission step and QA finding Ask Agent actions through Selection Mode ContextReferences",()=>{
    const surface=read("components/studio/ProductionContextSurface.tsx");
    expect(surface).toContain('kind:"mission-step"');
    expect(surface).toContain('kind:"qa-finding"');
    expect(surface).toContain('data-testid={`ask-agent-mission-step-${step.id}`}');
    expect(surface).toContain('data-testid={`ask-agent-qa-finding-${finding.id}`}');
    const missionHandler=surface.slice(surface.indexOf("const askAgentMissionStep"),surface.indexOf("const askAgentFinding"));
    const qaHandler=surface.slice(surface.indexOf("const askAgentFinding"),surface.indexOf("if(error)"));
    expect(missionHandler.indexOf("setContextSelectionMode(true)")).toBeLessThan(missionHandler.indexOf("selectContextTarget"));
    expect(qaHandler.indexOf("setContextSelectionMode(true)")).toBeLessThan(qaHandler.indexOf("selectContextTarget"));
  });

  it("shows a QA timeline location only when repair evidence identifies a real Project scene",()=>{
    const surface=read("components/studio/ProductionContextSurface.tsx");
    expect(surface).toContain("workspace?.latestQA?.repairProposal?.actions");
    expect(surface).toContain("if(!action.sceneId)continue");
    expect(surface).toContain("sceneById.get(action.sceneId)");
    expect(surface).toContain("startFrame:scene.startFrame");
    expect(surface).toContain("location.sceneName");
    expect(surface).toContain("location.startFrame");
  });

  it("keeps repair requests review-only inside Context Dock",()=>{
    const surface=read("components/studio/ProductionContextSurface.tsx");
    expect(surface).toContain("repairProposal?.requiresReview");
    expect(surface).toContain("Context Dock never executes it automatically");
    expect(surface).not.toContain("prepareQARepair");
    expect(surface).not.toContain("applyQARepair");
  });

  it("wires both frozen Context tabs to the same durable Production surface and removes the placeholder QA health view",()=>{
    const dock=read("components/studio/AgentNativeContextDock.tsx");
    expect(dock).toContain('<ProductionContextSurface project={project} mode="mission"/>');
    expect(dock).toContain('<ProductionContextSurface project={project} mode="qa"/>');
    expect(dock).not.toContain("ProductionMissionPanel");
    expect(dock).not.toContain("enabledClips");
    expect(dock).not.toContain("Project health view");
  });
});
