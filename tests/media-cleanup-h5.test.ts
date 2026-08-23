import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {FfmpegAdapter} from "@/adapters/contracts";
import {MediaImportService} from "@/lib/media/import-service";
import {ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

describe("H5 failed media import cleanup",()=>{
  it("removes this operation's native media after a stale revision conflict",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    await repo.create({id:"stale-media",name:"Stale",fps:30,durationInFrames:120,now:"2026-08-23T00:00:00.000Z"});
    let bumped=false;
    const ffmpeg:FfmpegAdapter={
      probe:async()=>{if(!bumped){bumped=true;const latest=await repo.load("stale-media");latest.project.revision+=1;latest.project.updatedAt="2026-08-23T00:01:00.000Z";await repo.save(latest);}return{durationSeconds:2,width:1280,height:720,fps:30,hasAudio:true};},
      waveformPeaks:async(_path,points)=>Array(points).fill(.5),
      normalizeVideo:async input=>({outputPath:input.outputPath}),
      normalizeAudio:async input=>({outputPath:input.outputPath}),
    };
    const service=new MediaImportService(fs,ffmpeg,repo,()=>"unused");
    await expect(service.importWithReport({projectId:"stale-media",fileName:"clip.mp4",mimeType:"video/mp4",bytes:new Uint8Array([1,2,3]),expectedRevision:0,operationId:"stale-native"})).rejects.toBeInstanceOf(ProjectRevisionConflictError);
    expect(await fs.listFiles("/data/projects/stale-media/input")).toEqual([]);
    const latest=await repo.load("stale-media");expect(latest.project.revision).toBe(1);expect(latest.assets).toEqual([]);
  });

  it("removes original and partial working files when normalization fails",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    await repo.create({id:"failed-normalize",name:"Normalize",fps:30,now:"2026-08-23T00:00:00.000Z"});
    const ffmpeg:FfmpegAdapter={
      probe:async()=>({durationSeconds:2,width:1280,height:720,fps:30,hasAudio:true}),
      waveformPeaks:async(_path,points)=>Array(points).fill(.5),
      normalizeVideo:async input=>{await fs.writeBinary(input.outputPath,new Uint8Array([9,9]));throw new Error("fixture normalize failure");},
      normalizeAudio:async input=>({outputPath:input.outputPath}),
    };
    const service=new MediaImportService(fs,ffmpeg,repo,()=>"failed");
    await expect(service.importWithReport({projectId:"failed-normalize",fileName:"camera.mov",mimeType:"video/quicktime",bytes:new Uint8Array([1,2,3])})).rejects.toThrow("fixture normalize failure");
    expect(await fs.listFiles("/data/projects/failed-normalize/original")).toEqual([]);
    expect(await fs.listFiles("/data/projects/failed-normalize/input")).toEqual([]);
  });

  it("never removes candidate paths that the latest Project still references",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");
    const project=await repo.create({id:"protected-media",name:"Protected",now:"2026-08-23T00:00:00.000Z"});
    const relativePath="assets/media-protected-image.png";
    await fs.writeBinary(repo.resolveProjectFile("protected-media",relativePath),new Uint8Array([1]));
    project.assets.push({id:"protected",kind:"image",relativePath});project.project.revision=1;await repo.save(project);
    expect(await repo.cleanupUnreferencedProjectFiles("protected-media",[relativePath])).toEqual([]);
    expect(await fs.exists(repo.resolveProjectFile("protected-media",relativePath))).toBe(true);
  });
});
