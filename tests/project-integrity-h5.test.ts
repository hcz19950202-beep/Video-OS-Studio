import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema,type Project} from "@/schemas/project";

const now="2026-08-23T00:00:00.000Z";
const baseProject=()=>createProject({id:"h5-integrity",name:"H5",durationInFrames:300,now});
const messages=(project:Project)=>ProjectSchema.safeParse(project).error?.issues.map(issue=>issue.message)??[];

describe("H5 Project referential integrity",()=>{
  it("rejects duplicate Asset and Track IDs",()=>{
    const project=baseProject();
    project.assets.push({id:"asset-a",kind:"video",relativePath:"input/a.mp4"},{id:"asset-a",kind:"video",relativePath:"input/b.mp4"});
    project.tracks.push({...structuredClone(project.tracks[0]!),clips:[]});
    const errors=messages(project);
    expect(errors).toContain("Duplicate asset id asset-a");
    expect(errors).toContain("Duplicate track id video-main");
  });

  it("rejects globally duplicate Clip IDs and missing Asset references",()=>{
    const project=baseProject();
    project.assets.push({id:"asset-a",kind:"video",relativePath:"input/a.mp4",durationInFrames:300});
    project.tracks.find(track=>track.id==="video-main")!.clips.push({id:"shared",type:"video",assetId:"asset-a",sourceStartFrame:0,volume:1,startFrame:0,durationInFrames:30,enabled:true,layer:0});
    project.tracks.find(track=>track.id==="captions-main")!.clips.push({id:"shared",type:"caption",text:"Caption",preset:"primary",emphasis:"none",keywords:[],startFrame:30,durationInFrames:30,enabled:true,layer:1});
    project.tracks.find(track=>track.id==="audio-main")!.clips.push({id:"missing-audio",type:"audio",assetId:"does-not-exist",sourceStartFrame:0,volume:1,startFrame:0,durationInFrames:30,enabled:true,layer:0});
    const errors=messages(project);
    expect(errors).toContain("Duplicate clip id shared");
    expect(errors).toContain("Clip missing-audio references missing asset does-not-exist");
  });

  it("rejects timeline and source-bound overflow",()=>{
    const project=baseProject();
    project.assets.push({id:"asset-a",kind:"video",relativePath:"input/a.mp4",durationInFrames:60});
    project.tracks.find(track=>track.id==="video-main")!.clips.push({id:"source-overflow",type:"video",assetId:"asset-a",sourceStartFrame:40,volume:1,startFrame:0,durationInFrames:30,enabled:true,layer:0});
    project.tracks.find(track=>track.id==="captions-main")!.clips.push({id:"timeline-overflow",type:"caption",text:"Late",preset:"primary",emphasis:"none",keywords:[],startFrame:290,durationInFrames:20,enabled:true,layer:0});
    const errors=messages(project);
    expect(errors).toContain("Clip source-overflow exceeds source asset asset-a bounds");
    expect(errors).toContain("Clip timeline-overflow cannot extend beyond project duration");
  });

  it("requires linked styles to exist and target the selected Clip type",()=>{
    const project=baseProject();
    project.linkedStyles.push({id:"motion-style",name:"Motion",target:"motion",properties:{},createdAt:now,updatedAt:now});
    project.tracks.find(track=>track.id==="captions-main")!.clips.push({id:"caption-a",type:"caption",text:"Styled",preset:"primary",emphasis:"none",keywords:[],linkedStyleId:"motion-style",startFrame:0,durationInFrames:30,enabled:true,layer:0});
    project.tracks.find(track=>track.id==="motion-main")!.clips.push({id:"motion-a",type:"motion",engine:"remotion",effectId:"x",props:{},linkedStyleId:"missing-style",startFrame:30,durationInFrames:30,enabled:true,layer:0});
    const errors=messages(project);
    expect(errors).toContain("Linked style motion-style does not target caption");
    expect(errors).toContain("Clip motion-a references missing linked style missing-style");
  });

  it("requires Scene style references to exist",()=>{
    const project=baseProject();
    project.scenes.push({id:"scene-a",name:"Scene",semanticType:"custom",startFrame:0,endFrame:30,styleId:"missing-style"});
    expect(messages(project)).toContain("Scene scene-a references missing linked style missing-style");
  });

  it("accepts a fully linked in-bounds Project",()=>{
    const project=baseProject();
    project.assets.push({id:"asset-a",kind:"video",relativePath:"input/a.mp4",durationInFrames:120});
    project.linkedStyles.push({id:"caption-style",name:"Caption",target:"caption",properties:{},createdAt:now,updatedAt:now});
    project.tracks.find(track=>track.id==="video-main")!.clips.push({id:"video-a",type:"video",assetId:"asset-a",sourceStartFrame:10,volume:1,startFrame:0,durationInFrames:60,enabled:true,layer:0});
    project.tracks.find(track=>track.id==="captions-main")!.clips.push({id:"caption-a",type:"caption",text:"OK",preset:"primary",emphasis:"none",keywords:[],linkedStyleId:"caption-style",startFrame:0,durationInFrames:30,enabled:true,layer:1});
    project.scenes.push({id:"scene-a",name:"Scene",semanticType:"custom",startFrame:0,endFrame:60,styleId:"caption-style"});
    expect(ProjectSchema.parse(project).project.id).toBe("h5-integrity");
  });
});
