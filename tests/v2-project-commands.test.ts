import {describe,expect,it} from "vitest";
import {createProject} from "@/lib/project/factory";
import {applyProjectCommand} from "@/lib/project/commands";

describe("V2 semantic project commands",()=>{
  it("manages scenes and clears script references when a scene is removed",()=>{
    let project=createProject({id:"semantic",name:"Semantic",durationInFrames:300,now:"2026-08-20T00:00:00.000Z"});
    project=applyProjectCommand(project,{type:"add-scene",scene:{id:"s1",name:"Hook",semanticType:"hook",startFrame:0,endFrame:90}},{now:"2026-08-20T00:01:00.000Z"});
    project=applyProjectCommand(project,{type:"set-script-document",script:{segments:[{id:"seg1",sceneId:"s1",words:[],status:"active",semanticTags:[]}]}},{now:"2026-08-20T00:02:00.000Z"});
    project=applyProjectCommand(project,{type:"update-scene",sceneId:"s1",patch:{name:"Opening Hook",summary:"Opening"}},{now:"2026-08-20T00:03:00.000Z"});
    expect(project.scenes[0]?.name).toBe("Opening Hook");
    project=applyProjectCommand(project,{type:"remove-scene",sceneId:"s1"},{now:"2026-08-20T00:04:00.000Z"});
    expect(project.scenes).toEqual([]);
    expect(project.script.segments[0]?.sceneId).toBeUndefined();
  });

  it("manages markers, brand, language and linked styles through validated commands",()=>{
    let project=createProject({id:"semantic-2",name:"Semantic",durationInFrames:300,now:"2026-08-20T00:00:00.000Z"});
    project=applyProjectCommand(project,{type:"add-marker",marker:{id:"m1",frame:15,type:"beat",label:"Beat"}});
    project=applyProjectCommand(project,{type:"update-marker",markerId:"m1",patch:{frame:20,label:null}});
    expect(project.markers[0]).toMatchObject({id:"m1",frame:20,type:"beat"});
    expect(project.markers[0]?.label).toBeUndefined();

    project=applyProjectCommand(project,{type:"set-language-config",language:{sourceLanguage:"zh-CN",captionTracks:[{language:"zh-CN",role:"original"}]}});
    expect(project.language.sourceLanguage).toBe("zh-CN");

    const style={id:"style-1",name:"Data",target:"motion" as const,properties:{accentColor:"#3B82F6"},createdAt:"2026-08-20T00:00:00.000Z",updatedAt:"2026-08-20T00:00:00.000Z"};
    project=applyProjectCommand(project,{type:"add-linked-style",style});
    project=applyProjectCommand(project,{type:"update-linked-style",style:{...style,name:"Data Blue",updatedAt:"2026-08-20T01:00:00.000Z"}});
    expect(project.linkedStyles[0]?.name).toBe("Data Blue");
  });
});
