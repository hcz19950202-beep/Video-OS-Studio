import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {assertProductionMutationTargetsDeclared,productionMutationTargetsForCommands,ProductionMutationScopeError} from "@/lib/production/autonomy/commands";
import {evaluateProductionEditProtection} from "@/lib/production/autonomy/policy";
import {ProductionEditProtectionRepository} from "@/lib/production/autonomy/repository";
import {ProtectedProductionStepRunner} from "@/lib/production/autonomy/runner";
import {ProductionMutationTargetSchema} from "@/lib/production/autonomy/schema";
import {ProductionEditProtectionService} from "@/lib/production/autonomy/service";
import type {ProductionStepRunner,ProductionStepRunnerInput} from "@/lib/production/execution/executor";
import {evaluateProductionStepRisk} from "@/lib/production/execution/risk-policy";
import {ProductionExecutionSchema} from "@/lib/production/execution/schema";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import {ProductionPlanSchema,ProductionPlanStepSchema,type ProductionPlanStep} from "@/lib/production/plan/schema";
import {ProjectCommandSchema} from "@/lib/project/commands";
import {ProjectSchema,type Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const EXECUTION_ID="44444444-4444-4444-8444-444444444444";
const OPERATION_ID="66666666-6666-4666-8666-666666666666";
const CHECKPOINT_ID="77777777-7777-4777-8777-777777777777";

const projectFixture=(locked=false):Project=>ProjectSchema.parse({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Project One",revision:5,createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
  tracks:[{id:"motion-main",type:"motion",name:"Motion",locked,hidden:false,clips:[]}],
});

const editStep=(targets:ProductionPlanStep["targets"]=[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"ai-new",action:"create"}]):ProductionPlanStep=>ProductionPlanStepSchema.parse({
  id:"edit-project",kind:"edit-project",title:"Edit project",objective:"Apply a bounded visual edit.",dependsOn:[],risk:"medium",owner:"agent",reviewRequired:false,requiresProjectRevision:true,evidence:[],targets,
});
const analyzeStep=():ProductionPlanStep=>ProductionPlanStepSchema.parse({
  id:"analyze",kind:"analyze-script",title:"Analyze",objective:"Inspect script evidence.",dependsOn:[],risk:"low",owner:"agent",reviewRequired:false,requiresProjectRevision:false,evidence:[],
});

const runnerInput=(step:ProductionPlanStep,approved=false):ProductionStepRunnerInput=>{
  const mission=ProductionMissionSchema.parse({
    id:MISSION_ID,projectId:PROJECT_ID,title:"Builder ad",brief:"Create a proof-led B2B video.",target:{platform:"facebook",format:"product-ad",language:"en-AU"},
    autonomyPolicy:{mode:"auto",finalReviewRequired:false},baseProjectRevision:5,status:"running",planId:PLAN_ID,executionId:EXECUTION_ID,activeStepId:step.id,
    agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:01.000Z",
  });
  const plan=ProductionPlanSchema.parse({
    id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,version:1,baseProjectRevision:5,summary:"Bounded production plan.",steps:[step],generatedAt:"2026-08-29T00:00:01.000Z",
  });
  const execution=ProductionExecutionSchema.parse({
    id:EXECUTION_ID,projectId:PROJECT_ID,missionId:MISSION_ID,planId:PLAN_ID,planBaseProjectRevision:5,expectedProjectRevision:5,status:"running",activeStepId:step.id,
    steps:[{stepId:step.id,status:"running",operationId:OPERATION_ID,attempts:1,evidence:[],...(approved?{checkpoint:{id:CHECKPOINT_ID,stepId:step.id,reason:"Explicit human review.",status:"approved",createdAt:"2026-08-29T00:00:02.000Z",decidedAt:"2026-08-29T00:00:03.000Z"}}:{})}],
    budget:{},counters:{},createdAt:"2026-08-29T00:00:01.000Z",updatedAt:"2026-08-29T00:00:02.000Z",
  });
  return{mission,plan,step,execution,operationId:OPERATION_ID,expectedProjectRevision:5,remainingUsageBudget:{agentTurns:32,providerCalls:32,repairLoops:2}};
};

const protectionSetup=()=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=new ProductionEditProtectionRepository(fs,"/data",()=>"2026-08-29T00:00:04.000Z");
  const service=new ProductionEditProtectionService(repository,()=>"2026-08-29T00:00:04.000Z");
  return{fs,repository,service};
};

