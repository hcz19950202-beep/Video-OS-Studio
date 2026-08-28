import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProductionPlanAlreadyExistsError,ProductionPlanNotFoundError} from "@/lib/production/plan/errors";
import {ProductionPlanRepository} from "@/lib/production/plan/repository";
import {ProductionPlanSchema,type ProductionPlan} from "@/lib/production/plan/schema";

const ROOT="/data";
const PROJECT_ID="project-1";
const MISSION_ID="22222222-2222-4222-8222-222222222222";
const PLAN_ID="11111111-1111-4111-8111-111111111111";
const planFixture=(overrides:Partial<ProductionPlan>={}):ProductionPlan=>ProductionPlanSchema.parse({
  id:PLAN_ID,projectId:PROJECT_ID,missionId:MISSION_ID,version:1,baseProjectRevision:4,
  summary:"Plan one",
  steps:[{id:"render-final",kind:"render-final",title:"Render",objective:"Render the accepted Project state.",dependsOn:[],risk:"medium",owner:"job",reviewRequired:false,requiresProjectRevision:true,evidence:[]}],
  generatedAt:"2026-08-28T12:00:00.000Z",
  ...overrides,
});

describe("ProductionPlanRepository",()=>{
  it("creates immutable durable plans and reopens them",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionPlanRepository(fs,ROOT);
    const created=await repository.create(planFixture());
    expect(await new ProductionPlanRepository(fs,ROOT).require(PROJECT_ID,PLAN_ID)).toEqual(created);
    expect(await repository.list(PROJECT_ID,MISSION_ID)).toEqual([created]);
  });

  it("rejects duplicate create and missing require",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionPlanRepository(fs,ROOT);
    await repository.create(planFixture());
    await expect(repository.create(planFixture())).rejects.toBeInstanceOf(ProductionPlanAlreadyExistsError);
    await expect(repository.require(PROJECT_ID,"33333333-3333-4333-8333-333333333333")).rejects.toBeInstanceOf(ProductionPlanNotFoundError);
  });

  it("validates durable payload identity against the repository path",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionPlanRepository(fs,ROOT);
    await repository.create(planFixture());
    const path=join(ROOT,"projects",PROJECT_ID,"production","plans",`${PLAN_ID}.json`);
    const wrong=planFixture({id:"44444444-4444-4444-8444-444444444444"});
    await fs.writeTextAtomic(path,JSON.stringify(wrong));
    await expect(repository.load(PROJECT_ID,PLAN_ID)).rejects.toThrow("identity does not match");
  });

  it("lists only safe UUID plan filenames and filters by Mission",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionPlanRepository(fs,ROOT);
    const otherMission="55555555-5555-4555-8555-555555555555";
    await repository.create(planFixture());
    await repository.create(planFixture({id:"66666666-6666-4666-8666-666666666666",missionId:otherMission,generatedAt:"2026-08-28T12:00:01.000Z"}));
    const dir=join(ROOT,"projects",PROJECT_ID,"production","plans");
    await fs.writeTextAtomic(join(dir,"notes.json"),"{}");
    expect((await repository.list(PROJECT_ID,MISSION_ID)).map(plan=>plan.id)).toEqual([PLAN_ID]);
  });
});
