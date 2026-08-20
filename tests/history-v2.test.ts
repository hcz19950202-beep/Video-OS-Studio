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

  it("creates immutable before/after history snapshots",()=>{
    const project=createProject({id:"history",name:"History",now:"2026-08-20T00:00:00.000Z"});
    const entry=createProjectHistoryEntry(project,{id:"tx-2",label:"Marker",commands:[{type:"add-marker",marker:{id:"m1",frame:10,type:"note"}}]},{now:"2026-08-20T01:00:00.000Z"});
    expect(entry.before.markers).toEqual([]);
    expect(entry.after.markers.map(marker=>marker.id)).toEqual(["m1"]);
    expect(entry.before.project.revision).toBe(0);
    expect(entry.after.project.revision).toBe(1);
  });
});
