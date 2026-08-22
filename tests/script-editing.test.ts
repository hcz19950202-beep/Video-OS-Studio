import {describe,expect,it} from "vitest";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {applyScriptSegmentStatus} from "@/lib/script/editing";
import {buildScriptDocument,mapSourceFrameToTimelineFrame,mapTimelineFrameToSourceFrame} from "@/lib/script/model";
import type {Project} from "@/schemas/project";

const scriptDocument={baseSourceRanges:[{startFrame:0,endFrame:300}],segments:[
  {id:"s1",words:[{id:"w1",text:"Keep",startFrame:0,endFrame:30}],status:"active" as const,semanticTags:[]},
  {id:"s2",words:[{id:"w2",text:"Remove",startFrame:30,endFrame:60}],status:"active" as const,semanticTags:[]},
  {id:"s3",words:[{id:"w3",text:"Keep",startFrame:60,endFrame:90}],status:"active" as const,semanticTags:[]},
]};

describe("V2 Script editing",()=>{
  const makeProject=({trackId="video-main",presentation={}}:{trackId?:string;presentation?:Record<string,unknown>}={}):Project=>{
    let project=createProject({id:"script-demo",name:"Script Demo",fps:30,durationInFrames:300,now:"2026-08-21T00:00:00.000Z"});
    project.tracks[0]!.id=trackId;
    project=applyProjectCommand(project,{type:"add-asset",asset:{id:"v1",kind:"video",relativePath:"input/a.mp4",durationInFrames:300}});
    project=applyProjectCommand(project,{type:"add-clip",trackId,clip:{id:"v",type:"video",assetId:"v1",startFrame:0,durationInFrames:300,sourceStartFrame:0,volume:1,enabled:true,layer:0,...presentation}});
    return project;
  };

  const withScript=(project:Project)=>applyProjectCommand(project,{type:"set-script-document",script:scriptDocument});

  it("builds sentence-like Script segments from word timestamps",()=>{
    const script=buildScriptDocument([
      {text:"Hello",startSeconds:0,endSeconds:.4,type:"word"},
      {text:" world.",startSeconds:.45,endSeconds:.9,type:"word"},
      {text:"Second",startSeconds:1.1,endSeconds:1.5,type:"word"},
      {text:" line",startSeconds:1.55,endSeconds:2,type:"word"},
    ],30,[{startFrame:0,endFrame:300}]);
    expect(script.baseSourceRanges).toEqual([{startFrame:0,endFrame:300}]);
    expect(script.segments).toHaveLength(2);
    expect(script.segments[0]?.words.map(word=>word.text).join("")).toContain("Hello");
  });

  it("removes and restores a Script segment by rebuilding canonical A-roll",()=>{
    const project=withScript(makeProject());
    const removed=applyScriptSegmentStatus(project,"s2","removed",{now:"2026-08-21T00:01:00.000Z"});
    const clips=removed.tracks.find(track=>track.type==="video")!.clips;
    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({startFrame:0,sourceStartFrame:0,durationInFrames:30});
    expect(clips[1]).toMatchObject({startFrame:30,sourceStartFrame:60,durationInFrames:240});
    expect(removed.canvas.durationInFrames).toBe(270);
    expect(mapSourceFrameToTimelineFrame(removed,65)).toBe(35);
    expect(mapTimelineFrameToSourceFrame(removed,35)).toBe(65);

    const restored=applyScriptSegmentStatus(removed,"s2","active",{now:"2026-08-21T00:02:00.000Z"});
    expect(restored.tracks.find(track=>track.type==="video")!.clips).toHaveLength(1);
    expect(restored.tracks.find(track=>track.type==="video")!.clips[0]).toMatchObject({sourceStartFrame:0,durationInFrames:300});
    expect(restored.canvas.durationInFrames).toBe(300);
  });

  it("preserves A-roll presentation properties across remove and restore",()=>{
    const presentation={volume:.55,muted:true,fit:"cover" as const,transform:{x:24,y:-12,scale:1.15,opacity:.8,anchor:"top-left" as const,rotation:7},enabled:false,layer:4};
    const project=withScript(makeProject({presentation}));
    const removed=applyScriptSegmentStatus(project,"s2","removed");
    const removedClips=removed.tracks.find(track=>track.type==="video")!.clips;
    expect(removedClips).toHaveLength(2);
    for(const clip of removedClips)expect(clip).toMatchObject(presentation);

    const restored=applyScriptSegmentStatus(removed,"s2","active");
    expect(restored.tracks.find(track=>track.type==="video")!.clips[0]).toMatchObject(presentation);
  });

  it("rebuilds onto the actual non-canonical Video track ID",()=>{
    const project=withScript(makeProject({trackId:"legacy-a-roll"}));
    const removed=applyScriptSegmentStatus(project,"s2","removed");
    const track=removed.tracks.find(item=>item.id==="legacy-a-roll");
    expect(track?.type).toBe("video");
    expect(track?.clips).toHaveLength(2);
    expect(removed.tracks.some(item=>item.id==="video-main")).toBe(false);
    expect(mapSourceFrameToTimelineFrame(removed,65)).toBe(35);
  });

  it("blocks ambiguous user-managed Video clips instead of deleting them",()=>{
    let project=withScript(makeProject());
    project=applyProjectCommand(project,{type:"add-asset",asset:{id:"v2",kind:"video",relativePath:"input/b.mp4",durationInFrames:60}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"manual-video",type:"video",assetId:"v2",startFrame:120,durationInFrames:60,sourceStartFrame:0,volume:1,enabled:true,layer:5}});
    const before=structuredClone(project);
    expect(()=>applyScriptSegmentStatus(project,"s2","removed")).toThrow(/multiple source assets|canonical Script A-roll/);
    expect(project).toEqual(before);
    expect(project.project.revision).toBe(before.project.revision);
    expect(project.tracks[0]!.clips.some(clip=>clip.id==="manual-video")).toBe(true);
  });

  it("blocks multiple populated Video tracks as ambiguous",()=>{
    let project=withScript(makeProject());
    project.tracks.push({id:"video-overlay",type:"video",name:"Overlay Video",locked:false,hidden:false,clips:[{id:"overlay-video",type:"video",assetId:"v1",startFrame:0,durationInFrames:30,sourceStartFrame:100,volume:1,enabled:true,layer:8}]});
    expect(()=>applyScriptSegmentStatus(project,"s2","removed")).toThrow(/multiple populated Video tracks/);
  });

  it("blocks inconsistent presentation across canonical A-roll clips",()=>{
    let project=withScript(makeProject());
    project=applyScriptSegmentStatus(project,"s2","removed");
    const second=project.tracks[0]!.clips[1];
    if(!second||second.type!=="video")throw new Error("second A-roll clip missing");
    second.volume=.25;
    expect(()=>applyScriptSegmentStatus(project,"s2","active")).toThrow(/different Video presentation properties/);
  });

  it("blocks removing every A-roll source range instead of losing presentation state",()=>{
    let project=makeProject();
    project=applyProjectCommand(project,{type:"set-script-document",script:{baseSourceRanges:[{startFrame:0,endFrame:300}],segments:[{id:"only",words:[{id:"w1",text:"All",startFrame:0,endFrame:300}],status:"active",semanticTags:[]}]}});
    expect(()=>applyScriptSegmentStatus(project,"only","removed")).toThrow(/cannot remove all A-roll content/);
  });

  it("blocks spoken-content cuts after downstream design starts",()=>{
    let project=makeProject();
    project=applyProjectCommand(project,{type:"set-script-document",script:{baseSourceRanges:[{startFrame:0,endFrame:300}],segments:[{id:"s1",words:[{id:"w1",text:"Hello",startFrame:0,endFrame:30}],status:"active",semanticTags:[]}]}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],startFrame:0,durationInFrames:30,enabled:true,layer:100}});
    expect(()=>applyScriptSegmentStatus(project,"s1","removed")).toThrow(/before Captions/);
  });
});
