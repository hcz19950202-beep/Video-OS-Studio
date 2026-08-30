import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {ProtectedProductionStepRunner} from "@/lib/production/autonomy/runner";
import {ProductionEditProtectionService} from "@/lib/production/autonomy/service";
import type {ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import {
  ApplicationProductionRepairStepPort,
  ProductionQARepairResolver,
  ProductionQARepairTargetResolver,
} from "@/lib/production/execution/repair-step-port";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import type {QAReport} from "@/lib/production/qa/schema";

const PROJECT_ID="repair-protection-project";
const MISSION_ID="81111111-1111-4111-8111-111111111111";
const REPORT_ID="82222222-2222-4222-8222-222222222222";
const OPERATION_ID="83333333-3333-4333-8333-333333333333";
const NOW="2026-08-30T00:00:00.000Z";

const qaReport=():QAReport=>({
  id:REPORT_ID,
  projectId:PROJECT_ID,
  missionId:MISSION_ID,
  renderJobId:"84444444-4444-4444-8444-444444444444",
  projectRevision:1,
  renderSourceProjectRevision:1,
  status:"repair-recommended",
  expectations:{hookTerms:[],ctaTerms:[],evidenceTerms:[],hookWindowSeconds:5},
  technicalEvidence:{},
  findings:[{id:"goal-duration-target",category:"goal",status:"fail",severity:"warning",message:"Duration exceeds target.",evidence:[]}],
  repairProposal:{
    id:"85555555-5555-4555-8555-555555555555",
    reportId:REPORT_ID,
    projectId:PROJECT_ID,
    baseProjectRevision:1,
    risk:"medium",
    requiresReview:false,
    actions:[{kind:"adjust-scene-timing",findingIds:["goal-duration-target"],summary:"Trim to target."}],
    createdAt:NOW,
  },
  createdAt:NOW,
});

const runnerInput=():ProductionStepRunnerInput=>({
  mission:{id:MISSION_ID,projectId:PROJECT_ID,target:{targetDurationSeconds:4},autonomyPolicy:{mode:"full-production",finalReviewRequired:false}} as unknown as ProductionStepRunnerInput["mission"],
  plan:{id:"86666666-6666-4666-8666-666666666666",projectId:PROJECT_ID,missionId:MISSION_ID,version:1,baseProjectRevision:1,summary:"Repair",steps:[],generatedAt:NOW} as unknown as ProductionStepRunnerInput["plan"],
  step:{
    id:"repair",
    kind:"repair",
    title:"Repair",
    objective:"Bounded timing repair",
    dependsOn:["qa"],
    risk:"medium",
    owner:"application",
    reviewRequired:false,
    requiresProjectRevision:true,
    evidence:[],
    // Legacy V2.4.1 repair Plans declared only canvas:modify. The exact application
    // resolver must override this underspecified historical scope for protection.
    targets:[{kind:"canvas",action:"modify"}],
  },
  execution:{
    id:"87777777-7777-4777-8777-777777777777",
    projectId:PROJECT_ID,
    missionId:MISSION_ID,
    planId:"86666666-6666-4666-8666-666666666666",
    expectedProjectRevision:1,
    steps:[
      {stepId:"qa",status:"completed",operationId:REPORT_ID,attempts:1,evidence:[{kind:"qa-report",id:REPORT_ID}],completedAt:NOW},
      {stepId:"repair",status:"running",operationId:OPERATION_ID,attempts:1,evidence:[]},
    ],
  } as unknown as ProductionStepRunnerInput["execution"],
  operationId:OPERATION_ID,
  expectedProjectRevision:1,
  remainingUsageBudget:{agentTurns:4,providerCalls:4,repairLoops:1},
});

describe("V2.4.2 repair protection regression",()=>{
  it("blocks a timing repair before mutation when an affected clip is inside a locked track",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const projects=new ProjectRepository(fs,"/data");
    const mutations=new ProjectMutationCoordinator(fs,projects);
    await projects.create({id:PROJECT_ID,name:"Repair protection",width:640,height:360,fps:30,durationInFrames:180});
    await mutations.applyTransaction(PROJECT_ID,{
      expectedRevision:0,
      transactionId:"locked-repair-fixture",
      transaction:{label:"Create locked content",commands:[
        {type:"add-clip",trackId:"motion-main",clip:{id:"locked-motion",type:"motion",engine:"remotion",effectId:"big-number",props:{},startFrame:0,durationInFrames:180,enabled:true,layer:0}},
        {type:"set-track-state",trackId:"motion-main",locked:true},
      ]},
    });

    const repairs=new ProductionQARepairResolver({load:async()=>qaReport()});
    const delegate=new ApplicationProductionRepairStepPort(repairs,projects,mutations);
    const targets=new ProductionQARepairTargetResolver(repairs,projects);
    const protectionRepository=new ProductionEditProtectionRepository(fs,"/data");
    const protection=new ProductionEditProtectionService(protectionRepository);
    const runner=new ProtectedProductionStepRunner(delegate,projects,protection,targets);

    const result=await runner.execute(runnerInput());
    const project=await projects.load(PROJECT_ID);

    expect(result).toMatchObject({status:"blocked",code:"EDIT_PROTECTION_BLOCKED"});
    expect(project.project.revision).toBe(1);
    expect(project.canvas.durationInFrames).toBe(180);
    expect(project.tracks.find(track=>track.id==="motion-main")?.clips).toEqual([
      expect.objectContaining({id:"locked-motion",durationInFrames:180}),
    ]);
  });
});
