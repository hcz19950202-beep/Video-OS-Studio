import {describe,expect,it} from "vitest";
import {AgentContextService,buildAgentContextSnapshot} from "@/lib/ai/context";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema,type Project} from "@/schemas/project";

const now="2026-08-26T00:00:00.000Z";

const buildProject=():Project=>{
  const project=createProject({id:"agent-context-project",name:"Agent Context",now,durationInFrames:900});
  project.project.revision=7;
  project.assets=[{id:"asset-video",kind:"video",relativePath:"media/source.mp4",originalRelativePath:"originals/source.mp4",durationInFrames:900,width:1920,height:1080,hasAudio:true}];
  project.scenes=[
    {id:"scene-hook",name:"Hook",semanticType:"hook",startFrame:0,endFrame:180,summary:"Lead with the strongest promise."},
    {id:"scene-proof",name:"Proof",semanticType:"proof",startFrame:180,endFrame:420,summary:"Show the measurable proof."},
  ];
  project.script={segments:[
    {id:"segment-hook",sceneId:"scene-hook",status:"active",semanticTags:["hook"],words:[
      {id:"w1",text:"Build",startFrame:0,endFrame:10},
      {id:"w2",text:"faster",startFrame:10,endFrame:20},
      {id:"w3",text:"today",startFrame:20,endFrame:30},
    ]},
    {id:"segment-proof",sceneId:"scene-proof",status:"active",semanticTags:["proof"],words:[
      {id:"w4",text:"Fifteen",startFrame:180,endFrame:190},
      {id:"w5",text:"days",startFrame:190,endFrame:200},
    ]},
  ]};
  const videoTrack=project.tracks.find(track=>track.id==="video-main");
  const captionTrack=project.tracks.find(track=>track.id==="captions-main");
  if(!videoTrack||!captionTrack)throw new Error("Expected default tracks");
  videoTrack.clips=[{id:"video-1",type:"video",assetId:"asset-video",sourceStartFrame:0,volume:1,startFrame:0,durationInFrames:420,enabled:true,layer:0}];
  captionTrack.clips=[{id:"caption-1",type:"caption",text:"15 days",preset:"primary",emphasis:"numbers",keywords:["15"],startFrame:180,durationInFrames:60,enabled:true,layer:2}];
  return ProjectSchema.parse(project);
};

describe("V2.3 A1 agent context",()=>{
  it("builds a deterministic selection-aware snapshot anchored to Project revision",()=>{
    const project=buildProject();
    const first=buildAgentContextSnapshot(project,{selectedSceneId:"scene-proof",selectedClipIds:[],selectedScriptRange:{startWordId:"w4",endWordId:"w5"}});
    const second=buildAgentContextSnapshot(project,{selectedSceneId:"scene-proof",selectedClipIds:[],selectedScriptRange:{startWordId:"w4",endWordId:"w5"}});
    expect(first).toEqual(second);
    expect(first.projectId).toBe(project.project.id);
    expect(first.baseProjectRevision).toBe(7);
    expect(first.selectedScene?.id).toBe("scene-proof");
    expect(first.selectedScriptWords.map(word=>word.id)).toEqual(["w4","w5"]);
  });

  it("surfaces selected Clips separately from bounded overview data",()=>{
    const context=buildAgentContextSnapshot(buildProject(),{selectedClipIds:["caption-1"]});
    expect(context.selectedClips.map(clip=>clip.id)).toEqual(["caption-1"]);
    expect(context.selectedClips[0]?.text).toBe("15 days");
  });

  it("does not materialize stale or unknown selection ids",()=>{
    const context=buildAgentContextSnapshot(buildProject(),{selectedClipIds:["missing-clip"],selectedSceneId:"missing-scene"});
    expect(context.selectedClips).toEqual([]);
    expect(context.selectedScene).toBeNull();
  });

  it("never exposes Project asset paths or machine absolute paths",()=>{
    const context=buildAgentContextSnapshot(buildProject());
    const serialized=JSON.stringify(context);
    expect(serialized).not.toContain("relativePath");
    expect(serialized).not.toContain("originalRelativePath");
    expect(serialized).not.toContain("media/source.mp4");
    expect(serialized).not.toMatch(/[A-Za-z]:[\\/]/);
  });

  it("enforces context bounds and reports truncation",()=>{
    const project=buildProject();
    project.scenes=Array.from({length:12},(_,index)=>({id:`scene-${index}`,name:`Scene ${index}`,semanticType:"custom" as const,startFrame:index*20,endFrame:index*20+10}));
    const context=buildAgentContextSnapshot(ProjectSchema.parse(project),{}, {scenes:3,clips:1,scriptSegments:1,assets:1,selectedScriptWords:1});
    expect(context.scenes).toHaveLength(3);
    expect(context.clips).toHaveLength(1);
    expect(context.scriptSegments).toHaveLength(1);
    expect(context.truncated.scenes).toBe(true);
    expect(context.truncated.clips).toBe(true);
    expect(context.truncated.scriptSegments).toBe(true);
  });

  it("loads latest Project through AgentContextService without introducing a second truth",async()=>{
    const project=buildProject();
    const loaded:string[]=[];
    const service=new AgentContextService({load:async projectId=>{loaded.push(projectId);return project;}});
    const context=await service.build(project.project.id,{selectedSceneId:"scene-hook"});
    expect(loaded).toEqual([project.project.id]);
    expect(context.selectedScene?.id).toBe("scene-hook");
    expect(context.baseProjectRevision).toBe(project.project.revision);
  });
});
