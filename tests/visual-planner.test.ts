import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {HyperFramesAdapter} from "@/adapters/contracts";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {ProjectRepository} from "@/lib/project/repository";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {buildVisualPlanDiff} from "@/lib/visual-planner/diff";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import {VisualPlanService} from "@/lib/visual-planner/service";

const caption=(id:string,text:string,startFrame:number)=>({id,type:"caption" as const,text,preset:"primary" as const,emphasis:"numbers" as const,keywords:[],startFrame,durationInFrames:60,enabled:true,layer:100});
const scene=(id:string,name:string,semanticType:"hook"|"proof"|"process",startFrame:number,endFrame:number,intensity:"low"|"medium"|"high"="medium")=>({id,name,semanticType,startFrame,endFrame,visualStrategy:{intensity,preferredEngines:["remotion" as const,"hyperframes" as const]}});

const withCaptionAndScene=()=>{
  let project=createProject({id:"demo",name:"Demo",durationInFrames:900});
  project=applyProjectCommand(project,{type:"add-scene",scene:scene("proof","Proof","proof",0,450,"high")});
  project=applyProjectCommand(project,{type:"add-scene",scene:scene("process","Process","process",450,900,"medium")});
  project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","90% complete",30)});
  project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c2","First step: process and shipping",540)});
  return project;
};

describe("V2 M5 AI Director",()=>{
  it("creates Scene-aware explainable suggestions with alternatives and density",()=>{
    const project=withCaptionAndScene();
    const plan=new RulesVisualPlannerAdapter().generate(project);
    expect(plan.version).toBe(2);
    expect(plan.suggestions).toHaveLength(2);
    expect(plan.suggestions[0]).toMatchObject({sceneId:"proof",semanticType:"percentage",recommendation:{engine:"remotion",effectId:"metric-focus"}});
    expect(plan.suggestions[0]!.reason.length).toBeGreaterThan(20);
    expect(plan.suggestions[0]!.alternatives.length).toBeGreaterThan(0);
    expect(plan.suggestions[1]).toMatchObject({sceneId:"process",semanticType:"process",recommendation:{engine:"hyperframes",effectId:"process-flow"}});
    expect(plan.densityBefore.motionCards).toBe(0);
  });

  it("uses a visible none recommendation when density guard blocks another card",()=>{
    let project=createProject({id:"dense",name:"Dense",durationInFrames:600});
    project=applyProjectCommand(project,{type:"add-scene",scene:scene("hook","Hook","hook",0,600,"low")});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"existing",type:"motion",engine:"remotion",effectId:"keyword-impact",props:{text:"Existing",accentColor:"#fff",align:"center"},startFrame:0,durationInFrames:90,enabled:true,layer:10}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","15 days production",60)});
    const suggestion=new RulesVisualPlannerAdapter().generate(project).suggestions[0]!;
    expect(suggestion.recommendation.engine).toBe("none");
    expect(suggestion.reason).toContain("Density guard");
    expect(suggestion.alternatives.some(item=>item.effectId==="big-number")).toBe(true);
  });

  it("previews only reviewed changes and computes density before to after",()=>{
    const project=withCaptionAndScene();
    const plan=new RulesVisualPlannerAdapter().generate(project);
    const all=buildVisualPlanDiff(project,plan,plan.suggestions.map(item=>item.id));
    const one=buildVisualPlanDiff(project,plan,[plan.suggestions[0]!.id]);
    expect(all.add).toHaveLength(2);
    expect(one.add).toHaveLength(1);
    expect(all.remove).toEqual([]);
    expect(all.shorten).toEqual([]);
    expect(all.styleChanges).toEqual([]);
    expect(all.densityAfter.motionCards).toBe(2);
    expect(all.densityAfter.cardsPerMinute).toBeGreaterThan(all.densityBefore.cardsPerMinute);
  });

  it("applies reviewed Remotion and HyperFrames suggestions as one revision",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    let project=await repository.create({id:"demo",name:"Demo",durationInFrames:900});
    project=applyProjectCommand(project,{type:"add-scene",scene:scene("proof","Proof","proof",0,450,"high")});
    project=applyProjectCommand(project,{type:"add-scene",scene:scene("process","Process","process",450,900,"medium")});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","90% complete",30)});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c2","First step: process and shipping",540)});
    await repository.save(project);
    const hyperAdapter:HyperFramesAdapter={render:async input=>{await fs.writeBinary(input.outputPath,new Uint8Array([1]));return{outputPath:input.outputPath};}};
    const service=new VisualPlanService(fs,repository,new RulesVisualPlannerAdapter(),new HyperFramesRenderService(fs,hyperAdapter,repository));
    const plan=await service.generate("demo");
    const before=(await repository.load("demo")).project.revision;
    const result=await service.apply("demo",plan,plan.suggestions.map(item=>item.id));
    expect(result.project.project.revision).toBe(before+1);
    expect(result.transactionId).toMatch(/^ai-director-/);
    expect(result.appliedIds).toHaveLength(2);
    const motion=result.project.tracks.find(track=>track.id==="motion-main")!.clips.filter(clip=>clip.type==="motion");
    expect(motion.map(clip=>[clip.engine,clip.effectId])).toEqual([["remotion","metric-focus"],["hyperframes","process-flow"]]);
    expect(result.project.assets.some(asset=>asset.kind==="overlay"&&asset.id.startsWith("hf-process-flow-"))).toBe(true);
  });

  it("does not create another revision when the same plan is applied twice",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repository=new ProjectRepository(fs,"/data");
    let project=await repository.create({id:"once",name:"Once",durationInFrames:600});
    project=applyProjectCommand(project,{type:"add-scene",scene:scene("proof","Proof","proof",0,600,"high")});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","15 days production",60)});await repository.save(project);
    const hyperAdapter:HyperFramesAdapter={render:async input=>{await fs.writeBinary(input.outputPath,new Uint8Array([1]));return{outputPath:input.outputPath};}};
    const service=new VisualPlanService(fs,repository,new RulesVisualPlannerAdapter(),new HyperFramesRenderService(fs,hyperAdapter,repository));
    const plan=await service.generate("once");const ids=plan.suggestions.filter(item=>item.recommendation.engine!=="none").map(item=>item.id);
    const first=await service.apply("once",plan,ids);const second=await service.apply("once",plan,ids);
    expect(second.project.project.revision).toBe(first.project.project.revision);
    expect(second.transactionId).toBeNull();
    expect(second.appliedIds).toEqual([]);
  });
});
