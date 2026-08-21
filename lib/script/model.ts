import type {TranscriptWord as AdapterTranscriptWord} from "@/adapters/contracts";
import {secondsToFrames} from "@/lib/timeline/frames";
import type {Project} from "@/schemas/project";
import type {ScriptDocument,ScriptSegment,ScriptSourceRange,TranscriptWord} from "@/schemas/script";

type VideoClip=Extract<Project["tracks"][number]["clips"][number],{type:"video"}>;

const sentenceEnd=/[.!?。！？；;:]$/u;

export const mergeSourceRanges=(ranges:ScriptSourceRange[]):ScriptSourceRange[]=>{
  const sorted=[...ranges].sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame);
  const merged:ScriptSourceRange[]=[];
  for(const range of sorted){
    const previous=merged.at(-1);
    if(previous&&range.startFrame<=previous.endFrame)previous.endFrame=Math.max(previous.endFrame,range.endFrame);
    else merged.push({...range});
  }
  return merged;
};

export const getProjectVideoSourceRanges=(project:Project):ScriptSourceRange[]=>{
  const clips=(project.tracks.find(track=>track.type==="video")?.clips??[]).filter((clip):clip is VideoClip=>clip.type==="video");
  const ranges=clips.map(clip=>({startFrame:clip.sourceStartFrame,endFrame:clip.sourceStartFrame+clip.durationInFrames}));
  if(ranges.length)return mergeSourceRanges(ranges);
  const asset=project.assets.find(item=>item.kind==="video");
  const duration=asset?.durationInFrames??project.canvas.durationInFrames;
  return [{startFrame:0,endFrame:Math.max(1,duration)}];
};

const overlapsRange=(startFrame:number,endFrame:number,ranges:ScriptSourceRange[])=>ranges.some(range=>endFrame>range.startFrame&&startFrame<range.endFrame);

export const buildScriptDocument=(words:AdapterTranscriptWord[],fps:number,baseSourceRanges:ScriptSourceRange[]):ScriptDocument=>{
  const base=mergeSourceRanges(baseSourceRanges);
  const normalized=words
    .filter(word=>word.type!=="audio_event"&&word.text.trim().length>0)
    .map((word,index):TranscriptWord&{speaker?:string}=>{
      const startFrame=Math.max(0,secondsToFrames(word.startSeconds,fps));
      const endFrame=Math.max(startFrame+1,secondsToFrames(word.endSeconds,fps));
      return{id:`word-${index+1}`,text:word.text,startFrame,endFrame,speaker:word.speakerId};
    })
    .filter(word=>overlapsRange(word.startFrame,word.endFrame,base));

  const segments:ScriptSegment[]=[];
  let bucket:(TranscriptWord&{speaker?:string})[]=[];
  const flush=()=>{
    if(!bucket.length)return;
    const speaker=bucket.every(word=>word.speaker===bucket[0]?.speaker)?bucket[0]?.speaker:undefined;
    const segment:ScriptSegment={id:`segment-${String(segments.length+1).padStart(3,"0")}`,words:bucket.map(({speaker:_speaker,...word})=>word),status:"active",semanticTags:[]};
    if(speaker)segment.speaker=speaker;
    segments.push(segment);
    bucket=[];
  };

  normalized.forEach((word,index)=>{
    const previous=normalized[index-1];
    const gap=previous?word.startFrame-previous.endFrame:0;
    if(bucket.length&&(gap>Math.round(fps*.9)||bucket.length>=18||sentenceEnd.test(previous?.text.trim()??"")))flush();
    bucket.push(word);
    if(sentenceEnd.test(word.text.trim()))flush();
  });
  flush();

  return{baseSourceRanges:base,segments};
};

export const segmentText=(segment:ScriptSegment)=>segment.words.map(word=>word.text).join("").replace(/\s+([,.;!?，。；！？])/gu,"$1").trim();

export const getSegmentSourceRange=(segment:ScriptSegment):ScriptSourceRange|null=>{
  if(!segment.words.length)return null;
  return{startFrame:Math.min(...segment.words.map(word=>word.startFrame)),endFrame:Math.max(...segment.words.map(word=>word.endFrame))};
};

export const subtractSourceRanges=(baseRanges:ScriptSourceRange[],cutRanges:ScriptSourceRange[]):ScriptSourceRange[]=>{
  let remaining=mergeSourceRanges(baseRanges);
  for(const cut of mergeSourceRanges(cutRanges)){
    const next:ScriptSourceRange[]=[];
    for(const base of remaining){
      if(cut.endFrame<=base.startFrame||cut.startFrame>=base.endFrame){next.push(base);continue;}
      if(cut.startFrame>base.startFrame)next.push({startFrame:base.startFrame,endFrame:Math.min(cut.startFrame,base.endFrame)});
      if(cut.endFrame<base.endFrame)next.push({startFrame:Math.max(cut.endFrame,base.startFrame),endFrame:base.endFrame});
    }
    remaining=next.filter(range=>range.endFrame>range.startFrame);
  }
  return mergeSourceRanges(remaining);
};

export const getScriptKeepSourceRanges=(script:ScriptDocument):ScriptSourceRange[]=>{
  const base=script.baseSourceRanges.length?script.baseSourceRanges:script.segments.map(getSegmentSourceRange).filter((range):range is ScriptSourceRange=>Boolean(range));
  const removed=script.segments.filter(segment=>segment.status==="removed").map(getSegmentSourceRange).filter((range):range is ScriptSourceRange=>Boolean(range));
  return subtractSourceRanges(base,removed);
};

export const mapSourceFrameToTimelineFrame=(project:Project,sourceFrame:number):number|null=>{
  const clips=(project.tracks.find(track=>track.type==="video")?.clips??[]).filter((clip):clip is VideoClip=>clip.type==="video").sort((a,b)=>a.startFrame-b.startFrame);
  for(const clip of clips){
    const sourceEnd=clip.sourceStartFrame+clip.durationInFrames;
    if(sourceFrame>=clip.sourceStartFrame&&sourceFrame<sourceEnd)return clip.startFrame+(sourceFrame-clip.sourceStartFrame);
  }
  return null;
};

export const mapTimelineFrameToSourceFrame=(project:Project,timelineFrame:number):number|null=>{
  const clips=(project.tracks.find(track=>track.type==="video")?.clips??[]).filter((clip):clip is VideoClip=>clip.type==="video").sort((a,b)=>a.startFrame-b.startFrame);
  for(const clip of clips){
    const end=clip.startFrame+clip.durationInFrames;
    if(timelineFrame>=clip.startFrame&&timelineFrame<end)return clip.sourceStartFrame+(timelineFrame-clip.startFrame);
  }
  return null;
};

export const getSegmentTimelineRange=(project:Project,segment:ScriptSegment):ScriptSourceRange|null=>{
  if(segment.status==="removed")return null;
  const range=getSegmentSourceRange(segment);
  if(!range)return null;
  const start=mapSourceFrameToTimelineFrame(project,range.startFrame);
  const last=mapSourceFrameToTimelineFrame(project,Math.max(range.startFrame,range.endFrame-1));
  if(start===null||last===null)return null;
  return{startFrame:start,endFrame:Math.min(project.canvas.durationInFrames,last+1)};
};