describe("V2.4 B5b controlled autonomy and protected edits",()=>{
  it("keeps logical mutation targets path-safe and scoped only to edit-project steps",()=>{
    expect(ProductionMutationTargetSchema.safeParse({kind:"clip",id:"C:\\secret\\clip",action:"modify"}).success).toBe(false);
    expect(ProductionPlanStepSchema.safeParse({...analyzeStep(),targets:[{kind:"script",action:"modify"}]}).success).toBe(false);
    expect(editStep().targets).toHaveLength(2);
  });

  it("preserves the application-owned Assist/Guided/Auto risk matrix",()=>{
    expect(evaluateProductionStepRisk(editStep(),{mode:"assist",finalReviewRequired:false}).decision).toBe("checkpoint");
    expect(evaluateProductionStepRisk(editStep(),{mode:"guided",finalReviewRequired:false}).decision).toBe("checkpoint");
    expect(evaluateProductionStepRisk(editStep(),{mode:"auto",finalReviewRequired:false}).decision).toBe("allow");
    expect(evaluateProductionStepRisk(analyzeStep(),{mode:"guided",finalReviewRequired:false}).decision).toBe("allow");
    const high=ProductionPlanStepSchema.parse({...editStep(),risk:"high",reviewRequired:true});
    expect(evaluateProductionStepRisk(high,{mode:"full-production",finalReviewRequired:false}).decision).toBe("checkpoint");
  });

  it("persists human and protected ownership evidence across repository reconstruction",async()=>{
    const{fs,service}=protectionSetup();
    await service.markHumanModified(PROJECT_ID,{kind:"track",id:"motion-main"},5,"Manual timeline edit.");
    await service.protect(PROJECT_ID,{kind:"script"},5,"Preserve approved script.");
    const reopened=new ProductionEditProtectionRepository(fs,"/data",()=>"2026-08-29T00:00:05.000Z");
    expect((await reopened.load(PROJECT_ID)).records.map(record=>record.state).sort()).toEqual(["human-modified","protected"]);
  });

  it("allows new creation and AI-owned targets but reviews unknown/human work and blocks explicit/native locks",async()=>{
    const project=projectFixture();
    expect(evaluateProductionEditProtection(project,[{kind:"scene",id:"new-scene",action:"create"}]).decision).toBe("allow");
    expect(evaluateProductionEditProtection(project,[{kind:"track",id:"motion-main",action:"append"}]).decision).toBe("review");

    const{service}=protectionSetup();
    await service.markAiOwned(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    expect((await service.inspect(project,[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"ai-new",action:"create"}])).decision).toBe("allow");
    await service.markHumanModified(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    expect((await service.inspect(project,[{kind:"track",id:"motion-main",action:"append"}])).decision).toBe("review");
    await service.protect(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    expect((await service.inspect(project,[{kind:"track",id:"motion-main",action:"append"}])).decision).toBe("block");
    expect(evaluateProductionEditProtection(projectFixture(true),[{kind:"track",id:"motion-main",action:"append"}]).decision).toBe("block");
  });

  it("derives actual command targets and rejects any application scope outside the declared Plan",()=>{
    const project=projectFixture();
    const command=ProjectCommandSchema.parse({type:"set-track-state",trackId:"motion-main",hidden:true});
    const actual=productionMutationTargetsForCommands(project,[command]);
    expect(actual).toEqual([{kind:"track",id:"motion-main",action:"modify"}]);
    expect(()=>assertProductionMutationTargetsDeclared(actual,[{kind:"track",id:"motion-main",action:"append"}])).toThrow(ProductionMutationScopeError);
    expect(assertProductionMutationTargetsDeclared(actual,[{kind:"track",id:"motion-main",action:"modify"}])).toEqual(actual);
  });

  it("blocks human-modified autonomous edits before delegate side effects",async()=>{
    const{service}=protectionSetup();
    await service.markHumanModified(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    let calls=0;
    const delegate:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5};}};
    const runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},service,{resolve:async()=>[{kind:"track",id:"motion-main",action:"append"},{kind:"clip",id:"ai-new",action:"create"}]});
    const result=await runner.execute(runnerInput(editStep()));
    expect(result).toMatchObject({status:"blocked",code:"EDIT_PROTECTION_REVIEW_REQUIRED"});
    expect(calls).toBe(0);
  });

  it("lets reviewed human work proceed, but explicit protection remains non-overridable",async()=>{
    const setup=protectionSetup();
    await setup.service.markHumanModified(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    let calls=0;
    const delegate:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5};}};
    const resolver={resolve:async()=>[{kind:"track" as const,id:"motion-main",action:"append" as const},{kind:"clip" as const,id:"ai-new",action:"create" as const}]};
    let runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},setup.service,resolver);
    expect((await runner.execute(runnerInput(editStep(),true))).status).toBe("completed");
    expect(calls).toBe(1);

    await setup.service.protect(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},setup.service,resolver);
    expect(await runner.execute(runnerInput(editStep(),true))).toMatchObject({status:"blocked",code:"EDIT_PROTECTION_BLOCKED"});
    expect(calls).toBe(1);
  });

  it("allows safe AI-owned autonomous edits and fails closed when actual targets exceed declared scope",async()=>{
    const{service}=protectionSetup();
    await service.markAiOwned(PROJECT_ID,{kind:"track",id:"motion-main"},5);
    let calls=0;
    const delegate:ProductionStepRunner={execute:async()=>{calls+=1;return{status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5};}};
    const actual=[{kind:"track" as const,id:"motion-main",action:"append" as const},{kind:"clip" as const,id:"ai-new",action:"create" as const}];
    let runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},service,{resolve:async()=>actual});
    expect((await runner.execute(runnerInput(editStep()))).status).toBe("completed");
    expect(calls).toBe(1);

    runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},service,{resolve:async()=>actual});
    const underscoped=editStep([{kind:"clip",id:"ai-new",action:"create"}]);
    expect(await runner.execute(runnerInput(underscoped))).toMatchObject({status:"blocked",code:"PRODUCTION_MUTATION_SCOPE_MISMATCH"});
    expect(calls).toBe(1);
  });

  it("fails closed for autonomous edit execution without an application-owned target resolver",async()=>{
    const{service}=protectionSetup();
    const delegate:ProductionStepRunner={execute:async()=>({status:"completed",evidence:[{kind:"project",id:PROJECT_ID}],projectRevisionAfter:5})};
    const runner=new ProtectedProductionStepRunner(delegate,{load:async()=>projectFixture()},service);
    expect(await runner.execute(runnerInput(editStep()))).toMatchObject({status:"blocked",code:"EDIT_TARGET_RESOLVER_UNAVAILABLE"});
  });
});
