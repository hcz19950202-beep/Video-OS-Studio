import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter,NodeFileSystemAdapter} from "@/adapters/filesystem";
import {
  ProductionMissionAlreadyExistsError,
  ProductionMissionNotFoundError,
} from "@/lib/production/mission/errors";
import {ProductionMissionRepository} from "@/lib/production/mission/repository";
import {ProductionMissionSchema,type ProductionMission} from "@/lib/production/mission/schema";

const DATA_ROOT="/video-os-data";
const PROJECT_ID="project-1";
const MISSION_ID="11111111-1111-4111-8111-111111111111";

const missionFixture=(overrides:Partial<ProductionMission>={}):ProductionMission=>ProductionMissionSchema.parse({
  id:MISSION_ID,
  projectId:PROJECT_ID,
  title:"Mission one",
  brief:"Produce a publishable B2B talking-head ad.",
  target:{platform:"facebook",format:"talking-head"},
  autonomyPolicy:{mode:"assist",finalReviewRequired:true},
  baseProjectRevision:4,
  status:"draft",
  agentSessionIds:[],
  workflowRunIds:[],
  jobIds:[],
  createdAt:"2026-08-28T12:00:00.000Z",
  updatedAt:"2026-08-28T12:00:00.000Z",
  ...overrides,
});

const missionPath=(id=MISSION_ID)=>join(DATA_ROOT,"projects",PROJECT_ID,"production","missions",`${id}.json`);
const backupPath=(id=MISSION_ID)=>join(DATA_ROOT,"projects",PROJECT_ID,"production","missions",`${id}.backup.json`);
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

describe("ProductionMissionRepository",()=>{
  it("creates, reopens and lists durable Missions outside project.json",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    const created=await repository.create(missionFixture());

    const reconstructed=new ProductionMissionRepository(fs,DATA_ROOT);
    expect(await reconstructed.require(PROJECT_ID,MISSION_ID)).toEqual(created);
    expect(await reconstructed.list(PROJECT_ID)).toEqual([created]);
    expect(await fs.exists(join(DATA_ROOT,"projects",PROJECT_ID,"project.json"))).toBe(false);
  });

  it("rejects duplicate create and missing require/save",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    const mission=missionFixture();
    await repository.create(mission);

    await expect(repository.create(mission)).rejects.toBeInstanceOf(ProductionMissionAlreadyExistsError);
    await expect(repository.require(PROJECT_ID,"55555555-5555-4555-8555-555555555555")).rejects.toBeInstanceOf(ProductionMissionNotFoundError);
    await expect(repository.save(missionFixture({id:"66666666-6666-4666-8666-666666666666"}))).rejects.toBeInstanceOf(ProductionMissionNotFoundError);
  });

  it("keeps a previous valid backup and recovers a corrupted primary",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    const initial=missionFixture();
    await repository.create(initial);
    await repository.save(missionFixture({title:"Updated title",updatedAt:"2026-08-28T12:00:01.000Z"}));

    expect(await fs.exists(backupPath())).toBe(true);
    await fs.writeTextAtomic(missionPath(),"{corrupt-primary");

    const reconstructed=new ProductionMissionRepository(fs,DATA_ROOT);
    const recovered=await reconstructed.require(PROJECT_ID,MISSION_ID);
    expect(recovered.title).toBe(initial.title);
    expect(JSON.parse(await fs.readText(missionPath())).title).toBe(initial.title);
  });

  it("fails closed when primary and backup are both invalid",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    await repository.create(missionFixture());
    await repository.save(missionFixture({title:"Updated title",updatedAt:"2026-08-28T12:00:01.000Z"}));
    await fs.writeTextAtomic(missionPath(),"{invalid-primary");
    await fs.writeTextAtomic(backupPath(),"{invalid-backup");

    await expect(new ProductionMissionRepository(fs,DATA_ROOT).load(PROJECT_ID,MISSION_ID)).rejects.toThrow();
  });

  it("validates payload identity against its repository path",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    const wrong=missionFixture({id:"77777777-7777-4777-8777-777777777777"});
    await fs.writeTextAtomic(missionPath(),JSON.stringify(wrong));

    await expect(repository.load(PROJECT_ID,MISSION_ID)).rejects.toThrow("identity does not match");
  });

  it("ignores unrelated or unsafe filenames while listing",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProductionMissionRepository(fs,DATA_ROOT);
    await repository.create(missionFixture());
    const dir=join(DATA_ROOT,"projects",PROJECT_ID,"production","missions");
    await fs.writeTextAtomic(join(dir,"notes.json"),"{}");
    await fs.writeTextAtomic(join(dir,"mission:unsafe.json"),"{}");
    await fs.writeTextAtomic(join(dir,"README.txt"),"ignore");

    const missions=await repository.list(PROJECT_ID);
    expect(missions.map(mission=>mission.id)).toEqual([MISSION_ID]);
  });

  it("serializes read-modify-write mutations across repository instances",async()=>{
    const dataRoot=await mkdtemp(join(tmpdir(),"video-os-mission-"));
    try{
      const firstRepository=new ProductionMissionRepository(new NodeFileSystemAdapter(),dataRoot);
      const secondRepository=new ProductionMissionRepository(new NodeFileSystemAdapter(),dataRoot);
      await firstRepository.create(missionFixture());

      let signalFirstRead!:()=>void;
      let releaseFirst!:()=>void;
      const firstRead=new Promise<void>(resolve=>{signalFirstRead=resolve;});
      const holdFirst=new Promise<void>(resolve=>{releaseFirst=resolve;});

      const firstMutation=firstRepository.mutate(PROJECT_ID,MISSION_ID,async current=>{
        signalFirstRead();
        await holdFirst;
        return ProductionMissionSchema.parse({
          ...current,
          title:"Updated by first repository",
          updatedAt:"2026-08-28T12:00:01.000Z",
        });
      });

      await firstRead;
      const secondMutation=secondRepository.mutate(PROJECT_ID,MISSION_ID,current=>ProductionMissionSchema.parse({
        ...current,
        brief:"Updated by second repository",
        updatedAt:"2026-08-28T12:00:02.000Z",
      }));

      await sleep(25);
      releaseFirst();
      await Promise.all([firstMutation,secondMutation]);

      const finalMission=await secondRepository.require(PROJECT_ID,MISSION_ID);
      expect(finalMission.title).toBe("Updated by first repository");
      expect(finalMission.brief).toBe("Updated by second repository");
    }finally{
      await rm(dataRoot,{recursive:true,force:true});
    }
  });
});
