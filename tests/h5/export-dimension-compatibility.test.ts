import {describe,expect,it} from "vitest";
import {buildRemotionRenderArgs} from "@/adapters/remotion-cli";
import {createProject} from "@/lib/project/factory";
import {projectForExportProfile,resolveExportProfile} from "@/lib/render/profile";

describe("V2.3.1 H5 H.264 export dimension compatibility",()=>{
  it("keeps an odd Project Canvas intact while resolving project-sized H.264 output to even dimensions",()=>{
    const project=createProject({id:"odd-project",name:"Odd Project",width:641,height:361,fps:30,durationInFrames:30});
    const original=structuredClone(project);

    const resolved=resolveExportProfile(project,{sizing:"project",codec:"h264",container:"mp4"});
    const prepared=projectForExportProfile(project,{sizing:"project",codec:"h264",container:"mp4"});

    expect(project).toEqual(original);
    expect(project.canvas).toMatchObject({width:641,height:361});
    expect(resolved).toMatchObject({width:640,height:360,fps:30});
    expect(prepared.profile).toMatchObject({width:640,height:360});
    expect(prepared.project.canvas).toMatchObject({width:640,height:360,fps:30});
  });

  it("preserves already-even H.264 export dimensions exactly",()=>{
    const project=createProject({id:"even-project",name:"Even Project",width:640,height:360,fps:30,durationInFrames:30});
    expect(resolveExportProfile(project,{sizing:"project"})).toMatchObject({width:640,height:360,fps:30});
  });

  it("normalizes odd custom H.264 dimensions before preparing the render Project",()=>{
    const project=createProject({id:"odd-custom",name:"Odd Custom",width:1920,height:1080,fps:30,durationInFrames:30});
    const prepared=projectForExportProfile(project,{sizing:"custom",width:853,height:479,fps:60});

    expect(prepared.profile).toMatchObject({width:852,height:478,fps:60});
    expect(prepared.project.canvas).toMatchObject({width:852,height:478,fps:60,durationInFrames:60});
    expect(project.canvas).toMatchObject({width:1920,height:1080,fps:30,durationInFrames:30});
  });

  it("passes the resolved even dimensions to the Remotion CLI contract",()=>{
    const project=createProject({id:"odd-argv",name:"Odd Argv",width:641,height:361,fps:30,durationInFrames:30});
    const prepared=projectForExportProfile(project,{sizing:"project"});
    const args=buildRemotionRenderArgs({project:prepared.project,outputPath:"out.mp4",mode:"final",assetBaseUrl:"http://127.0.0.1:3000"},"remotion/index.ts","props.json");

    const widthIndex=args.indexOf("--width");
    const heightIndex=args.indexOf("--height");
    expect(args[widthIndex+1]).toBe("640");
    expect(args[heightIndex+1]).toBe("360");
    expect(args).not.toContain("641");
    expect(args).not.toContain("361");
  });
});
