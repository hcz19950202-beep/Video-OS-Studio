import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {applyProjectCommandTransaction,createProjectHistoryEntry} from "@/lib/project/history";

describe("V2 command transactions",()=>{
  it("applies many validated commands as one project revision",()=>{
    const project=createProject({id:"tx",name:"Before",durationInFrames:300,now:"2026-08-20T00:00:00.000Z"});
    const next=applyProjectCommandTransaction(project,{id:"tx-1",label:"Scene setup",commands:[
      {type:"rename-project",name:"After"},
      {type:"add-marker",marker:{id:"m1",frame:30,type:"note",label:"Beat"}},
      {type:"add-scene",scene:{id:"s1",name:"Hook",semanticType:"hook",startFrame:0,endFrame:90}},
    ]},{now:"2026-08-20T01:00:00.000Z"});
    expect(next.project.name).toBe("After");
    expect(next.markers).toHaveLength(1);
    expect(next.scenes).toHaveLength(1);
    expect(next.project.revision).toBe(project.project.revision+1);
    expect(next.project.updatedAt).toBe("2026-08-20T01:00:00.000Z");
  });

  it("validates the Project at transaction boundaries instead of cloning once per command",()=>{
    const project=createProject({id:"tx-efficient",name:"Before",durationInFrames:300,now:"2026-08-20T00:00:00.000Z"});
    const originalClone=globalThis.structuredClone;
    let cloneCalls=0;
    globalThis.structuredClone=((value:unknown)=>{cloneCalls+=1;return originalClone(value);}) as typeof structuredClone;
    try{
      const next=applyProjectCommandTransaction(project,{id:"tx-efficient-1",label:"Three edits",commands:[
        {type:"rename-project",name:"After"},
        {type:"add-marker",marker:{id:"m1",frame:30,type:"note"}},
        {type:"add-scene",scene:{id:"s1",name:"Scene",semanticType:"custom",startFrame:0,endFrame:60}},
      ]});
      expect(next.project.name).toBe("After");
      expect(cloneCalls).toBe(1);
    }finally{
      globalThis.structuredClone=originalClone;
    }
  });

  it("permits temporary intermediate invalidity when the final atomic Project is valid",()=>{
    const project=createProject({id:"tx-boundary",name:"Boundary",durationInFrames:300,now:"2026-08-20T00:00:00.000Z"});
    project.tracks.find(track=>track.id==="captions-main")!.clips.push({id:"late",type:"caption",text:"Late",preset:"primary",emphasis:"none",keywords:[],startFrame:200,durationInFrames:50,enabled:true,layer:0});
    const next=applyProjectCommandTransaction(project,{id:"tx-boundary-1",label:"Trim",commands:[
      {type:"set-duration",durationInFrames:100},
      {type:"remove-clip",clipId:"late"},
    ]});
    expect(next.canvas.durationInFrames).toBe(100);
    expect(next.tracks.flatMap(track=>track.clips)).toHaveLength(0);
  });

  it("creates detached before/after history snapshots",()=>{
    const project=createProject({id:"history",name:"History",now:"2026-08-20T00:00:00.000Z"});
    const entry=createProjectHistoryEntry(project,{id:"tx-2",label:"Marker",commands:[{type:"add-marker",marker:{id:"m1",frame:10,type:"note"}}]},{now:"2026-08-20T01:00:00.000Z"});
    project.project.name="Mutated caller";
    expect(entry.before.project.name).toBe("History");
    expect(entry.before.markers).toEqual([]);
    expect(entry.after.markers.map(marker=>marker.id)).toEqual(["m1"]);
    expect(entry.before.project.revision).toBe(0);
    expect(entry.after.project.revision).toBe(1);
  });
});
