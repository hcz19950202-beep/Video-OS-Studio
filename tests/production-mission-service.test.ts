import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {
  ProductionMissionProjectUnavailableError,
  ProductionMissionTerminalStateError,
} from "@/lib/production/mission/errors";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionService,type ProductionMissionProjectReader} from "@/lib/production/mission/service";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import type {Project} from "@/schemas/project";

const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";

const projectAtRevision=(revision:number)=>({project:{id:PROJECT_ID,revision}} as unknown as Project);

const createReader=(revision=7):ProductionMissionProjectReader=>({
  load:async projectId=>{
    if(projectId!==PROJECT_ID)throw new Error("missing project");
    return projectAtRevision(revision);
  },
});

const createInput={
  projectId:PROJECT_ID,
  title:"Australian builder acquisition ad",
  brief:"Create a direct Facebook B2B ad with proof points and a final review.",
  target:{platform:"facebook" as const,format:"product-ad" as const,targetDurationSeconds:45,language:"en-AU"},
  autonomyPolicy:{mode:"guided" as const,finalReviewRequired:true},
};

describe("ProductionMissionService",()=>{
  it("creates a draft Mission at the current Project revision without writing Project truth",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    let projectLoads=0;
    const projects:ProductionMissionProjectReader={load:async()=>{projectLoads+=1;return projectAtRevision(9);}};
    const service=new ProductionMissionService(repository,projects,{
      createId:()=>MISSION_ID,
      now:()=>"2026-08-28T12:00:00.000Z",
    });

    const mission=await service.create(createInput);
    expect(mission).toMatchObject({
      id:MISSION_ID,
      projectId:PROJECT_ID,
      baseProjectRevision:9,
      status:"draft",
      agentSessionIds:[],
      workflowRunIds:[],
      jobIds:[],
    });
    expect(projectLoads).toBe(1);
    expect([...fs.files.keys()].some(path=>path.endsWith("/project.json"))).toBe(false);
  });

  it("updates only Mission details and preserves identity/revision/runtime references",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    const times=["2026-08-28T12:00:00.000Z","2026-08-28T12:00:05.000Z"];
    const service=new ProductionMissionService(repository,createReader(),{
      createId:()=>MISSION_ID,
      now:()=>times.shift()!,
    });
    const created=await service.create(createInput);

    const updated=await service.updateDetails(PROJECT_ID,MISSION_ID,{
      title:"Updated mission title",
      autonomyPolicy:{mode:"assist",finalReviewRequired:true},
    });

    expect(updated.id).toBe(created.id);
    expect(updated.projectId).toBe(created.projectId);
    expect(updated.baseProjectRevision).toBe(created.baseProjectRevision);
    expect(updated.status).toBe("draft");
    expect(updated.title).toBe("Updated mission title");
    expect(updated.autonomyPolicy.mode).toBe("assist");
    expect(updated.updatedAt).toBe("2026-08-28T12:00:05.000Z");
  });

  it("cancels once and makes repeated cancel idempotent without timestamp churn",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    const times=[
      "2026-08-28T12:00:00.000Z",
      "2026-08-28T12:00:05.000Z",
      "2026-08-28T12:00:10.000Z",
    ];
    const service=new ProductionMissionService(repository,createReader(),{
      createId:()=>MISSION_ID,
      now:()=>times.shift()!,
    });
    await service.create(createInput);

    const cancelled=await service.cancel(PROJECT_ID,MISSION_ID);
    const repeated=await service.cancel(PROJECT_ID,MISSION_ID);

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.updatedAt).toBe("2026-08-28T12:00:05.000Z");
    expect(repeated).toEqual(cancelled);
    expect(times).toEqual(["2026-08-28T12:00:10.000Z"]);
  });

  it("rejects detail changes and cancellation after completion",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    const service=new ProductionMissionService(repository,createReader(),{
      createId:()=>MISSION_ID,
      now:()=>"2026-08-28T12:00:00.000Z",
    });
    await service.create(createInput);
    await repository.mutate(PROJECT_ID,MISSION_ID,current=>ProductionMissionSchema.parse({
      ...current,
      status:"completed",
      updatedAt:"2026-08-28T12:00:01.000Z",
    }));

    await expect(service.updateDetails(PROJECT_ID,MISSION_ID,{title:"Too late"})).rejects.toBeInstanceOf(ProductionMissionTerminalStateError);
    await expect(service.cancel(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionMissionTerminalStateError);
  });

  it("normalizes Project load failures without leaking machine paths",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    const service=new ProductionMissionService(repository,{
      load:async()=>{throw new Error("ENOENT C:\\Users\\secret\\project.json");},
    },{createId:()=>MISSION_ID});

    let caught:unknown;
    try{await service.create(createInput);}catch(error){caught=error;}
    expect(caught).toBeInstanceOf(ProductionMissionProjectUnavailableError);
    expect((caught as Error).message).not.toContain("C:\\Users");
    expect((caught as Error).message).not.toContain("project.json");
  });

  it("requires the referenced Project for load/list/update operations",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,"/data");
    const service=new ProductionMissionService(repository,{
      load:async()=>{throw new Error("project missing");},
    });

    await expect(service.load(PROJECT_ID,MISSION_ID)).rejects.toBeInstanceOf(ProductionMissionProjectUnavailableError);
    await expect(service.list(PROJECT_ID)).rejects.toBeInstanceOf(ProductionMissionProjectUnavailableError);
    await expect(service.updateDetails(PROJECT_ID,MISSION_ID,{title:"No project"})).rejects.toBeInstanceOf(ProductionMissionProjectUnavailableError);
  });
});
