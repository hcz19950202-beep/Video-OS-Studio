import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema,type ProductionMission} from "@/lib/production/mission/schema";
import {ProductionMissionPlanConflictError,ProductionMissionPlanningStateError,ProductionPlanRevisionConflictError} from "@/lib/production/plan/errors";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {MockProductionPlanner} from "@/lib/production/planner/mock-planner";
import {ProductionPlannerService,type ProductionPlannerAdapter,type ProductionPlannerProjectReader} from "@/lib/production/planner/service";
import type {Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const SECOND_PLAN_ID="33333333-3333-4333-8333-333333333333";

const missionFixture=(overrides:Partial<ProductionMission>={}):ProductionMission=>ProductionMissionSchema.parse({
  id:MISSION_ID,projectId:PROJECT_ID,title:"Australian builder ad",brief:"Create a direct B2B product ad with proof and CTA.",
  target:{platform:"facebook",format:"product-ad",targetDurationSeconds:45,language:"en-AU"},
  autonomyPolicy:{mode:"guided",finalReviewRequired:true},baseProjectRevision:5,status:"draft",
  agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-28T12:00:00.000Z",updatedAt:"2026-08-28T12:00:00.000Z",...overrides,
});

const projectAtRevision=(revision:number):Project=>({
  version:"2.0.0",
  project:{id:PROJECT_ID,name:"Project One",revision,createdAt:"2026-08-28T11:00:00.000Z",updatedAt:"2026-08-28T11:00:00.000Z"},
  canvas:{width:1080,height:1920,fps:30,durationInFrames:900},
  assets:[{id:"asset-1",kind:"video",relativePath:"input/source.mp4",label:"Talking head",durationInFrames:900,width:1080,height:1920,hasAudio:true}],
  tracks:[],
  script:{baseSourceRanges:[],segments:[{id:"segment-1",status:"active",semanticTags:["hook"],words:[{id:"word-1",text:"Proof",startFrame:0,endFrame:10}]}]},
  scenes:[{id:"scene-1",name:"Hook",semanticType:"hook",startFrame:0,endFrame:90,summary:"Open with a concrete proof point."}],
  markers:[],brand:{name:"",primaryColor:"#ffffff",secondaryColor:"#111111",accentColor:"#2563eb",fontFamily:"Inter",logoAssetId:null},linkedStyles:[],language:{source:"auto",target:"en",captionLanguage:"en"},
  workflow:{scenario:"product-ad",starterPrompt:"",sceneTaxonomy:["hook","problem","solution","proof","cta"],captionHint:"primary",visualIntensity:"high"},
} as unknown as Project);

const setup=async(reader:ProductionPlannerProjectReader,planner:ProductionPlannerAdapter=new MockProductionPlanner())=>{
  const fs=new InMemoryFileSystemAdapter();
  const missions=new ProductionMissionRepository(fs,"/data");
  const plans=new ProductionPlanRepository(fs,"/data");
  await missions.create(missionFixture());
  const service=new ProductionPlannerService(missions,plans,reader,planner,{createId:()=>PLAN_ID,now:()=>"2026-08-28T12:00:05.000Z"});
  return{fs,missions,plans,service};
};

describe("ProductionPlannerService",()=>{
  it("generates an immutable plan, links the Mission, and never writes Project truth",async()=>{
    const project=projectAtRevision(5);
    const{fs,missions,plans,service}=await setup({load:async()=>project});
    const plan=await service.generate(PROJECT_ID,MISSION_ID,5);
    expect(plan).toMatchObject({id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,baseProjectRevision:5,version:1});
    expect((await missions.require(PROJECT_ID,MISSION_ID)).planId).toBe(PLAN_ID);
    expect((await missions.require(PROJECT_ID,MISSION_ID)).status).toBe("ready");
    expect(await plans.require(PROJECT_ID,PLAN_ID)).toEqual(plan);
    expect([...fs.files.keys()].some(path=>path.endsWith("/project.json"))).toBe(false);
  });

  it("preserves immutable re-plan lineage and advances only the Mission plan link",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const missions=new ProductionMissionRepository(fs,"/data");
    const plans=new ProductionPlanRepository(fs,"/data");
    await missions.create(missionFixture());
    const ids=[PLAN_ID,SECOND_PLAN_ID];
    const service=new ProductionPlannerService(
      missions,
      plans,
      {load:async()=>projectAtRevision(5)},
      new MockProductionPlanner(),
      {createId:()=>ids.shift()??SECOND_PLAN_ID,now:()=>"2026-08-28T12:00:05.000Z"},
    );

    const first=await service.generate(PROJECT_ID,MISSION_ID);
    const second=await service.generate(PROJECT_ID,MISSION_ID);

    expect(second.supersedesPlanId).toBe(first.id);
    expect(await plans.require(PROJECT_ID,first.id)).toEqual(first);
    expect(await plans.require(PROJECT_ID,second.id)).toEqual(second);
    expect((await missions.require(PROJECT_ID,MISSION_ID)).planId).toBe(second.id);
    expect((await plans.list(PROJECT_ID,MISSION_ID)).map(plan=>plan.id).sort()).toEqual([PLAN_ID,SECOND_PLAN_ID].sort());
  });

  it("rejects an explicit stale revision before invoking the planner",async()=>{
    let calls=0;
    const planner:ProductionPlannerAdapter={generate:context=>{calls+=1;return new MockProductionPlanner().generate(context);}};
    const{service}=await setup({load:async()=>projectAtRevision(6)},planner);
    await expect(service.generate(PROJECT_ID,MISSION_ID,5)).rejects.toBeInstanceOf(ProductionPlanRevisionConflictError);
    expect(calls).toBe(0);
  });

  it("fails closed when Project revision changes while planning and persists no Plan",async()=>{
    let loads=0;
    const{missions,plans,service}=await setup({load:async()=>projectAtRevision(++loads===1?5:6)});
    await expect(service.generate(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionPlanRevisionConflictError);
    expect(await plans.list(PROJECT_ID,MISSION_ID)).toEqual([]);
    const mission=await missions.require(PROJECT_ID,MISSION_ID);
    expect(mission.status).toBe("draft");
    expect(mission.planId).toBeUndefined();
  });

  it("detects stale persisted plans after later Project revision drift",async()=>{
    let revision=5;
    const{service}=await setup({load:async()=>projectAtRevision(revision)});
    await service.generate(PROJECT_ID,MISSION_ID);
    revision=6;
    expect(await service.inspectFreshness(PROJECT_ID,PLAN_ID)).toMatchObject({currentProjectRevision:6,stale:true});
    await expect(service.requireFresh(PROJECT_ID,PLAN_ID)).rejects.toBeInstanceOf(ProductionPlanRevisionConflictError);
  });

  it("does not overwrite semantic Mission changes even when updatedAt is unchanged",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const missions=new ProductionMissionRepository(fs,"/data");
    const plans=new ProductionPlanRepository(fs,"/data");
    await missions.create(missionFixture());
    const planner:ProductionPlannerAdapter={generate:async context=>{
      await missions.mutate(PROJECT_ID,MISSION_ID,current=>({...current,title:"User changed the brief"}));
      return new MockProductionPlanner().generate(context);
    }};
    const service=new ProductionPlannerService(missions,plans,{load:async()=>projectAtRevision(5)},planner,{createId:()=>PLAN_ID,now:()=>"2026-08-28T12:00:05.000Z"});
    await expect(service.generate(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionMissionPlanConflictError);
    const mission=await missions.require(PROJECT_ID,MISSION_ID);
    expect(mission).toMatchObject({title:"User changed the brief",status:"draft",updatedAt:"2026-08-28T12:00:00.000Z"});
    expect(mission.planId).toBeUndefined();
    expect((await plans.list(PROJECT_ID,MISSION_ID)).map(plan=>plan.id)).toEqual([PLAN_ID]);
  });

  it("leaves Mission and Plan storage unchanged when planner generation fails",async()=>{
    const planner:ProductionPlannerAdapter={generate:()=>{throw new Error("planner unavailable");}};
    const{missions,plans,service}=await setup({load:async()=>projectAtRevision(5)},planner);
    await expect(service.generate(PROJECT_ID,MISSION_ID)).rejects.toThrow("planner unavailable");
    expect(await plans.list(PROJECT_ID,MISSION_ID)).toEqual([]);
    const mission=await missions.require(PROJECT_ID,MISSION_ID);
    expect(mission.status).toBe("draft");
    expect(mission.planId).toBeUndefined();
  });

  it("refuses to plan completed or cancelled Missions",async()=>{
    const{missions,service}=await setup({load:async()=>projectAtRevision(5)});
    await missions.mutate(PROJECT_ID,MISSION_ID,current=>({...current,status:"completed",updatedAt:"2026-08-28T12:00:01.000Z"}));
    await expect(service.generate(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionMissionPlanningStateError);
  });

  it("keeps deterministic mock step ordering and explicit checkpoints",async()=>{
    const{service}=await setup({load:async()=>projectAtRevision(5)});
    const plan=await service.generate(PROJECT_ID,MISSION_ID);
    expect(plan.steps.map(step=>step.id)).toEqual(["analyze-script","plan-visuals","edit-project","human-review","render-final"]);
    expect(plan.steps.find(step=>step.id==="edit-project")).toMatchObject({risk:"high",reviewRequired:true});
    expect(plan.steps.find(step=>step.id==="human-review")).toMatchObject({owner:"human-review",reviewRequired:true});
  });
});
