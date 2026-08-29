import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {QAReportRepository} from "@/lib/production/qa/repository";
import {ProductionWorkspaceService} from "@/lib/production/workspace/service";
import {ProjectRepository} from "@/lib/project/repository";

const at="2026-08-29T04:00:00.000Z";
const missionId="00000000-0000-4000-8000-000000000101";
const planId="00000000-0000-4000-8000-000000000102";
const executionId="00000000-0000-4000-8000-000000000103";
const checkpointId="00000000-0000-4000-8000-000000000104";
const reportId="00000000-0000-4000-8000-000000000105";
const renderJobId="00000000-0000-4000-8000-000000000106";
const operation1="00000000-0000-4000-8000-000000000107";
const operation2="00000000-0000-4000-8000-000000000108";
const operation3="00000000-0000-4000-8000-000000000109";

const setup=async()=>{
  const fs=new InMemoryFileSystemAdapter();
  const projects=new ProjectRepository(fs,"/data");
  await projects.create({id:"workspace-demo",name:"Workspace Demo",now:at,width:1920,height:1080,fps:30,durationInFrames:300});
  const missions=new ProductionMissionRepository(fs,"/data");
  const plans=new ProductionPlanRepository(fs,"/data");
  const executions=new ProductionExecutionRepository(fs,"/data");
  const qa=new QAReportRepository(fs,"/data");
  const service=new ProductionWorkspaceService(projects,missions,plans,executions,qa);
  return{missions,plans,executions,qa,service};
};

const createMission=async(missions:ProductionMissionRepository,overrides:Record<string,unknown>={})=>missions.create({
  id:missionId,
  projectId:"workspace-demo",
  title:"Produce a proof-led B2B short",
  brief:"Use the current Project to produce a concise proof-led social video.",
  target:{platform:"facebook",format:"talking-head",targetDurationSeconds:10,language:"en"},
  autonomyPolicy:{mode:"guided",finalReviewRequired:true},
  baseProjectRevision:0,
  status:"draft",
  createdAt:at,
  updatedAt:at,
  ...overrides,
});

const planSteps=[
  {id:"analyze",kind:"analyze-script" as const,title:"Analyze script",objective:"Identify the strongest proof and hook.",dependsOn:[],risk:"low" as const,owner:"agent" as const,reviewRequired:false,requiresProjectRevision:false,evidence:[{kind:"skill" as const,id:"caption-emphasis@1.0.0"},{kind:"asset" as const,id:"source-video"}]},
  {id:"edit",kind:"edit-project" as const,title:"Apply bounded edit",objective:"Apply the approved bounded Project changes.",dependsOn:["analyze"],risk:"medium" as const,owner:"agent" as const,reviewRequired:false,requiresProjectRevision:true,evidence:[{kind:"skill" as const,id:"caption-emphasis@1.0.0"}]},
  {id:"render",kind:"render-final" as const,title:"Render final",objective:"Create the final encoded output.",dependsOn:["edit"],risk:"high" as const,owner:"job" as const,reviewRequired:true,requiresProjectRevision:true,evidence:[]},
];
const renderOnlyStep={...planSteps[2],dependsOn:[]};

