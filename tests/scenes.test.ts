import {describe,expect,it} from "vitest";
import {applyProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {createProject} from "@/lib/project/factory";
import {buildAutoScenesTransaction,buildMergeSceneWithNextTransaction,buildSplitSceneTransaction} from "@/lib/scenes/model";

const makeProject=()=>{
  let project=createProject({id:"scene-demo",name:"Scene Demo",fps:30,durationInFrames:600,now:"2026-08-21T00:00:00.000Z"});
  project=applyProjectCommand(project,{type:"add-asset",asset:{id:"v1",kind:"video",relativePath:"input/a.mp4",durationInFrames:600}});
  project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"v",type:"video",assetId:"v1",startFrame:0,durationInFrames:600,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
  const texts=["如果你是建筑商。","现在最大的问题是人工成本。","我们可以把施工搬进工厂。","15天完成制造。","90%以上工厂完成。","把项目图纸发给我们。"];
  const segments=texts.map((text,index)=>({id:`s${index+1}`,words:[{id:`w${index+1}`,text,startFrame:index*90,endFrame:index*90+75}],status:"active" as const,semanticTags:[]}));
  project=applyProjectCommand(project,{type:"set-script-document",script:{baseSourceRanges:[{startFrame:0,endFrame:600}],segments}});
  return project;
};

describe("V2 Scene model",()=>{
  it("generates semantic Scenes and assigns Script segments",()=>{
    const project=makeProject();
    const next=applyProjectCommandTransaction(project,buildAutoScenesTransaction(project),{now:"2026-08-21T00:01:00.000Z"});
    expect(next.scenes.length).toBeGreaterThanOrEqual(2);
    expect(next.scenes[0]?.semanticType).toBe("hook");
    expect(next.script.segments.every(segment=>Boolean(segment.sceneId))).toBe(true);
    expect(next.scenes.at(-1)?.semanticType).toBe("cta");
  });

  it("splits and merges Scenes without losing segment assignments",()=>{
    const generated=applyProjectCommandTransaction(makeProject(),buildAutoScenesTransaction(makeProject()),{now:"2026-08-21T00:01:00.000Z"});
    const candidate=generated.scenes.find(scene=>generated.script.segments.filter(segment=>segment.sceneId===scene.id).length>1);
    expect(candidate).toBeTruthy();
    const assigned=generated.script.segments.filter(segment=>segment.sceneId===candidate!.id);
    const split=applyProjectCommandTransaction(generated,buildSplitSceneTransaction(generated,candidate!.id,assigned[1]!.id),{now:"2026-08-21T00:02:00.000Z"});
    expect(split.scenes.length).toBe(generated.scenes.length+1);
    const ordered=[...split.scenes].sort((a,b)=>a.startFrame-b.startFrame);
    const mergeTarget=ordered.find(scene=>scene.id===candidate!.id);
    expect(mergeTarget).toBeTruthy();
    const merged=applyProjectCommandTransaction(split,buildMergeSceneWithNextTransaction(split,mergeTarget!.id),{now:"2026-08-21T00:03:00.000Z"});
    expect(merged.scenes.length).toBe(generated.scenes.length);
    expect(merged.script.segments.filter(segment=>segment.sceneId===mergeTarget!.id).length).toBeGreaterThan(1);
  });
});
