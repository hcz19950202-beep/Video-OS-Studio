import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {ProjectRepository} from "@/lib/project/repository";
import {applyProjectCommand} from "@/lib/project/commands";
import {buildCanvasChangePreview} from "@/lib/canvas/change-preview";

describe("V2.1 canvas change preview",()=>{
  it("reports before/after canvas metadata before any durable change",async()=>{
    const repo=new ProjectRepository(new InMemoryFileSystemAdapter(),"/data");
    const project=await repo.create({id:"canvas-preview",name:"Canvas Preview",width:1080,height:1920,fps:30});
    const preview=buildCanvasChangePreview(project,{width:1920,height:1080});
    expect(preview.before).toMatchObject({width:1080,height:1920,fps:30,aspectLabel:"9:16"});
    expect(preview.after).toMatchObject({width:1920,height:1080,fps:30,aspectLabel:"16:9"});
    expect(preview.aspectChanged).toBe(true);
    expect(project.canvas).toMatchObject({width:1080,height:1920,fps:30});
    expect(project.project.revision).toBe(0);
  });

  it("counts affected visual clips without mutating project state",async()=>{
    const repo=new ProjectRepository(new InMemoryFileSystemAdapter(),"/data");
    let project=await repo.create({id:"affected",name:"Affected",width:1920,height:1080,fps:30});
    project=applyProjectCommand(project,{type:"add-asset",asset:{id:"video-a",kind:"video",relativePath:"input/a.mp4",originalName:"a.mp4"}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"video-1",type:"video",assetId:"video-a",startFrame:0,durationInFrames:30,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"motion-1",type:"motion",engine:"remotion",effectId:"big-number",startFrame:0,durationInFrames:30,props:{},enabled:true,layer:1}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"caption-1",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],startFrame:0,durationInFrames:30,enabled:true,layer:2}});
    const revision=project.project.revision;
    const preview=buildCanvasChangePreview(project,{width:1080,height:1080});
    expect(preview.affected).toMatchObject({videos:1,motions:1,captions:1,broll:0,total:3});
    expect(project.project.revision).toBe(revision);
  });
});
