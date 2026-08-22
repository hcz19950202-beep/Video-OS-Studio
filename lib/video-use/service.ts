import {randomUUID} from "node:crypto";
import {dirname} from "node:path";
import type {FileSystemAdapter,ToolExecutionOptions,VideoUseAdapter} from "@/adapters/contracts";
import type {ProjectCommand} from "@/lib/project/commands";
import {applyProjectCommandTransaction} from "@/lib/project/history";
import {ProjectMutationCoordinator,ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import type {ProjectRepository} from "@/lib/project/repository";
import {buildScriptDocument,getProjectVideoSourceRanges,mergeSourceRanges} from "@/lib/script/model";
import {secondsToFrames} from "@/lib/timeline/frames";
import {VideoUseEdlSchema,type VideoUseEdl} from "@/lib/video-use/edl";
import type {Clip} from "@/schemas/clip";
import type {Project} from "@/schemas/project";

type CaptionClip=Extract<Clip,{type:"caption"}>;
type MutationMeta={expectedRevision:number;operationId:string};

export class VideoUseService{
  private readonly mutations:ProjectMutationCoordinator;
  constructor(private readonly fs:FileSystemAdapter,private readonly adapter:VideoUseAdapter,private readonly repository:ProjectRepository,mutations?:ProjectMutationCoordinator){this.mutations=mutations??new ProjectMutationCoordinator(fs,repository);}

  private primaryVideo(project:Project){const asset=project.assets.find(item=>item.kind==="video");if(!asset)throw new Error("Import an MP4 before running video-use.");return asset;}
  private async baseline(projectId:string,meta?:MutationMeta){const project=await this.repository.load(projectId);if(meta&&project.project.revision!==meta.expectedRevision)throw new ProjectRevisionConflictError(meta.expectedRevision,project.project.revision);return project;}

  async prepare(projectId:string,meta?:MutationMeta,options:ToolExecutionOptions={}){
    const baseline=await this.baseline(projectId,meta);
    const expectedRevision=meta?.expectedRevision??baseline.project.revision;
    const operationId=meta?.operationId??`video-use-prepare-${randomUUID()}`;
    const asset=this.primaryVideo(baseline);
    const inputPath=this.repository.resolveProjectFile(projectId,asset.relativePath);
    const editDir=dirname(this.repository.resolveProjectFile(projectId,"edit/takes_packed.md"));
    const result=await this.adapter.prepare({inputPath,editDir},options);
    const script=buildScriptDocument(result.words,baseline.canvas.fps,getProjectVideoSourceRanges(baseline));
    const committed=await this.mutations.mutate({projectId,expectedRevision,operationId,kind:"video-use",payload:{action:"prepare",assetId:asset.id,script},apply:current=>applyProjectCommandTransaction(current,{id:operationId,label:"video-use · Prepare transcript",commands:[{type:"set-script-document",script}]})});
    return{project:committed.project,wordCount:result.words.length,scriptSegmentCount:script.segments.length,text:result.text,packedText:result.packedText,transcriptRelativePath:`edit/transcripts/${result.transcriptPath.split(/[\\/]/).pop()}`,packedTranscriptRelativePath:"edit/takes_packed.md",alreadyApplied:committed.alreadyApplied};
  }

  async applyEdl(projectId:string,edlInput:VideoUseEdl,meta?:MutationMeta):Promise<Project>{
    const baseline=await this.baseline(projectId,meta);const expectedRevision=meta?.expectedRevision??baseline.project.revision;const operationId=meta?.operationId??`video-use-edl-${randomUUID()}`;const edl=VideoUseEdlSchema.parse(edlInput);const asset=this.primaryVideo(baseline);const maxFrames=asset.durationInFrames??baseline.canvas.durationInFrames;
    const commands:ProjectCommand[]=[];const blocked=baseline.tracks.filter(track=>["motion","broll","audio"].includes(track.type)&&track.clips.length>0);if(blocked.length)throw new Error("Apply the video-use rough cut before Motion/B-roll/Audio design, or clear those tracks first so timing is not silently corrupted.");if(baseline.scenes.length)throw new Error("Apply the confirmed EDL before Scene design so Scene timing is not silently corrupted.");if(baseline.script.segments.some(segment=>segment.status==="removed"))throw new Error("Do not apply a new EDL after Script cuts. Restore the Script baseline or start from a fresh project first.");
    const sourceCaptions=(baseline.tracks.find(track=>track.id==="captions-main")?.clips??[]).filter((clip):clip is CaptionClip=>clip.type==="caption");const videoTrack=baseline.tracks.find(track=>track.id==="video-main");for(const clip of videoTrack?.clips??[])commands.push({type:"remove-clip",clipId:clip.id});for(const clip of sourceCaptions)commands.push({type:"remove-clip",clipId:clip.id});
    let outputCursor=0;const remappedCaptions:CaptionClip[]=[];const baseSourceRanges:Array<{startFrame:number;endFrame:number}>=[];
    edl.ranges.forEach((range,index)=>{const sourceStart=secondsToFrames(range.start,baseline.canvas.fps);const sourceEnd=Math.max(sourceStart+1,secondsToFrames(range.end,baseline.canvas.fps));if(sourceEnd>maxFrames+1)throw new Error(`EDL range ${index+1} exceeds the source media duration.`);const durationInFrames=sourceEnd-sourceStart;baseSourceRanges.push({startFrame:sourceStart,endFrame:sourceEnd});commands.push({type:"add-clip",trackId:"video-main",clip:{id:`edl-video-${index+1}`,type:"video",assetId:asset.id,startFrame:outputCursor,durationInFrames,sourceStartFrame:sourceStart,volume:1,enabled:true,layer:0}});for(const caption of sourceCaptions){const captionEnd=caption.startFrame+caption.durationInFrames;const overlapStart=Math.max(caption.startFrame,sourceStart);const overlapEnd=Math.min(captionEnd,sourceEnd);if(overlapEnd>overlapStart)remappedCaptions.push({...caption,id:`edl-caption-${index+1}-${caption.id}`,startFrame:outputCursor+(overlapStart-sourceStart),durationInFrames:overlapEnd-overlapStart});}outputCursor+=durationInFrames;});
    for(const caption of remappedCaptions)commands.push({type:"add-clip",trackId:"captions-main",clip:caption});commands.push({type:"set-duration",durationInFrames:Math.max(1,outputCursor)});
    if(baseline.script.segments.length){const ranges=mergeSourceRanges(baseSourceRanges);const script=structuredClone(baseline.script);script.baseSourceRanges=ranges;script.segments=script.segments.map(segment=>({...segment,status:"active" as const,words:segment.words.filter(word=>ranges.some(range=>word.endFrame>range.startFrame&&word.startFrame<range.endFrame))})).filter(segment=>segment.words.length>0);for(const segment of script.segments)delete segment.sceneId;commands.push({type:"set-script-document",script});}
    const committed=await this.mutations.mutate({projectId,expectedRevision,operationId,kind:"video-use",payload:{action:"apply-edl",edl},apply:current=>applyProjectCommandTransaction(current,{id:operationId,label:"video-use · Apply EDL",commands})});await this.fs.writeTextAtomic(this.repository.resolveProjectFile(projectId,"edit/edl.json"),JSON.stringify(edl,null,2));return committed.project;
  }
}
