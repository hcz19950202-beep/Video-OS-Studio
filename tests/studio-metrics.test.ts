import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {applyProjectCommand} from "@/lib/project/commands";
import {formatStudioTime,getStudioMetrics} from "@/lib/studio/metrics";

describe("studio metrics",()=>{
  it("counts cards, density and peak overlap from canonical frames",()=>{
    let project=createProject({id:"metrics-project",name:"Metrics",fps:30,durationInFrames:1800,now:"2026-08-20T00:00:00.000Z"});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"motion-a",type:"motion",engine:"remotion",effectId:"big-number",props:{},startFrame:0,durationInFrames:300,enabled:true,layer:10}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"motion-b",type:"motion",engine:"remotion",effectId:"metric-focus",props:{},startFrame:150,durationInFrames:300,enabled:true,layer:10}});
    const metrics=getStudioMetrics(project);
    expect(metrics.motionCards).toBe(2);
    expect(metrics.densityPerMinute).toBeCloseTo(2);
    expect(metrics.peakConcurrency).toBe(2);
  });

  it("formats frames for the top status bar",()=>{
    expect(formatStudioTime(75,30)).toBe("00:02.5");
  });
});
