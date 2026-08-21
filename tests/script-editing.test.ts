import {describe,expect,it} from "vitest";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {applyScriptSegmentStatus} from "@/lib/script/editing";
import {buildScriptDocument,mapSourceFrameToTimelineFrame,mapTimelineFrameToSourceFrame} from "@/lib/script/model";

describe("V2 Script editing",()=>{
  const makeProject=()=>{
    let project=createProject({id:"script-demo",name:"Script Demo",fps:30,durationInFrames:300,now:"2026-08-21T00:00:00.000Z"});
    project=applyProjectCommand(project,{type:"add-asset",asset:{id:"v1",kind:"video",relativePath:"input/a.mp4",durationInFrames:300}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"v",type:"video",assetId:"v1",startFrame:0,durationInFrames:300,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    return project;
  };

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
    let project=makeProject();
    const script={baseSourceRanges:[{startFrame:0,endFrame:300}],segments:[
      {id:"s1",words:[{id:"w1",text:"Keep",startFrame:0,endFrame:30}],status:"active" as const,semanticTags:[]},
      {id:"s2",words:[{id:"w2",text:"Remove",startFrame:30,endFrame:60}],status:"active" as const,semanticTags:[]},
      {id:"s3",words:[{id:"w3",text:"Keep",startFrame:60,endFrame:90}],status:"active" as const,semanticTags:[]},
    ]};
    project=applyProjectCommand(project,{type:"set-script-document",script});
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

  it("blocks spoken-content cuts after downstream design starts",()=>{
    let project=makeProject();
    project=applyProjectCommand(project,{type:"set-script-document",script:{baseSourceRanges:[{startFrame:0,endFrame:300}],segments:[{id:"s1",words:[{id:"w1",text:"Hello",startFrame:0,endFrame:30}],status:"active",semanticTags:[]}]}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],startFrame:0,durationInFrames:30,enabled:true,layer:100}});
    expect(()=>applyScriptSegmentStatus(project,"s1","removed")).toThrow(/before Captions/);
  });
});
