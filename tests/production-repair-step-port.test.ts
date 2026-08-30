import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import {
  ApplicationProductionRepairStepPort,
  ProductionQARepairResolver,
  ProductionQARepairTargetResolver,
} from "@/lib/production/execution/repair-step-port";
import type {ProductionQAService} from "@/lib/production/qa/service";
import type {QAReport} from "@/lib/production/qa/schema";

const PROJECT_ID="repair-project";
const MISSION_ID="11111111-1111-4111-8111-111111111111";
const PLAN_ID="22222222-2222-4222-8222-222222222222";
const EXECUTION_ID="33333333-3333-4333-8333-333333333333";
const REPORT_ID="44444444-4444-4444-8444-444444444444";
const REPAIR_OPERATION_ID="55555555-5555-4555-8555-555555555555";
const REPAIR_PROPOSAL_ID="66666666-6666-4666-8666-666666666666";
const NOW="2026-08-29T00:00:00.000Z";

const report=():QAReport=>({
  id:REPORT_ID,
  projectId:PROJECT_ID,
  missionId:MISSION_ID,
  renderJobId:"77777777-7777-4777-8777-777777777777",
  projectRevision:1,
  renderSourceProjectRevision:1,
  status:"repair-recommended",
  expectations:{hookTerms:[],ctaTerms:[],evidenceTerms:[],hookWindowSeconds:5},
  technicalEvidence:{},
  findings:[{
    id:"goal-duration-target",
    category:"goal",
    status:"fail",
    severity:"warning",
    message:"Rendered duration is outside the Mission target tolerance.",
    evidence:[],
  }],
  repairProposal:{
    id:REPAIR_PROPOSAL_ID,
    reportId:REPORT_ID,
    projectId:PROJECT_ID,
    baseProjectRevision:1,
    risk:"medium",
    requiresReview:false,
    actions:[{
      kind:"adjust-scene-timing",
      findingIds:["goal-duration-target"],
      summary:"Trim the Project to the Mission target duration.",
    }],
    createdAt:NOW,
  },
  createdAt:NOW,
});

const input=():ProductionStepRunnerInput=>({
  mission:{
    id:MISSION_ID,
    projectId:PROJECT_ID,
    target:{targetDurationSeconds:4},
    autonomyPolicy:{mode:"full-production",finalReviewRequired:false},
  } as unknown as ProductionStepRunnerInput["mission"],
  plan:{
    id:PLAN_ID,
    projectId:PROJECT_ID,
    missionId:MISSION_ID,
    version:1,
    baseProjectRevision:1,
    summary:"Repair duration once.",
    steps:[
      {id:"qa",kind:"qa",title:"QA",objective:"QA",dependsOn:[],risk:"low",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[]},
      {id:"repair",kind:"repair",title:"Repair",objective:"Repair timing",dependsOn:["qa"],risk:"medium",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[],targets:[{kind:"canvas",action:"modify"}]},
    ],
    generatedAt:NOW,
  },
  step:{id:"repair",kind:"repair",title:"Repair",objective:"Repair timing",dependsOn:["qa"],risk:"medium",owner:"application",reviewRequired:false,requiresProjectRevision:true,evidence:[],targets:[{kind:"canvas",action:"modify"}]},
  execution:{
    id:EXECUTION_ID,
    projectId:PROJECT_ID,
    missionId:MISSION_ID,
    planId:PLAN_ID,
    expectedProjectRevision:1,
    steps:[{
      stepId:"qa",
      status:"completed",
      operationId:REPORT_ID,
      attempts:1,
      evidence:[{kind:"qa-report",id:REPORT_ID}],
      completedAt:NOW,
    }],
  } as unknown as ProductionStepRunnerInput["execution"],
  operationId:REPAIR_OPERATION_ID,
  expectedProjectRevision:1,
  remainingUsageBudget:{agentTurns:4,providerCalls:4,repairLoops:1},
});

describe("ApplicationProductionRepairStepPort",()=>{
  it("derives exact protection targets from the same bounded timing commands it executes",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const projects=new ProjectRepository(fs,"/data");
    const mutations=new ProjectMutationCoordinator(fs,projects);
    await projects.create({id:PROJECT_ID,name:"Repair",width:640,height:360,fps:30,durationInFrames:180});
    await mutations.applyTransaction(PROJECT_ID,{
      expectedRevision:0,
      transactionId:"repair-fixture-setup",
      transaction:{
        label:"Repair fixture setup",
        commands:[
          {type:"add-clip",trackId:"motion-main",clip:{id:"motion-trim",type:"motion",engine:"remotion",effectId:"big-number",props:{},startFrame:0,durationInFrames:180,enabled:true,layer:0}},
          {type:"add-clip",trackId:"motion-main",clip:{id:"motion-remove",type:"motion",engine:"remotion",effectId:"big-number",props:{},startFrame:130,durationInFrames:20,enabled:true,layer:1}},
          {type:"add-scene",scene:{id:"scene-hook",name:"Hook",semanticType:"hook",startFrame:0,endFrame:80}},
          {type:"add-scene",scene:{id:"scene-cta",name:"CTA",semanticType:"cta",startFrame:80,endFrame:180}},
          {type:"add-scene",scene:{id:"scene-remove",name:"Tail",semanticType:"custom",startFrame:140,endFrame:170}},
          {type:"add-marker",marker:{id:"tail-marker",frame:150,type:"note"}},
        ],
      },
    });

    const qa={load:async()=>report()};
    const resolver=new ProductionQARepairResolver(qa as unknown as Pick<ProductionQAService,"load">);
    const targets=new ProductionQARepairTargetResolver(resolver,projects);
    const port=new ApplicationProductionRepairStepPort(resolver,projects,mutations);

    expect(await targets.resolve(input())).toEqual([
      {kind:"canvas",action:"modify"},
      {kind:"clip",id:"motion-remove",action:"remove"},
      {kind:"clip",id:"motion-trim",action:"modify"},
      {kind:"marker",id:"tail-marker",action:"remove"},
      {kind:"scene",id:"scene-cta",action:"modify"},
      {kind:"scene",id:"scene-remove",action:"remove"},
    ]);

    const result=await port.execute(input());
    const project=await projects.load(PROJECT_ID);

    expect(result).toMatchObject({status:"completed",projectRevisionAfter:2,usage:{repairLoops:1}});
    expect(project.project.revision).toBe(2);
    expect(project.canvas.durationInFrames).toBe(120);
    expect(project.tracks.find(track=>track.id==="motion-main")?.clips).toEqual([
      expect.objectContaining({id:"motion-trim",startFrame:0,durationInFrames:120}),
    ]);
    expect(project.scenes.find(scene=>scene.id==="scene-cta")).toMatchObject({startFrame:80,endFrame:120});
    expect(project.scenes.some(scene=>scene.id==="scene-remove")).toBe(false);
    expect(project.markers.some(marker=>marker.id==="tail-marker")).toBe(false);
  });
});
