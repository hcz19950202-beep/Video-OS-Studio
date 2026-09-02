import {describe,expect,it,vi} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

class LockTrackingFileSystem extends InMemoryFileSystemAdapter{
  readonly lockPaths:string[]=[];
  async withExclusiveLock<T>(lockPath:string,work:()=>Promise<T>):Promise<T>{
    this.lockPaths.push(lockPath.replaceAll("\\","/"));
    return work();
  }
}

describe("V2.5 C7 Project read lock contention hardening",()=>{
  it("loads an atomically persisted Project snapshot without taking the writer lock",async()=>{
    const fs=new LockTrackingFileSystem();
    const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"demo",name:"Demo",now:"2026-09-02T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
    expect(fs.lockPaths.some(path=>path.endsWith("/projects/demo/project.json.lock"))).toBe(true);

    fs.lockPaths.length=0;
    const project=await repository.load("demo");

    expect(project.project.id).toBe("demo");
    expect(fs.lockPaths).toEqual([]);
  });

  it("does not read Project truth while looking up an already-settled operation log",async()=>{
    const fs=new LockTrackingFileSystem();
    const repository=new ProjectRepository(fs,"/data");
    const mutations=new ProjectMutationCoordinator(fs,repository);
    await repository.create({id:"demo",name:"Demo",now:"2026-09-02T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
    await mutations.applyCommand("demo",{
      expectedRevision:0,
      commandId:"rename-demo",
      command:{type:"rename-project",name:"Renamed"},
    });

    const load=vi.spyOn(repository,"load");
    fs.lockPaths.length=0;
    const applied=await mutations.getOperation("demo","rename-demo");
    const missing=await mutations.getOperation("demo","future-scene-operation");

    expect(applied).toMatchObject({operationId:"rename-demo",status:"applied",appliedRevision:1});
    expect(missing).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(fs.lockPaths.filter(path=>path.endsWith("/project.json.lock"))).toEqual([]);
    expect(fs.lockPaths.filter(path=>path.endsWith("/operations.jsonl.lock"))).toHaveLength(2);
  });
});
