import {describe,expect,it} from "vitest";
import {buildAgentContextSnapshot} from "@/lib/ai/context";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {RulesVisualPlannerAdapter} from "@/lib/visual-planner/rules";
import type {VisualPlan,VisualPlannerContext} from "@/lib/visual-planner/schema";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-27T00:00:00.000Z";

const createSelectionProject=(dense=false)=>{
  const project=createProject({id:dense?"selection-dense":"selection-basic",name:"Selection Planning",now,width:1920,height:1080,durationInFrames:1800});
  project.scenes=[
    {id:"scene-hook",name:"Hook",semanticType:"hook",startFrame:0,endFrame:600,visualStrategy:{intensity:"high",preferredEngines:["remotion"]}},
    {id:"scene-proof",name:"Proof",semanticType:"proof",startFrame:600,endFrame:1800,visualStrategy:{intensity:"high",preferredEngines:["remotion"]}},
  ];
  project.tracks.find(track=>track.id==="captions-main")!.clips=[
    {id:"caption-hook",type:"caption",text:"15 days",preset:"primary",emphasis:"numbers",keywords:[],startFrame:120,durationInFrames:75,enabled:true,layer:100},
    {id:"caption-proof",type:"caption",text:"90% complete",preset:"primary",emphasis:"numbers",keywords:[],startFrame:720,durationInFrames:75,enabled:true,layer:100},
  ];
  project.script.segments=[
    {id:"segment-hook",sceneId:"scene-hook",status:"active",semanticTags:["hook"],words:[{id:"word-hook",text:"15 days",startFrame:120,endFrame:150}]},
    {id:"segment-proof",sceneId:"scene-proof",status:"active",semanticTags:["proof"],words:[{id:"word-proof",text:"90% complete",startFrame:720,endFrame:750}]},
  ];
  if(dense){
    project.tracks.find(track=>track.id==="motion-main")!.clips=Array.from({length:9},(_,index)=>({
      id:`existing-motion-${index}`,
      type:"motion" as const,
      engine:"remotion" as const,
      effectId:"keyword-impact",
      props:{text:`Existing ${index}`},
      startFrame:900+index*90,
      durationInFrames:45,
      enabled:true,
      layer:20,
    }));
  }
  project.project.revision=7;
  return ProjectSchema.parse(project);
};

describe("V2.3 A7 selection-aware visual planning",()=>{
  it("plans only the selected Caption and does not let whole-video cards/min veto a clean selected moment",()=>{
    const project=createSelectionProject(true);
    const plan=new RulesVisualPlannerAdapter().generate(project,{
      intent:"Keep the selected hook restrained",
      selection:{selectedClipIds:["caption-hook"],selectedSceneId:"scene-hook",selectedScriptRange:null},
    });

    expect(plan.context?.selection).toEqual({selectedClipIds:["caption-hook"],selectedSceneId:"scene-hook",selectedScriptRange:null});
    expect(plan.suggestions).toHaveLength(1);
    expect(plan.suggestions[0]).toMatchObject({id:"suggest-scene-hook-caption-hook",sceneId:"scene-hook",semanticType:"number",recommendation:{engine:"remotion",effectId:"big-number"}});
    expect(plan.densityBefore.cardsPerMinute).toBeGreaterThan(5);
    expect(plan.suggestions[0].reason).toContain("scoped to the current Studio selection");
  });

  it("uses selected Script word range when no selected Caption clip is present",()=>{
    const project=createSelectionProject(false);
    const plan=new RulesVisualPlannerAdapter().generate(project,{
      intent:"Emphasize the selected proof",
      selection:{selectedClipIds:[],selectedSceneId:null,selectedScriptRange:{startWordId:"word-proof",endWordId:"word-proof"}},
    });

    expect(plan.suggestions).toHaveLength(1);
    expect(plan.suggestions[0]).toMatchObject({id:"suggest-scene-proof-caption-proof",sceneId:"scene-proof",semanticType:"percentage",recommendation:{engine:"remotion",effectId:"metric-focus"}});
  });

  it("keeps model tool input selection-free while propagating the server-side Agent selection to Rules Director",async()=>{
    const project=createSelectionProject(false);
    const selection={selectedClipIds:["caption-proof"],selectedSceneId:"scene-proof",selectedScriptRange:null};
    const context=buildAgentContextSnapshot(project,selection);
    let receivedContext:VisualPlannerContext|undefined;
    const plan:VisualPlan={
      version:2,
      projectId:project.project.id,
      generatedAt:now,
      source:"rules",
      context:{intent:"Proof",selection},
      suggestions:[{id:"suggest-scene-proof-caption-proof",sceneId:"scene-proof",startFrame:720,endFrame:795,spokenText:"90% complete",semanticType:"percentage",recommendation:{engine:"remotion",effectId:"metric-focus"},reason:"Selected proof",confidence:.95,alternatives:[]}],
      densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
    };
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async(_projectId,plannerContext)=>{receivedContext=plannerContext;return plan;}}});
    const definition=registry.getDefinition("propose_visual_plan");
    const result=await registry.execute({id:"call-selection-plan",toolId:"propose_visual_plan",arguments:{intent:"Proof"}},{sessionId:"00000000-0000-4000-8000-000000000071",context,now:()=>now,makeId:()=>"00000000-0000-4000-8000-000000000072"});

    expect(definition?.inputJsonSchema).toMatchObject({required:["intent"],additionalProperties:false});
    expect((definition?.inputJsonSchema.properties as Record<string,unknown>)?.selection).toBeUndefined();
    expect(result.status).toBe("success");
    expect(receivedContext).toEqual({intent:"Proof",selection});
  });
});
