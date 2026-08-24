import {open,rm,mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {NodeFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const makeRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-w5-project-lock-"));roots.push(root);return root;};

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

describe("V2.2 W5 Project truth concurrency hardening",()=>{
  it("serializes project.json reads with coordinated mutation writes across repository instances",async()=>{
    const root=await makeRoot();
    const writerFs=new NodeFileSystemAdapter();
    const readerFs=new HoldingProjectReadFileSystem();
    const writerRepository=new ProjectRepository(writerFs,root);
    const readerRepository=new ProjectRepository(readerFs,root);
    const coordinator=new ProjectMutationCoordinator(writerFs,writerRepository);
    await writerRepository.create({id:"demo",name:"Demo",now:"2026-08-24T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:120});

    const read=readerRepository.load("demo");
    await readerFs.readOpened;
    let mutationSettled=false;
    const mutation=coordinator.applyCommand("demo",{expectedRevision:0,commandId:"w5-project-file-lock",command:{type:"rename-project",name:"Serialized"}}).finally(()=>{mutationSettled=true;});
    await new Promise(resolve=>setTimeout(resolve,30));
    expect(mutationSettled).toBe(false);

    readerFs.release();
    const [readProject,mutationResult]=await Promise.all([read,mutation]);
    const finalProject=await writerRepository.load("demo");
    expect(readProject.project.revision).toBe(0);
    expect(mutationResult.appliedRevision).toBe(1);
    expect(finalProject.project).toMatchObject({name:"Serialized",revision:1});
    expect(await writerFs.exists(join(root,"projects","demo","project.json.lock"))).toBe(false);
  });
});
