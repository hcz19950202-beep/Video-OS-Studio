import {describe,expect,it} from "vitest";
import type {HyperFramesAdapter} from "@/adapters/contracts";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AssetLibraryService} from "@/lib/assets/service";
import {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import {applyProjectCommand} from "@/lib/project/commands";
import {ProjectRepository} from "@/lib/project/repository";
import {BigNumberDefaults} from "@/shared/effects/remotion/BigNumber/defaults";

describe("Phase 10 asset library",()=>{
  it("saves, promotes and reuses a Remotion preset across projects",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    const hyperAdapter:HyperFramesAdapter={render:async(input)=>{await fs.writeBinary(input.outputPath,new Uint8Array([1]));return{outputPath:input.outputPath};}};
    const hyperFrames=new HyperFramesRenderService(fs,hyperAdapter,repository);
    const assets=new AssetLibraryService(fs,"/data",repository,hyperFrames);

    let source=await repository.create({id:"source",name:"Source",durationInFrames:300});
    source=applyProjectCommand(source,{type:"add-clip",trackId:"motion-main",clip:{id:"m1",type:"motion",engine:"remotion",effectId:"big-number",props:BigNumberDefaults,startFrame:20,durationInFrames:90,enabled:true,layer:10}});
    await repository.save(source);

    const preset=await assets.saveFromMotionClip("source","m1","15 Day Metric");
    expect((await assets.load()).presets).toHaveLength(1);
    const promoted=await assets.update(preset.id,{favorite:true,status:"production-ready"});
    expect(promoted).toMatchObject({favorite:true,status:"production-ready"});
    await expect(fs.readText(`/data/library/promoted/${preset.id}.json`)).resolves.toContain("15 Day Metric");

    await repository.create({id:"target",name:"Target",durationInFrames:300});
    const target=await assets.applyToProject("target",preset.id,60);
    expect(target.tracks.find((track)=>track.id==="motion-main")?.clips[0]).toMatchObject({type:"motion",engine:"remotion",effectId:"big-number",startFrame:60,durationInFrames:90});
  });
});
