import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {HyperFramesAdapter} from "@/adapters/contracts";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {ProjectRepository} from "@/lib/project/repository";
import {applyProjectCommand} from "@/lib/project/commands";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {VisualPlanService} from "@/lib/visual-planner/service";

const caption=(id:string,text:string,startFrame:number)=>({id,type:"caption" as const,text,preset:"primary" as const,emphasis:"numbers" as const,keywords:[],startFrame,durationInFrames:60,enabled:true,layer:100});

describe("Phase 9 visual planner",()=>{
  it("maps strong timed evidence to existing effect engines",()=>{
    let project=new (class{value:any})().value;
    // Build through the real project factory via repository to avoid hand-writing project JSON.
    const planner=new RulesVisualPlannerAdapter();
    const base={version:"1.0.0",project:{id:"demo",name:"Demo",revision:0,createdAt:"2026-08-20T00:00:00.000Z",updatedAt:"2026-08-20T00:00:00.000Z"},canvas:{width:1080,height:1920,fps:30,durationInFrames:900},assets:[],tracks:[{id:"video-main",name:"Video",type:"video",locked:false,hidden:false,clips:[]},{id:"captions-main",name:"Captions",type:"caption",locked:false,hidden:false,clips:[caption("c1","90% complete",0),caption("c2","30 days shipping from China to Australia",180)]},{id:"motion-main",name:"Motion",type:"motion",locked:false,hidden:false,clips:[]},{id:"broll-main",name:"B-roll",type:"broll",locked:false,hidden:false,clips:[]},{id:"audio-main",name:"Audio",type:"audio",locked:false,hidden:false,clips:[]}]};
    project=base;
    const plan=planner.generate(project);
    expect(plan.slots.map((slot)=>[slot.engine,slot.effectId])).toEqual([["remotion","metric-focus"],["hyperframes","map-route"]]);
  });

  it("applies only reviewed Remotion slots",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    let project=await repository.create({id:"demo",name:"Demo",durationInFrames:600});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","15 days production",0)});
    await repository.save(project);
    const hyperAdapter:HyperFramesAdapter={render:async(input)=>{await fs.writeBinary(input.outputPath,new Uint8Array([1]));return{outputPath:input.outputPath};}};
    const hyperService=new HyperFramesRenderService(fs,hyperAdapter,repository);
    const service=new VisualPlanService(fs,repository,new RulesVisualPlannerAdapter(),hyperService);
    const plan=await service.generate("demo");
    const next=await service.apply("demo",plan,plan.slots.map((slot)=>slot.id));
    expect(next.tracks.find((track)=>track.id==="motion-main")?.clips[0]).toMatchObject({type:"motion",engine:"remotion",effectId:"big-number"});
  });
});
