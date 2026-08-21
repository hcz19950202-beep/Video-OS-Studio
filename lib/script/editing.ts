import {applyProjectCommandTransaction,type ProjectCommandTransaction} from "@/lib/project/history";
import {getProjectVideoSourceRanges,getScriptKeepSourceRanges} from "@/lib/script/model";
import type {Project} from "@/schemas/project";

export type ScriptSegmentStatus="active"|"removed";

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
  if(!script.baseSourceRanges.length)script.baseSourceRanges=getProjectVideoSourceRanges(project);
  const target=script.segments.find(item=>item.id===segmentId)!;
  target.status=status;
  const keepRanges=getScriptKeepSourceRanges(script);

  const currentVideo=project.tracks.find(track=>track.type==="video")?.clips.find(clip=>clip.type==="video");
  const assetId=currentVideo?.type==="video"?currentVideo.assetId:project.assets.find(asset=>asset.kind==="video")?.id;
  if(!assetId)throw new Error("No source video asset is available for Script editing.");
  const volume=currentVideo?.type==="video"?currentVideo.volume:1;

  const commands:ProjectCommandTransaction["commands"]=[];
  commands.push({type:"set-script-document",script});
  for(const clip of project.tracks.find(track=>track.type==="video")?.clips??[])commands.push({type:"remove-clip",clipId:clip.id});

  let cursor=0;
  keepRanges.forEach((range,index)=>{
    const durationInFrames=range.endFrame-range.startFrame;
    commands.push({type:"add-clip",trackId:"video-main",clip:{id:`script-video-${index+1}`,type:"video",assetId,startFrame:cursor,durationInFrames,sourceStartFrame:range.startFrame,volume,enabled:true,layer:0}});
    cursor+=durationInFrames;
  });
  commands.push({type:"set-duration",durationInFrames:Math.max(1,cursor)});

  return{id:`script-${status}-${segmentId}`,label:`${status==="removed"?"Remove":"Restore"} Script segment`,commands};
};

export const applyScriptSegmentStatus=(project:Project,segmentId:string,status:ScriptSegmentStatus,options?:{now?:string})=>
  applyProjectCommandTransaction(project,buildScriptStatusTransaction(project,segmentId,status),options);
