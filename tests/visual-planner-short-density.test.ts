import {describe,expect,it} from "vitest";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";

const caption=(id:string,text:string,startFrame:number)=>({
  id,
  type:"caption" as const,
  text,
  preset:"primary" as const,
  emphasis:"numbers" as const,
  keywords:[],
  startFrame,
  durationInFrames:30,
  enabled:true,
  layer:100,
});

const proofScene={
  id:"proof",
  name:"Proof",
  semanticType:"proof" as const,
  startFrame:0,
  endFrame:150,
  visualStrategy:{intensity:"high" as const,preferredEngines:["remotion" as const]},
};

describe("short-form visual density",()=>{
  it("allows the first strong visual in a five-second project but still guards the second",()=>{
    let project=createProject({id:"short-proof",name:"Short Proof",durationInFrames:150});
    project=applyProjectCommand(project,{type:"add-scene",scene:proofScene});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c1","90% complete",0)});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption("c2","80% verified",120)});

    const plan=new RulesVisualPlannerAdapter().generate(project,{intent:"Emphasize proof"});

    expect(plan.suggestions).toHaveLength(2);
    expect(plan.suggestions[0]).toMatchObject({
      semanticType:"percentage",
      recommendation:{engine:"remotion",effectId:"metric-focus"},
    });
    expect(plan.suggestions[1]?.recommendation.engine).toBe("none");
    expect(plan.suggestions[1]?.reason).toContain("projected density would exceed 8 cards/min");
  });
});
