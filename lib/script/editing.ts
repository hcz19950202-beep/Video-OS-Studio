import {applyProjectCommandTransaction,type ProjectCommandTransaction} from "@/lib/project/history";
import {getScriptKeepSourceRanges,mergeSourceRanges} from "@/lib/script/model";
import type {Project} from "@/schemas/project";
import type {ScriptDocument,ScriptSourceRange} from "@/schemas/script";

export type ScriptSegmentStatus="active"|"removed";
type VideoClip=Extract<Project["tracks"][number]["clips"][number],{type:"video"}>;
type VideoPresentation=Pick<VideoClip,"volume"|"enabled"|"layer">&Pick<Partial<VideoClip>,"muted"|"fit"|"transform">;

type ScriptVideoContext={
  trackId:string;
  assetId:string;
  clips:VideoClip[];
  presentation:VideoPresentation;
  baseSourceRanges:ScriptSourceRange[];
};

const videoClipsFor=(track:Project["tracks"][number])=>track.clips.filter((clip):clip is VideoClip=>clip.type==="video");
const sourceRangeFor=(clip:VideoClip):ScriptSourceRange=>({startFrame:clip.sourceStartFrame,endFrame:clip.sourceStartFrame+clip.durationInFrames});
const sameRange=(clip:VideoClip,range:ScriptSourceRange)=>clip.sourceStartFrame===range.startFrame&&clip.durationInFrames===range.endFrame-range.startFrame;
const presentationFor=(clip:VideoClip):VideoPresentation=>({
  volume:clip.volume,
  enabled:clip.enabled,
  layer:clip.layer,
  ...(clip.muted===undefined?{}:{muted:clip.muted}),
  ...(clip.fit===undefined?{}:{fit:clip.fit}),
  ...(clip.transform===undefined?{}:{transform:structuredClone(clip.transform)}),
});
const samePresentation=(left:VideoPresentation,right:VideoPresentation)=>JSON.stringify(left)===JSON.stringify(right);

const canonicalCurrentRanges=(script:ScriptDocument,clips:VideoClip[]):ScriptSourceRange[]=>{
  if(script.baseSourceRanges.length)return getScriptKeepSourceRanges(script);
  if(clips.length!==1)throw new Error("Script editing cannot safely infer its A-roll from multiple Video clips before the Script source range is initialized.");
  return mergeSourceRanges(clips.map(sourceRangeFor));
};

export const resolveScriptVideoContext=(project:Project,script:ScriptDocument=project.script):ScriptVideoContext=>{
  const populatedVideoTracks=project.tracks
    .filter(track=>track.type==="video")
    .map(track=>({track,clips:videoClipsFor(track)}))
    .filter(item=>item.clips.length>0);

  if(populatedVideoTracks.length!==1){
    throw new Error(populatedVideoTracks.length===0
      ?"Script editing requires one active A-roll Video track."
      :"Script editing is blocked because multiple populated Video tracks make the canonical A-roll ambiguous.");
  }

  const {track,clips:unsorted}=populatedVideoTracks[0]!;
  const clips=[...unsorted].sort((a,b)=>a.startFrame-b.startFrame||a.sourceStartFrame-b.sourceStartFrame);
  const assetIds=new Set(clips.map(clip=>clip.assetId));
  if(assetIds.size!==1)throw new Error("Script editing is blocked because the A-roll Video track contains clips from multiple source assets.");

  const expectedRanges=canonicalCurrentRanges(script,clips);
  if(expectedRanges.length!==clips.length)throw new Error("Script editing is blocked because the Video track contains clips that are not the canonical Script A-roll.");

  let cursor=0;
  for(let index=0;index<clips.length;index+=1){
    const clip=clips[index]!;
    const expected=expectedRanges[index]!;
    if(clip.startFrame!==cursor||!sameRange(clip,expected)){
      throw new Error("Script editing is blocked because the Video track timeline/source ranges no longer match the canonical Script A-roll.");
    }
    cursor+=clip.durationInFrames;
  }

  const presentation=presentationFor(clips[0]!);
  if(clips.some(clip=>!samePresentation(presentationFor(clip),presentation))){
    throw new Error("Script editing is blocked because A-roll clips have different Video presentation properties. Normalize them before rebuilding Script cuts.");
  }

  return{
    trackId:track.id,
    assetId:clips[0]!.assetId,
    clips,
    presentation,
    baseSourceRanges:script.baseSourceRanges.length?mergeSourceRanges(script.baseSourceRanges):mergeSourceRanges(clips.map(sourceRangeFor)),
  };
};

export const assertScriptEditingSafe=(project:Project)=>{
  const blockingTracks=project.tracks.filter(track=>track.type!=="video"&&track.clips.length>0);
  if(blockingTracks.length)throw new Error("Finish Script editing before Captions, Motion, B-roll or Audio design. Clear those tracks before changing spoken-content cuts.");
  if(project.scenes.length)throw new Error("Finish spoken-content cuts before Scene design. Remove or regenerate Scenes before deleting/restoring Script segments.");
};

export const buildScriptStatusTransaction=(project:Project,segmentId:string,status:ScriptSegmentStatus):ProjectCommandTransaction=>{
  assertScriptEditingSafe(project);
  if(!project.script.segments.length)throw new Error("Transcribe the talking-head video before editing the Script.");
  const segment=project.script.segments.find(item=>item.id===segmentId);
  if(!segment)throw new Error(`Script segment ${segmentId} not found`);
  if(segment.status===status)throw new Error(`Script segment ${segmentId} is already ${status}`);

  const script=structuredClone(project.script);
  const context=resolveScriptVideoContext(project,script);
  if(!script.baseSourceRanges.length)script.baseSourceRanges=context.baseSourceRanges;
  const target=script.segments.find(item=>item.id===segmentId)!;
  target.status=status;
  const keepRanges=getScriptKeepSourceRanges(script);
  if(!keepRanges.length)throw new Error("Script editing cannot remove all A-roll content. Keep at least one source range so the Video presentation state remains recoverable.");

  const commands:ProjectCommandTransaction["commands"]=[];
  commands.push({type:"set-script-document",script});
  for(const clip of context.clips)commands.push({type:"remove-clip",clipId:clip.id});

  let cursor=0;
  keepRanges.forEach((range,index)=>{
    const durationInFrames=range.endFrame-range.startFrame;
    const presentation=context.presentation;
    commands.push({
      type:"add-clip",
      trackId:context.trackId,
      clip:{
        id:`script-video-${index+1}`,
        type:"video",
        assetId:context.assetId,
        startFrame:cursor,
        durationInFrames,
        sourceStartFrame:range.startFrame,
        volume:presentation.volume,
        enabled:presentation.enabled,
        layer:presentation.layer,
        ...(presentation.muted===undefined?{}:{muted:presentation.muted}),
        ...(presentation.fit===undefined?{}:{fit:presentation.fit}),
        ...(presentation.transform===undefined?{}:{transform:structuredClone(presentation.transform)}),
      },
    });
    cursor+=durationInFrames;
  });
  commands.push({type:"set-duration",durationInFrames:cursor});

  return{id:`script-${status}-${segmentId}`,label:`${status==="removed"?"Remove":"Restore"} Script segment`,commands};
};

export const applyScriptSegmentStatus=(project:Project,segmentId:string,status:ScriptSegmentStatus,options?:{now?:string})=>
  applyProjectCommandTransaction(project,buildScriptStatusTransaction(project,segmentId,status),options);
