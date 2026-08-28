import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {resolveExportProfile} from "@/lib/render/profile";

describe("V2.3.1 H5 normalized export aspect contract",()=>{
  it("calculates aspect mismatch from the actual resolved H.264 dimensions",()=>{
    const project=createProject({id:"odd-aspect",name:"Odd Aspect",width:641,height:361,fps:30,durationInFrames:30});
    expect(resolveExportProfile(project,{sizing:"project"})).toMatchObject({width:640,height:360,aspectMismatch:false});
    expect(resolveExportProfile(project,{sizing:"custom",width:641,height:641})).toMatchObject({width:640,height:640,aspectMismatch:true});
  });
});
