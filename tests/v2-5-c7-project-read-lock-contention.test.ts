import {open,rm,mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import {InMemoryFileSystemAdapter,NodeFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

class LockTrackingFileSystem extends InMemoryFileSystemAdapter{
  readonly lockPaths:string[]=[];
  async withExclusiveLock<T>(lockPath:string,work:()=>Promise<T>):Promise<T>{
    this.lockPaths.push(lockPath.replaceAll("\\","/"));
    return work();
  }
}

class HoldingProjectReadFileSystem extends NodeFileSystemAdapter{
  private releaseRead!:()=>void;
  private readonly releasePromise=new Promise<void>(resolve=>{this.releaseRead=resolve;});
  private readOpenedResolve!:()=>void;
  readonly readOpened=new Promise<void>(resolve=>{this.readOpenedResolve=resolve;});
  release(){this.releaseRead();}
  override async readText(path:string):Promise<string>{
    if(!path.endsWith("project.json"))return super.readText(path);
    const handle=await open(path,"r");
    try{
      const content=await handle.readFile({encoding:"utf8"});
      this.readOpenedResolve();
      await this.releasePromise;
      return content;
    }finally{await handle.close();}
  }
}

describe("V2.5 C7 Project operation lookup lock hardening",()=>{
  it("preserves the existing serialized Project read/write lock contract",async()=>{
    const fs=new LockTrackingFileSystem();
    const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"demo",name:"Demo",now:"2026-09-02T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});

    fs.lockPaths.length=0;
    const project=await repository.load("demo");

    expect(project.project.id).toBe("demo");
    expect(fs.lockPaths.filter(path=>path.endsWith("/projects/demo/project.json.lock"))).toHaveLength(1);
  });

  it("does not nest a Project read under operations lock for already-settled operation lookup",async()=>{
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

  it("releases a missing operation lookup even while another repository instance holds the Project read lock",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-v2-5-c7-project-read-lock-"));
    roots.push(root);
    const writerFs=new NodeFileSystemAdapter();
    const readerFs=new HoldingProjectReadFileSystem();
    const writerRepository=new ProjectRepository(writerFs,root);
    const readerRepository=new ProjectRepository(readerFs,root);
    const mutations=new ProjectMutationCoordinator(writerFs,writerRepository);
    await writerRepository.create({id:"demo",name:"Demo",now:"2026-09-02T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});

    const heldRead=readerRepository.load("demo");
    await readerFs.readOpened;
    const operationLockPath=writerRepository.resolveProjectFile("demo","operations.jsonl.lock");
    const lookup=mutations.getOperation("demo","workflow:scene-detection:first-attempt");
    try{
      const outcome=await Promise.race([
        lookup.then(value=>({kind:"result" as const,value})),
        new Promise<{kind:"timeout"}>(resolve=>setTimeout(()=>resolve({kind:"timeout"}),1_000)),
      ]);
      expect(outcome).toEqual({kind:"result",value:null});
      expect(await writerFs.exists(operationLockPath)).toBe(false);
    }finally{
      readerFs.release();
      await heldRead;
      await lookup;
    }
  });
});
