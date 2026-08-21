import {dirname} from "node:path";
import type {FileSystemAdapter,VideoUseAdapter} from "@/adapters/contracts";
import {applyProjectCommand} from "@/lib/project/commands";
import type {ProjectRepository} from "@/lib/project/repository";
import {buildScriptDocument,getProjectVideoSourceRanges,mergeSourceRanges} from "@/lib/script/model";
import {secondsToFrames} from "@/lib/timeline/frames";
import {VideoUseEdlSchema,type VideoUseEdl} from "@/lib/video-use/edl";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

type CaptionClip=Extract<Clip,{type:"caption"}>;

export class VideoUseService{
  constructor(private readonly fs:FileSystemAdapter,private readonly adapter:VideoUseAdapter,private readonly repository:ProjectRepository){}

  private primaryVideo(project:Project){
    const asset=project.assets.find((item)=>item.kind==="video");
    if(!asset)throw new Error("Import an MP4 before running video-use.");
    return asset;
  }

  async prepare(projectId:string){
    let project=await this.repository.load(projectId);
    const asset=this.primaryVideo(project);
    const inputPath=this.repository.resolveProjectFile(projectId,asset.relativePath);
    const editDir=dirname(this.repository.resolveProjectFile(projectId,"edit/takes_packed.md"));
    const result=await this.adapter.prepare({inputPath,editDir});
    const script=buildScriptDocument(result.words,project.canvas.fps,getProjectVideoSourceRanges(project));
    project=applyProjectCommand(project,{type:"set-script-document",script});
    await this.repository.save(project);
    return {
      project,
      wordCount:result.words.length,
      scriptSegmentCount:script.segments.length,
      text:result.text,
      packedText:result.packedText,
      transcriptRelativePath:`edit/transcripts/${result.transcriptPath.split(/[\\/]/).pop()}`,
      packedTranscriptRelativePath:"edit/takes_packed.md",
    };
  }

  async applyEdl(projectId:string,edlInput:VideoUseEdl):Promise<Project>{
    let project=await this.repository.load(projectId);
    const edl=VideoUseEdlSchema.parse(edlInput);
    const asset=this.primaryVideo(project);
    const maxFrames=asset.durationInFrames??project.canvas.durationInFrames;
    const blocked=project.tracks.filter((track)=>["motion","broll","audio"].includes(track.type)&&track.clips.length>0);
    if(blocked.length)throw new Error("Apply the video-use rough cut before Motion/B-roll/Audio design, or clear those tracks first so timing is not silently corrupted.");
    if(project.scenes.length)throw new Error("Apply the confirmed EDL before Scene design so Scene timing is not silently corrupted.");
    if(project.script.segments.some(segment=>segment.status==="removed"))throw new Error("Do not apply a new EDL after Script cuts. Restore the Script baseline or start from a fresh project first.");

    const sourceCaptions=(project.tracks.find((track)=>track.id==="captions-main")?.clips??[]).filter((clip):clip is CaptionClip=>clip.type==="caption");
    const videoTrack=project.tracks.find((track)=>track.id==="video-main");
    for(const clip of videoTrack?.clips??[])project=applyProjectCommand(project,{type:"remove-clip",clipId:clip.id});
    for(const clip of sourceCaptions)project=applyProjectCommand(project,{type:"remove-clip",clipId:clip.id});

    let outputCursor=0;
    const remappedCaptions:CaptionClip[]=[];
    const baseSourceRanges:Array<{startFrame:number;endFrame:number}>=[];
    edl.ranges.forEach((range,index)=>{
      const sourceStart=secondsToFrames(range.start,project.canvas.fps);
      const sourceEnd=Math.max(sourceStart+1,secondsToFrames(range.end,project.canvas.fps));
      if(sourceEnd>maxFrames+1)throw new Error(`EDL range ${index+1} exceeds the source media duration.`);
      const durationInFrames=sourceEnd-sourceStart;
      baseSourceRanges.push({startFrame:sourceStart,endFrame:sourceEnd});
      project=applyProjectCommand(project,{type:"add-clip",trackId:"video-main",clip:{id:`edl-video-${index+1}`,type:"video",assetId:asset.id,startFrame:outputCursor,durationInFrames,sourceStartFrame:sourceStart,volume:1,enabled:true,layer:0}});
      for(const caption of sourceCaptions){
        const captionEnd=caption.startFrame+caption.durationInFrames;
        const overlapStart=Math.max(caption.startFrame,sourceStart);
        const overlapEnd=Math.min(captionEnd,sourceEnd);
        if(overlapEnd>overlapStart)remappedCaptions.push({...caption,id:`edl-caption-${index+1}-${caption.id}`,startFrame:outputCursor+(overlapStart-sourceStart),durationInFrames:overlapEnd-overlapStart});
      }
      outputCursor+=durationInFrames;
    });

    for(const caption of remappedCaptions)project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:caption});
    project=applyProjectCommand(project,{type:"set-duration",durationInFrames:Math.max(1,outputCursor)});

    if(project.script.segments.length){
      const ranges=mergeSourceRanges(baseSourceRanges);
      const script=structuredClone(project.script);
      script.baseSourceRanges=ranges;
      script.segments=script.segments.map(segment=>({...segment,status:"active" as const,words:segment.words.filter(word=>ranges.some(range=>word.endFrame>range.startFrame&&word.startFrame<range.endFrame))})).filter(segment=>segment.words.length>0);
      for(const segment of script.segments)delete segment.sceneId;
      project=applyProjectCommand(project,{type:"set-script-document",script});
    }

    await this.repository.save(project);
    await this.fs.writeTextAtomic(this.repository.resolveProjectFile(projectId,"edit/edl.json"),JSON.stringify(edl,null,2));
    return project;
  }
}