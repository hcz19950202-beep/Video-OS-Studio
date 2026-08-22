import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {MockFfmpegAdapter} from "@/adapters/mocks";
import {MediaImportService} from "@/lib/media/import-service";
import {planMediaImport} from "@/lib/media/import-policy";
import {ProjectRepository} from "@/lib/project/repository";

describe("V2.1 universal media ingest",()=>{
  it("classifies common user-facing formats and normalizes unstable working formats",()=>{
    expect(planMediaImport("camera.MP4")).toMatchObject({kind:"video",strategy:"native",workingExtension:".mp4"});
    for(const name of["camera.MOV","clip.m4v","capture.webm","master.mkv","legacy.avi"])expect(planMediaImport(name)).toMatchObject({kind:"video",strategy:"normalize-video",workingExtension:".mp4"});
    for(const name of["music.mp3","audio.wav","voice.m4a"])expect(planMediaImport(name)).toMatchObject({kind:"audio",strategy:"asset-only"});
    for(const name of["track.aac","mix.flac"])expect(planMediaImport(name)).toMatchObject({kind:"audio",strategy:"normalize-audio",workingExtension:".m4a"});
    for(const name of["frame.png","photo.jpg","photo.jpeg","art.webp"])expect(planMediaImport(name).kind).toBe("image");
    expect(planMediaImport("captions.srt").kind).toBe("subtitle");expect(()=>planMediaImport("archive.zip")).toThrow(/Unsupported media extension/);
  });

  it("preserves an original MOV while attaching a normalized working MP4 to the project",async()=>{
    const fs=new InMemoryFileSystemAdapter();const ffmpeg=new MockFfmpegAdapter({durationSeconds:4,width:3840,height:2160,fps:25,hasAudio:true});const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"universal-mov",name:"MOV",width:1920,height:1080,fps:30});const service=new MediaImportService(fs,ffmpeg,repository,()=>"fixed");
    const result=await service.importWithReport({projectId:"universal-mov",fileName:"IMG_0948.MOV",mimeType:"video/quicktime",bytes:new Uint8Array([1,2,3,4])});
    expect(result.import).toMatchObject({kind:"video",strategy:"normalize-video",normalized:true,assetId:"media-fixed",originalRelativePath:"original/media-fixed-IMG_0948.MOV",workingRelativePath:"input/media-fixed-IMG_0948-working.mp4"});
    expect(ffmpeg.normalized).toHaveLength(1);expect(ffmpeg.normalized[0]?.inputPath.replaceAll("\\","/")).toContain("/projects/universal-mov/original/media-fixed-IMG_0948.MOV");expect(ffmpeg.normalized[0]?.outputPath.replaceAll("\\","/")).toContain("/projects/universal-mov/input/media-fixed-IMG_0948-working.mp4");
    const asset=result.project.assets.find(item=>item.id==="media-fixed");expect(asset).toMatchObject({kind:"video",relativePath:"input/media-fixed-IMG_0948-working.mp4",originalRelativePath:"original/media-fixed-IMG_0948.MOV",originalName:"IMG_0948.MOV",mimeType:"video/mp4",originalMimeType:"video/quicktime",width:3840,height:2160,sourceFps:25,hasAudio:true,durationInFrames:120});
    expect(result.project.canvas).toMatchObject({width:1920,height:1080,fps:30,durationInFrames:120});expect(result.project.tracks.find(track=>track.id==="video-main")?.clips).toHaveLength(1);
  });

  it("preserves FLAC while creating an internal M4A working asset",async()=>{
    const fs=new InMemoryFileSystemAdapter();const ffmpeg=new MockFfmpegAdapter({durationSeconds:5,hasAudio:true});const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"audio-normalize",name:"Audio",width:1080,height:1080,fps:30});const service=new MediaImportService(fs,ffmpeg,repository,()=>"audio-fixed");
    const result=await service.importWithReport({projectId:"audio-normalize",fileName:"music.flac",mimeType:"audio/flac",bytes:new Uint8Array([9,8,7])});
    expect(result.import).toMatchObject({kind:"audio",strategy:"normalize-audio",normalized:true,originalRelativePath:"original/media-audio-fixed-music.flac",workingRelativePath:"assets/media-audio-fixed-music-working.m4a"});
    expect(ffmpeg.normalizedAudio).toHaveLength(1);
    expect(result.project.assets.find(asset=>asset.id==="media-audio-fixed")).toMatchObject({kind:"audio",relativePath:"assets/media-audio-fixed-music-working.m4a",originalRelativePath:"original/media-audio-fixed-music.flac",mimeType:"audio/mp4",originalMimeType:"audio/flac",durationInFrames:150});
    expect(result.project.canvas).toMatchObject({width:1080,height:1080,fps:30});
  });

  it("keeps MP4 and common audio native and imports images without changing the project canvas",async()=>{
    const fs=new InMemoryFileSystemAdapter();const ffmpeg=new MockFfmpegAdapter({durationSeconds:2,width:1280,height:720,fps:30,hasAudio:true});const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"universal-assets",name:"Assets",width:900,height:1600,fps:30});let sequence=0;const service=new MediaImportService(fs,ffmpeg,repository,()=>String(++sequence));
    const mp4=await service.importWithReport({projectId:"universal-assets",fileName:"source.mp4",bytes:new Uint8Array([1])});expect(mp4.import.normalized).toBe(false);expect(ffmpeg.normalized).toHaveLength(0);
    const audio=await service.importWithReport({projectId:"universal-assets",fileName:"music.mp3",bytes:new Uint8Array([2])});expect(audio.project.assets.some(asset=>asset.kind==="audio"&&asset.originalName==="music.mp3")).toBe(true);expect(ffmpeg.normalizedAudio).toHaveLength(0);
    const image=await service.importWithReport({projectId:"universal-assets",fileName:"photo.webp",bytes:new Uint8Array([3])});expect(image.project.assets.some(asset=>asset.kind==="image"&&asset.originalName==="photo.webp")).toBe(true);expect(image.project.canvas).toMatchObject({width:900,height:1600,fps:30});
  });
});
