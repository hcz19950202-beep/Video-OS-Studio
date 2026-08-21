import type {ProjectCommandTransaction} from "@/lib/project/history";
import {getSegmentTimelineRange,segmentText} from "@/lib/script/model";
import type {Project} from "@/schemas/project";
import type {Scene,SceneSemanticType} from "@/schemas/scene";
import type {ScriptDocument,ScriptSegment} from "@/schemas/script";

const classify=(text:string,index:number):SceneSemanticType=>{
  const lower=text.toLowerCase();
  if(index===0)return "hook";
  if(/(私信|联系|咨询|留言|发送|发给|发来|发我|联系我们|找我们|send|contact|dm\b|message)/iu.test(lower))return "cta";
  if(/(%|％|\d|数据|证明|案例|proof|result|case)/iu.test(lower))return "proof";
  if(/(首先|然后|接着|最后|步骤|流程|first|second|then|step|process)/iu.test(lower))return "process";
  if(/(问题|痛点|成本|延期|太贵|困难|problem|pain|cost|delay|expensive)/iu.test(lower))return "pain";
  if(/(解决|方案|我们可以|方法|solution|solve|approach)/iu.test(lower))return "solution";
  if(/(不是|而是|重新|换个|reframe|instead)/iu.test(lower))return "reframe";
  if(/(对比|相比|versus|vs\.?|compare)/iu.test(lower))return "comparison";
  return "custom";
};

const sceneName=(type:SceneSemanticType,index:number)=>`${type.toUpperCase()} ${String(index+1).padStart(2,"0")}`;

const sceneBounds=(project:Project,segments:ScriptSegment[])=>{
  const ranges=segments.map(segment=>getSegmentTimelineRange(project,segment)).filter((range):range is {startFrame:number;endFrame:number}=>Boolean(range));
  if(!ranges.length)return null;
  return{startFrame:Math.min(...ranges.map(range=>range.startFrame)),endFrame:Math.min(project.canvas.durationInFrames,Math.max(...ranges.map(range=>range.endFrame)))};
};

const replaceScenesTransaction=(project:Project,script:ScriptDocument,scenes:Scene[],label:string):ProjectCommandTransaction=>({
  id:`scene-transaction-${Date.now()}`,
  label,
  commands:[
    ...project.scenes.map(scene=>({type:"remove-scene" as const,sceneId:scene.id})),
    {type:"set-script-document" as const,script},
    ...scenes.map(scene=>({type:"add-scene" as const,scene})),
  ],
});

export const buildAutoScenesTransaction=(project:Project):ProjectCommandTransaction=>{
  const active=project.script.segments.filter(segment=>segment.status==="active"&&segment.words.length).map(segment=>({segment,range:getSegmentTimelineRange(project,segment)})).filter((entry):entry is {segment:ScriptSegment;range:{startFrame:number;endFrame:number}}=>Boolean(entry.range));
  if(!active.length)throw new Error("No active Script segments are available for Scene generation.");

  const buckets:Array<typeof active>=[];
  let current:typeof active=[];
  for(const entry of active){
    const candidateText=segmentText(entry.segment);
    const candidateType=classify(candidateText,buckets.length+current.length);
    const start=current[0]?.range.startFrame??entry.range.startFrame;
    const duration=entry.range.endFrame-start;
    const shouldBreak=current.length>0&&(duration>project.canvas.fps*10||current.length>=3||candidateType==="cta");
    if(shouldBreak){buckets.push(current);current=[];}
    current.push(entry);
  }
  if(current.length)buckets.push(current);

  const script=structuredClone(project.script);
  for(const segment of script.segments)delete segment.sceneId;
  const scenes:Scene[]=[];
  buckets.forEach((bucket,index)=>{
    const text=bucket.map(entry=>segmentText(entry.segment)).join(" ");
    const semanticType=classify(text,index);
    const id=`scene-${String(index+1).padStart(2,"0")}`;
    const startFrame=bucket[0]!.range.startFrame;
    const endFrame=Math.min(project.canvas.durationInFrames,bucket.at(-1)!.range.endFrame);
    const scene:Scene={id,name:sceneName(semanticType,index),semanticType,startFrame,endFrame,summary:text.slice(0,160),visualStrategy:{intensity:semanticType==="hook"||semanticType==="proof"||semanticType==="cta"?"high":"medium",preferredEngines:[]}};
    scenes.push(scene);
    const ids=new Set(bucket.map(entry=>entry.segment.id));
    for(const segment of script.segments)if(ids.has(segment.id))segment.sceneId=id;
  });
  return replaceScenesTransaction(project,script,scenes,"Generate Scenes from Script");
};

export const buildSplitSceneTransaction=(project:Project,sceneId:string,beforeSegmentId:string):ProjectCommandTransaction=>{
  const scene=project.scenes.find(item=>item.id===sceneId);
  if(!scene)throw new Error(`Scene ${sceneId} not found`);
  const assigned=project.script.segments.filter(segment=>segment.sceneId===sceneId&&segment.status==="active");
  const splitIndex=assigned.findIndex(segment=>segment.id===beforeSegmentId);
  if(splitIndex<=0)throw new Error("Split point must be after the first segment in the Scene.");
  const leftSegments=assigned.slice(0,splitIndex);
  const rightSegments=assigned.slice(splitIndex);
  const leftBounds=sceneBounds(project,leftSegments);
  const rightBounds=sceneBounds(project,rightSegments);
  if(!leftBounds||!rightBounds)throw new Error("Unable to calculate Scene split bounds.");
  const rightId=`${scene.id}-split-${beforeSegmentId}`;
  const left:Scene={...scene,...leftBounds,name:`${scene.name} A`};
  const right:Scene={...scene,id:rightId,...rightBounds,name:`${scene.name} B`};
  const script=structuredClone(project.script);
  const rightIds=new Set(rightSegments.map(segment=>segment.id));
  for(const segment of script.segments)if(rightIds.has(segment.id))segment.sceneId=rightId;
  return{id:`scene-split-${scene.id}`,label:"Split Scene",commands:[{type:"remove-scene",sceneId:scene.id},{type:"set-script-document",script},{type:"add-scene",scene:left},{type:"add-scene",scene:right}]};
};

export const buildMergeSceneWithNextTransaction=(project:Project,sceneId:string):ProjectCommandTransaction=>{
  const ordered=[...project.scenes].sort((a,b)=>a.startFrame-b.startFrame);
  const index=ordered.findIndex(scene=>scene.id===sceneId);
  const left=ordered[index];
  const right=ordered[index+1];
  if(!left||!right)throw new Error("Choose a Scene that has another Scene after it.");
  const merged:Scene={...left,name:left.name.replace(/\sA$/u,""),startFrame:Math.min(left.startFrame,right.startFrame),endFrame:Math.max(left.endFrame,right.endFrame),summary:[left.summary,right.summary].filter(Boolean).join(" ").slice(0,220)};
  const script=structuredClone(project.script);
  for(const segment of script.segments)if(segment.sceneId===right.id)segment.sceneId=left.id;
  return{id:`scene-merge-${left.id}-${right.id}`,label:"Merge Scenes",commands:[{type:"remove-scene",sceneId:left.id},{type:"remove-scene",sceneId:right.id},{type:"set-script-document",script},{type:"add-scene",scene:merged}]};
};
