import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {MockFfmpegAdapter} from "@/adapters/mocks";
import {ProjectRepository} from "@/lib/project/repository";
import {WaveformService} from "@/lib/media/waveform-service";
import {applyProjectCommand} from "@/lib/project/commands";

const createAudioProject=async(id:string)=>{const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");let project=await repo.create({id,name:id});project=applyProjectCommand(project,{type:"add-asset",asset:{id:"audio",kind:"audio",relativePath:"input/audio.m4a",durationInFrames:300,mimeType:"audio/mp4"}});await repo.save(project);await fs.writeBinary(`/data/projects/${id}/input/audio.m4a`,new Uint8Array([1]));return{fs,repo};};

describe("WaveformService",()=>{
  it("precomputes and caches waveform peaks",async()=>{const{fs,repo}=await createAudioProject("wave");const service=new WaveformService(fs,new MockFfmpegAdapter({durationSeconds:10,hasAudio:true},[.1,.5,.9]),repo);const first=await service.get("wave","audio",40);const second=await service.get("wave","audio",40);expect(first.peaks).toHaveLength(40);expect(first.cached).toBe(false);expect(second.cached).toBe(true);expect(second.peaks).toEqual(first.peaks);});
  it("clamps invalid and oversized point requests",async()=>{const{fs,repo}=await createAudioProject("bounded");const service=new WaveformService(fs,new MockFfmpegAdapter({durationSeconds:10,hasAudio:true},[.2,.8]),repo);const invalid=await service.get("bounded","audio",Number.NaN);const oversized=await service.get("bounded","audio",99999);const undersized=await service.get("bounded","audio",1);expect(invalid.points).toBe(160);expect(invalid.peaks).toHaveLength(160);expect(oversized.points).toBe(512);expect(oversized.peaks).toHaveLength(512);expect(undersized.points).toBe(32);expect(undersized.peaks).toHaveLength(32);});
  it("returns flat cached peaks for video known to have no audio",async()=>{const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");let p=await repo.create({id:"silent",name:"Silent"});p=applyProjectCommand(p,{type:"add-asset",asset:{id:"video",kind:"video",relativePath:"input/video.mp4",durationInFrames:60,hasAudio:false}});await repo.save(p);const service=new WaveformService(fs,new MockFfmpegAdapter(),repo);const result=await service.get("silent","video",32);expect(result.cached).toBe(true);expect(result.points).toBe(32);expect(result.peaks).toHaveLength(32);});
});
