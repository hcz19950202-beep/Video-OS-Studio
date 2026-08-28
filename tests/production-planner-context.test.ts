import {describe,expect,it} from "vitest";
import {buildProductionPlannerContext} from "@/lib/production/planner/context";
import {ProductionMissionSchema} from "@/lib/production/mission/schema";
import type {Project} from "@/schemas/project";

const mission=ProductionMissionSchema.parse({
  id:"22222222-2222-4222-8222-222222222222",projectId:"project-1",title:"Mission",brief:"Build a useful ad.",target:{},autonomyPolicy:{mode:"assist",finalReviewRequired:true},baseProjectRevision:1,status:"draft",agentSessionIds:[],workflowRunIds:[],jobIds:[],createdAt:"2026-08-28T12:00:00.000Z",updatedAt:"2026-08-28T12:00:00.000Z",
});

const project={
  project:{id:"project-1",name:"Project",revision:1},canvas:{width:1920,height:1080,fps:30,durationInFrames:300},
  workflow:{scenario:"talking-head",visualIntensity:"medium"},
  script:{segments:[{id:"segment-1",status:"active",words:[{text:"hello"},{text:"world"}]}]},
  scenes:[{id:"scene/unsafe",name:"Hook",semanticType:"hook",startFrame:0,endFrame:60,summary:"A useful hook."}],
  assets:[{id:"C:\\secret\\source.mp4",kind:"video",relativePath:"input/private-source.mp4",originalName:"private-source.mp4",label:"Source",durationInFrames:300,width:1920,height:1080,hasAudio:true}],
} as unknown as Project;

describe("buildProductionPlannerContext",()=>{
  it("exposes bounded production metadata without filesystem paths or original filenames",()=>{
    const context=buildProductionPlannerContext(mission,project);
    const serialized=JSON.stringify(context);
    expect(context.scenes[0].id).toBe("scene-0");
    expect(context.assets[0].id).toBe("asset-0");
    expect(context.script.textPreview).toBe("hello world");
    expect(serialized).not.toContain("relativePath");
    expect(serialized).not.toContain("private-source.mp4");
    expect(serialized).not.toContain("C:\\secret");
  });
});
