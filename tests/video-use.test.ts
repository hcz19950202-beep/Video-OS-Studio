import {describe,expect,it} from "vitest";
import {parseScribePayload} from "@/adapters/video-use";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {VideoUseAdapter} from "@/adapters/contracts";
import {ProjectRepository} from "@/lib/project/repository";
import {VideoUseService} from "@/lib/video-use/service";
import {applyProjectCommand} from "@/lib/project/commands";

describe("Phase 8 video-use",()=>{
  it("normalizes Scribe word timestamps",()=>{
    expect(parseScribePayload({text:"Hello",words:[{type:"word",text:"Hello",start:1,end:1.4,speaker_id:"speaker_0"},{type:"spacing",text:" ",start:1.4,end:1.5}]})).toEqual({text:"Hello",words:[{text:"Hello",startSeconds:1,endSeconds:1.4,speakerId:"speaker_0",type:"word"}]});
  });

  it("applies a confirmed seconds-based EDL as frame-based source trims",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repo=new ProjectRepository(fs,"/data");
    let project=await repo.create({id:"demo",name:"Demo",fps:30,durationInFrames:300});
    project=applyProjectCommand(project,{type:"add-asset",asset:{id:"v1",kind:"video",relativePath:"input/a.mp4",durationInFrames:300}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"v",type:"video",assetId:"v1",startFrame:0,durationInFrames:300,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c1",type:"caption",text:"Kept across first range",preset:"minimal",emphasis:"none",keywords:[],startFrame:0,durationInFrames:75,enabled:true,layer:100}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c2",type:"caption",text:"Kept across second range",preset:"primary",emphasis:"numbers",keywords:[],startFrame:150,durationInFrames:60,enabled:true,layer:100}});
    await repo.save(project);
    const adapter:VideoUseAdapter={prepare:async()=>({words:[],text:"",packedText:"",transcriptPath:"",packedTranscriptPath:""}),renderEdl:async(input)=>({outputPath:input.outputPath}),timelineView:async()=>({})};
    const service=new VideoUseService(fs,adapter,repo);
    const next=await service.applyEdl("demo",{version:1,ranges:[{start:1,end:3},{start:5,end:7.5}]});
    const clips=next.tracks.find((track)=>track.id==="video-main")!.clips;
    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({startFrame:0,sourceStartFrame:30,durationInFrames:60});
    expect(clips[1]).toMatchObject({startFrame:60,sourceStartFrame:150,durationInFrames:75});
    expect(next.tracks.find((track)=>track.id==="captions-main")?.clips).toEqual([
      expect.objectContaining({id:"edl-caption-1-c1",startFrame:0,durationInFrames:45,text:"Kept across first range",preset:"minimal"}),
      expect.objectContaining({id:"edl-caption-2-c2",startFrame:60,durationInFrames:60,text:"Kept across second range"}),
    ]);
    expect(next.canvas.durationInFrames).toBe(135);
  });
});
