import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {createProtectedProductionExecutionService} from "@/lib/production/autonomy/composition";
import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {ProductionEditProtectionService} from "@/lib/production/autonomy/service";
import type {ProductionStepRunner} from "@/lib/production/execution/executor";
import {ProductionExecutionRepository} from "@/lib/production/execution/repository";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanSchema} from "@/lib/production/plan/schema";
import {ProjectSchema} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const EXECUTION_ID="44444444-4444-4444-8444-444444444444";
const OPERATION_ID="66666666-6666-4666-8666-666666666666";
const CHECKPOINT_ID="77777777-7777-4777-8777-777777777777";

const project=ProjectSchema.parse({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Project One",revision:5,createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
  tracks:[{id:"motion-main",type:"motion",name:"Motion",locked:false,hidden:false,clips:[]}],
});

const mission=ProductionMissionSchema.parse({
  id:MISSION_ID,projectId:PROJECT_ID,title:"Builder ad",brief:"Create a proof-led B2B video.",
  autonomyPolicy:{mode:"auto",finalReviewRequired:false},baseProjectRevision:5,status:"ready",planId:PLAN_ID,
  createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:01.000Z",
});

const plan=ProductionPlanSchema.parse({
  id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,version:1,baseProjectRevision:5,summary:"Apply one bounded visual edit.",
  steps:[{
    id:"edit-project",kind:"edit-project",title:"Edit project",objective:"Add one bounded AI visual.",dependsOn:[],risk:"medium",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:[],
    targets:[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"ai-new",action:"create"}],
  }],
  generatedAt:"2026-08-29T00:00:01.000Z",
});

describe("V2.4 B5b protected execution composition",()=>{
  it("blocks a human-modified target through the real execution service before delegate side effects",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const missions=new ProductionMissionRepository(fs,"/data");
    const plans=new ProductionPlanRepository(fs,"/data");
    const executions=new ProductionExecutionRepository(fs,"/data");
    const protectionRepository=new ProductionEditProtectionRepository(fs,"/data",()=>"2026-08-29T00:00:02.000Z");
    const protection=new ProductionEditProtectionService(protectionRepository,()=>"2026-08-29T00:00:02.000Z");
    await missions.create(mission);
    await plans.create(plan);
    await protection.markHumanModified(PROJECT_ID,{kind:"track",id:"motion-main"},5,"Manual timeline edit.");

    let delegateCalls=0;
    const runner:ProductionStepRunner={execute:async()=>{
      delegateCalls+=1;
      return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5};
    }};
    const service=createProtectedProductionExecutionService({
      missions,plans,executions,projects:{load:async()=>project},runner,protection,
      targets:{resolve:async()=>[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"ai-new",action:"create"}]},
    },{
      now:()=>"2026-08-29T00:00:03.000Z",
      createExecutionId:()=>EXECUTION_ID,
      createOperationId:()=>OPERATION_ID,
      createCheckpointId:()=>CHECKPOINT_ID,
    });

    const execution=await service.advance(PROJECT_ID,MISSION_ID);
    expect(execution.status).toBe("blocked");
    expect(execution.steps[0]).toMatchObject({status:"blocked",lastFailure:{code:"EDIT_PROTECTION_REVIEW_REQUIRED",retryable:false}});
    expect(delegateCalls).toBe(0);
  });
});
