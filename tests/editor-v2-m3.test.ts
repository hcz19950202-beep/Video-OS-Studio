import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {applyProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {resolveCaptionStyle,resolveMotionStyle} from "@/lib/styles/resolve";

describe("V2 M3 editor core",()=>{
  it("persists contextual Video B-roll and Audio properties",()=>{
    let project=createProject({id:"m3-media",name:"M3",durationInFrames:600});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:"v",type:"video",assetId:"video",startFrame:0,durationInFrames:300,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"broll-main",clip:{id:"b",type:"broll",assetId:"broll",startFrame:30,durationInFrames:90,enabled:true,layer:1}});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"audio-main",clip:{id:"a",type:"audio",assetId:"audio",startFrame:0,durationInFrames:300,sourceStartFrame:0,volume:1,enabled:true,layer:0}});
    project=applyProjectCommand(project,{type:"update-video-properties",clipId:"v",fit:"cover",muted:true,transform:{x:12,y:-8,scale:1.1,opacity:.9}});
    project=applyProjectCommand(project,{type:"update-broll-properties",clipId:"b",fit:"contain",muted:false,volume:.4,fadeInFrames:10,fadeOutFrames:12,transform:{scale:.8}});
    project=applyProjectCommand(project,{type:"update-audio-properties",clipId:"a",role:"voice",volume:.75,muted:false,fadeInFrames:5,fadeOutFrames:8});
    const video=project.tracks[0]!.clips[0];const broll=project.tracks[3]!.clips[0];const audio=project.tracks[4]!.clips[0];
    expect(video).toMatchObject({type:"video",fit:"cover",muted:true,transform:{x:12,y:-8,scale:1.1,opacity:.9,anchor:"center"}});
    expect(broll).toMatchObject({type:"broll",fit:"contain",muted:false,volume:.4,fadeInFrames:10,fadeOutFrames:12,transform:{scale:.8}});
    expect(audio).toMatchObject({type:"audio",role:"voice",volume:.75,fadeInFrames:5,fadeOutFrames:8});
  });

  it("resolves live Motion linked styles and Brand scale without copying values into clips",()=>{
    let project=createProject({id:"m3-style",name:"M3"});
    project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id:"m1",type:"motion",engine:"remotion",effectId:"metric-focus",props:{accentColor:"#111111",value:"90%"},transform:{x:0,y:0,scale:1,opacity:1,anchor:"center"},startFrame:0,durationInFrames:60,enabled:true,layer:1}});
    const now="2026-08-21T00:00:00.000Z";
    project=applyProjectCommand(project,{type:"add-linked-style",style:{id:"data-blue",name:"Data Blue",target:"motion",properties:{props:{accentColor:"#123456"},transform:{scale:1.5,opacity:.8}},createdAt:now,updatedAt:now}});
    project=applyProjectCommand(project,{type:"assign-linked-style",clipId:"m1",styleId:"data-blue"});
    project=applyProjectCommand(project,{type:"set-brand",brand:{...project.brand,motion:{...project.brand.motion,scale:1.2}}});
    const clip=project.tracks[2]!.clips[0];if(!clip||clip.type!=="motion")throw new Error("motion missing");
    expect(clip.props.accentColor).toBe("#111111");
    const resolved=resolveMotionStyle(project,clip);
    expect(resolved.props.accentColor).toBe("#123456");
    expect(resolved.transform.scale).toBeCloseTo(1.8);
    expect(resolved.transform.opacity).toBe(.8);
    const updated={...project.linkedStyles[0]!,properties:{props:{accentColor:"#ABCDEF"},transform:{scale:2,opacity:.6}},updatedAt:"2026-08-21T00:01:00.000Z"};
    project=applyProjectCommand(project,{type:"update-linked-style",style:updated});
    const next=project.tracks[2]!.clips[0];if(!next||next.type!=="motion")throw new Error("motion missing");
    expect(resolveMotionStyle(project,next).props.accentColor).toBe("#ABCDEF");
    expect(resolveMotionStyle(project,next).transform.scale).toBeCloseTo(2.4);
  });

  it("resolves caption Brand defaults and linked style overrides",()=>{
    let project=createProject({id:"m3-caption",name:"M3"});const now="2026-08-21T00:00:00.000Z";
    project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"c",type:"caption",text:"Hello",preset:"primary",emphasis:"none",keywords:[],startFrame:0,durationInFrames:60,enabled:true,layer:100}});
    project=applyProjectCommand(project,{type:"add-linked-style",style:{id:"caption-pro",name:"Caption Pro",target:"caption",properties:{style:{fill:"#00FF00",fontSize:72,background:"rgba(0,0,0,.4)"}},createdAt:now,updatedAt:now}});
    project=applyProjectCommand(project,{type:"assign-linked-style",clipId:"c",styleId:"caption-pro"});
    const clip=project.tracks[1]!.clips[0];if(!clip||clip.type!=="caption")throw new Error("caption missing");
    expect(resolveCaptionStyle(project,clip)).toMatchObject({fill:"#00FF00",fontSize:72,background:"rgba(0,0,0,.4)",fontFamily:project.brand.typography.captionFont});
  });

  it("applies bulk common-property edits as one revision",()=>{
    let project=createProject({id:"m3-bulk",name:"M3"});
    for(const id of ["m1","m2","m3"])project=applyProjectCommand(project,{type:"add-clip",trackId:"motion-main",clip:{id,type:"motion",engine:"remotion",effectId:"big-number",props:{},startFrame:0,durationInFrames:30,enabled:true,layer:1}});
    const before=project.project.revision;
    project=applyProjectCommandTransaction(project,{id:"bulk",label:"Bulk scale",commands:["m1","m2","m3"].map(clipId=>({type:"update-motion-transform" as const,clipId,transform:{scale:1.4}}))});
    expect(project.project.revision).toBe(before+1);
    expect(project.tracks[2]!.clips.every(clip=>clip.type==="motion"&&clip.transform?.scale===1.4)).toBe(true);
  });
});
