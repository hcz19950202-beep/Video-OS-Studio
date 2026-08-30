import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter,NodeFileSystemAdapter} from "@/adapters/filesystem";
import type {FfmpegAdapter} from "@/adapters/contracts";
import {MediaImportService} from "@/lib/media/import-service";
import {ProjectRepository} from "@/lib/project/repository";

const roots:string[]=[];
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const ffmpeg:FfmpegAdapter={
  probe:async()=>({durationSeconds:1,width:320,height:180,fps:30,hasAudio:false}),
  waveformPeaks:async(_path,points)=>Array(points).fill(0),
  normalizeVideo:async input=>({outputPath:input.outputPath}),
  normalizeAudio:async input=>({outputPath:input.outputPath}),
};

describe("V2.4 final audit media idempotency",()=>{
  it("never overwrites already-applied media bytes when an operationId is retried",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"media-idempotency-audit",name:"Media idempotency audit",now:"2026-08-31T00:00:00.000Z"});
    const service=new MediaImportService(fs,ffmpeg,repository,()=>"unused");
    const operationId="media-idempotency-operation";
    const firstBytes=new Uint8Array([1,2,3,4]);
    const replacementBytes=new Uint8Array([9,8,7,6]);

    const first=await service.importWithReport({
      projectId:"media-idempotency-audit",
      fileName:"reference.png",
      mimeType:"image/png",
      bytes:firstBytes,
      expectedRevision:0,
      operationId,
    });
    const absolutePath=repository.resolveProjectFile(first.project.project.id,first.import.workingRelativePath);
    expect(await fs.readBinary(absolutePath)).toEqual(firstBytes);

    const retry=await service.importWithReport({
      projectId:"media-idempotency-audit",
      fileName:"reference.png",
      mimeType:"image/png",
      bytes:replacementBytes,
      expectedRevision:1,
      operationId,
    });

    expect(retry.alreadyApplied).toBe(true);
    expect(retry.project.project.revision).toBe(1);
    expect(await fs.readBinary(absolutePath)).toEqual(firstBytes);
  });

  it("serializes the same media operation across independent service and filesystem instances",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-media-operation-"));
    roots.push(root);
    let firstWriteEntered!:()=>void;
    const firstWriteStarted=new Promise<void>(resolve=>{firstWriteEntered=resolve;});
    let releaseFirstWrite!:()=>void;
    const firstWriteGate=new Promise<void>(resolve=>{releaseFirstWrite=resolve;});
    let secondWriteEntered!:()=>void;
    const secondWriteStarted=new Promise<void>(resolve=>{secondWriteEntered=resolve;});

    class BlockingFs extends NodeFileSystemAdapter{
      override async writeBinary(path:string,content:Uint8Array){
        firstWriteEntered();
        await firstWriteGate;
        return super.writeBinary(path,content);
      }
    }
    class ObservingFs extends NodeFileSystemAdapter{
      override async writeBinary(path:string,content:Uint8Array){
        secondWriteEntered();
        return super.writeBinary(path,content);
      }
    }

    const fsA=new BlockingFs();
    const fsB=new ObservingFs();
    const repositoryA=new ProjectRepository(fsA,root);
    const repositoryB=new ProjectRepository(fsB,root);
    await repositoryA.create({id:"media-operation-lock-audit",name:"Media operation lock audit",now:"2026-08-31T00:00:00.000Z"});
    const serviceA=new MediaImportService(fsA,ffmpeg,repositoryA,()=>"unused-a");
    const serviceB=new MediaImportService(fsB,ffmpeg,repositoryB,()=>"unused-b");
    const operationId="shared-media-operation";
    const firstBytes=new Uint8Array([1,3,5,7]);
    const secondBytes=new Uint8Array([2,4,6,8]);

    const firstPromise=serviceA.importWithReport({projectId:"media-operation-lock-audit",fileName:"shared.png",mimeType:"image/png",bytes:firstBytes,expectedRevision:0,operationId});
    await firstWriteStarted;
    const secondPromise=serviceB.importWithReport({projectId:"media-operation-lock-audit",fileName:"shared.png",mimeType:"image/png",bytes:secondBytes,expectedRevision:0,operationId});

    const secondWroteWhileFirstOwned=await Promise.race([secondWriteStarted.then(()=>true),sleep(150).then(()=>false)]);
    expect(secondWroteWhileFirstOwned).toBe(false);

    releaseFirstWrite();
    const[first,second]=await Promise.all([firstPromise,secondPromise]);
    expect(first.alreadyApplied).not.toBe(true);
    expect(second.alreadyApplied).toBe(true);
    const absolutePath=repositoryA.resolveProjectFile(first.project.project.id,first.import.workingRelativePath);
    expect(new Uint8Array(await readFile(absolutePath))).toEqual(firstBytes);
  });
});
