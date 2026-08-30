import {describe,expect,it} from "vitest";
import {projectForExportProfile} from "@/lib/render/profile";
import {ProjectSchema} from "@/schemas/project";

const project=()=>ProjectSchema.parse({
  version:"2.0.0",
  project:{
    id:"fps-export-project",
    name:"FPS export",
    revision:1,
    createdAt:"2026-08-30T00:00:00.000Z",
    updatedAt:"2026-08-30T00:00:00.000Z",
  },
  canvas:{width:1920,height:1080,fps:30,durationInFrames:60},
  assets:[{
    id:"short-video",
    kind:"video",
    relativePath:"assets/short-video.mp4",
    durationInFrames:2,
    sourceFps:30,
  }],
  tracks:[{
    id:"video-main",
    type:"video",
    name:"Video",
    clips:[{
      id:"one-frame-clip",
      type:"video",
      assetId:"short-video",
      sourceStartFrame:1,
      startFrame:29,
      durationInFrames:1,
      enabled:true,
      layer:0,
    }],
  }],
  scenes:[{
    id:"one-frame-scene",
    name:"One frame scene",
    semanticType:"custom",
    startFrame:29,
    endFrame:30,
  }],
  markers:[{id:"last-marker",frame:59,type:"note"}],
});

describe("V2.4.2 export FPS rescaling",()=>{
  it("keeps one-frame timeline intervals and source bounds valid when reducing FPS",()=>{
    const result=projectForExportProfile(project(),{sizing:"custom",fps:15,width:1920,height:1080});

    expect(()=>ProjectSchema.parse(result.project)).not.toThrow();
    expect(result.project.canvas).toMatchObject({fps:15,durationInFrames:30});
    expect(result.project.assets[0]?.durationInFrames).toBe(1);
    expect(result.project.scenes[0]).toMatchObject({startFrame:15,endFrame:16});
    expect(result.project.markers[0]?.frame).toBe(29);
    expect(result.project.tracks[0]?.clips[0]).toMatchObject({
      startFrame:15,
      durationInFrames:1,
      sourceStartFrame:0,
    });
  });
});