describe("V2.4 B5c Production Workspace read model",()=>{
  it("keeps a draft Mission as durable truth without inventing execution state",async()=>{
    const{missions,service}=await setup();
    await createMission(missions);
    const workspace=await service.snapshot("workspace-demo",missionId);
    expect(workspace.activity.state).toBe("draft");
    expect(workspace.plan).toBeNull();
    expect(workspace.execution).toBeNull();
    expect(workspace.progress).toEqual({totalSteps:0,completedSteps:0,percent:0});
    expect(workspace.qa.state).toBe("not-run");
    expect(workspace.finalRenderReadiness).toBe("not-planned");
  });

  it("derives progress, checkpoint, links, skills, and evidence from Plan + Execution truth",async()=>{
    const{missions,plans,executions,service}=await setup();
    await createMission(missions,{status:"waiting-review",planId,executionId,activeStepId:"render"});
    await plans.create({id:planId,projectId:"workspace-demo",missionId,version:1,baseProjectRevision:0,summary:"Analyze, edit, then render.",steps:planSteps,generatedAt:at});
    await executions.create({
      id:executionId,projectId:"workspace-demo",missionId,planId,planBaseProjectRevision:0,expectedProjectRevision:0,status:"waiting-review",activeStepId:"render",budget:{},counters:{},createdAt:at,updatedAt:at,
      steps:[
        {stepId:"analyze",status:"completed",operationId:operation1,attempts:1,evidence:[{kind:"agent-session",id:"00000000-0000-4000-8000-000000000201"},{kind:"skill",id:"caption-emphasis@1.0.0"}],startedAt:at,completedAt:at},
        {stepId:"edit",status:"completed",operationId:operation2,attempts:1,evidence:[{kind:"workflow",id:"00000000-0000-4000-8000-000000000202"},{kind:"job",id:"00000000-0000-4000-8000-000000000203"}],startedAt:at,completedAt:at},
        {stepId:"render",status:"waiting-review",operationId:operation3,attempts:0,evidence:[],checkpoint:{id:checkpointId,stepId:"render",reason:"Final render is a high-risk production step.",status:"pending",createdAt:at}},
      ],
    });
    const workspace=await service.snapshot("workspace-demo",missionId);
    expect(workspace.activity).toMatchObject({state:"waiting-review",stepId:"render",title:"Render final",risk:"high",stepStatus:"waiting-review"});
    expect(workspace.progress).toEqual({totalSteps:3,completedSteps:2,percent:66.7,activeStepId:"render"});
    expect(workspace.reviewCheckpoints).toHaveLength(1);
    expect(workspace.skillsUsed).toEqual(["caption-emphasis@1.0.0"]);
    expect(workspace.links.agentSessionIds).toEqual(["00000000-0000-4000-8000-000000000201"]);
    expect(workspace.links.workflowRunIds).toEqual(["00000000-0000-4000-8000-000000000202"]);
    expect(workspace.links.jobIds).toEqual(["00000000-0000-4000-8000-000000000203"]);
    expect(workspace.finalRenderReadiness).toBe("review-required");
  });

  it("reports final QA readiness only when render and QA evidence match the current Project revision",async()=>{
    const{missions,plans,executions,qa,service}=await setup();
    await createMission(missions,{status:"completed",planId,executionId,qaReportIds:[reportId]});
    await plans.create({id:planId,projectId:"workspace-demo",missionId,version:1,baseProjectRevision:0,summary:"Render the accepted final.",steps:[renderOnlyStep],generatedAt:at});
    await executions.create({
      id:executionId,projectId:"workspace-demo",missionId,planId,planBaseProjectRevision:0,expectedProjectRevision:0,status:"completed",budget:{},counters:{},createdAt:at,updatedAt:at,
      steps:[{stepId:"render",status:"completed",operationId:operation3,attempts:1,evidence:[{kind:"render",id:"render-output"},{kind:"job",id:renderJobId}],startedAt:at,completedAt:at}],
    });
    await qa.create({id:reportId,projectId:"workspace-demo",missionId,renderJobId,projectRevision:0,renderSourceProjectRevision:0,status:"pass",expectations:{},technicalEvidence:{renderArtifactId:"render-output",durationSeconds:10,width:1920,height:1080,fps:30,hasAudio:true},findings:[{id:"technical-render",category:"technical",status:"pass",severity:"info",message:"Final render evidence is valid.",evidence:[]}],createdAt:at});
    const workspace=await service.snapshot("workspace-demo",missionId);
    expect(workspace.activity.state).toBe("completed");
    expect(workspace.progress.percent).toBe(100);
    expect(workspace.qa).toMatchObject({state:"pass",status:"pass",pass:1,fail:0});
    expect(workspace.finalRenderReadiness).toBe("qa-passed");
  });

  it("fails final readiness closed when an unstarted immutable Plan targets another Project revision",async()=>{
    const{missions,plans,service}=await setup();
    await createMission(missions,{status:"ready",planId});
    await plans.create({id:planId,projectId:"workspace-demo",missionId,version:1,baseProjectRevision:1,summary:"Stale plan fixture.",steps:[renderOnlyStep],generatedAt:at});
    const workspace=await service.snapshot("workspace-demo",missionId);
    expect(workspace.stale.plan).toBe(true);
    expect(workspace.finalRenderReadiness).toBe("stale");
  });
});
