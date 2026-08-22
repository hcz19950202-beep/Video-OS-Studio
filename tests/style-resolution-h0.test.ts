import {describe,expect,it} from "vitest";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {resolveCaptionStyle,resolveMotionStyle} from "@/lib/styles/resolve";

describe("V2.1.1 H0 style resolution contract",()=>{
  it("uses Brand accent only as the Motion fallback",()=>{
    let project=createProject({id:"style-brand",name:"Style Brand"});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"m1",type:"motion",engine:"remotion",effectId:"big-number",props:{value:"42"},startFrame:0,durationInFrames:30,enabled:true,layer:1}});
    const clip=project.tracks[2]!.clips[0];
    if(!clip||clip.type!=="motion")throw new Error("motion missing");
    expect(resolveMotionStyle(project,clip).props.accentColor).toBe(project.brand.colors.primary);
  });

  it("preserves an explicit Clip accent when no Linked accent is present",()=>{
    let project=createProject({id:"style-clip",name:"Style Clip"});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"m1",type:"motion",engine:"remotion",effectId:"big-number",props:{accentColor:"#112233"},startFrame:0,durationInFrames:30,enabled:true,layer:1}});
    const clip=project.tracks[2]!.clips[0];
    if(!clip||clip.type!=="motion")throw new Error("motion missing");
    expect(resolveMotionStyle(project,clip).props.accentColor).toBe("#112233");
  });

  it("keeps Linked Motion properties live and higher priority than Clip properties",()=>{
    let project=createProject({id:"style-linked",name:"Style Linked"});
    const now="2026-08-22T00:00:00.000Z";
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"m1",type:"motion",engine:"remotion",effectId:"big-number",props:{accentColor:"#112233"},startFrame:0,durationInFrames:30,enabled:true,layer:1}});
    project=applyProjectCommand(project,{type:"add-linked-style",style:{id:"motion-linked",name:"Motion Linked",target:"motion",properties:{props:{accentColor:"#ABCDEF"}},createdAt:now,updatedAt:now}});
    project=applyProjectCommand(project,{type:"assign-linked-style",clipId:"m1",styleId:"motion-linked"});
    const clip=project.tracks[2]!.clips[0];
    if(!clip||clip.type!=="motion")throw new Error("motion missing");
    expect(resolveMotionStyle(project,clip).props.accentColor).toBe("#ABCDEF");
  });

  it("resolves Caption style as Linked property then Clip property then Brand default",()=>{
    let project=createProject({id:"caption-style",name:"Caption Style"});
    const now="2026-08-22T00:00:00.000Z";
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c1",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],style:{fill:"#334455",fontSize:54},startFrame:0,durationInFrames:30,enabled:true,layer:100}});
    project=applyProjectCommand(project,{type:"add-linked-style",style:{id:"caption-linked",name:"Caption Linked",target:"caption",properties:{style:{fontSize:72}},createdAt:now,updatedAt:now}});
    project=applyProjectCommand(project,{type:"assign-linked-style",clipId:"c1",styleId:"caption-linked"});
    const clip=project.tracks[1]!.clips[0];
    if(!clip||clip.type!=="caption")throw new Error("caption missing");
    expect(resolveCaptionStyle(project,clip)).toMatchObject({
      fontSize:72,
      fill:"#334455",
      fontFamily:project.brand.typography.captionFont,
    });
  });
});
