import {z} from "zod";
import type {ProjectRepository} from "@/lib/project/repository";
import type {Project} from "@/schemas/project";
import type {Clip} from "@/schemas/clip";

export const AgentSelectionSnapshotSchema=z.object({
  selectedClipIds:z.array(z.string().min(1)).max(64).default([]),
  selectedSceneId:z.string().min(1).nullable().default(null),
  selectedScriptRange:z.object({startWordId:z.string().min(1),endWordId:z.string().min(1)}).nullable().default(null),
}).strict();
export type AgentSelectionSnapshot=z.infer<typeof AgentSelectionSnapshotSchema>;

const SafeAssetSchema=z.object({
  id:z.string().min(1),
  kind:z.enum(["video","audio","image","overlay","subtitle"]),
  durationInFrames:z.number().int().positive().optional(),
  width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),
  hasAudio:z.boolean().optional(),
}).strict();

const SafeClipSchema=z.object({
  id:z.string().min(1),
  trackId:z.string().min(1),
  type:z.enum(["video","caption","motion","broll","audio"]),
  startFrame:z.number().int().nonnegative(),
  durationInFrames:z.number().int().positive(),
  enabled:z.boolean(),
  layer:z.number().int(),
  assetId:z.string().min(1).optional(),
  text:z.string().max(4_000).optional(),
  engine:z.enum(["remotion","hyperframes"]).optional(),
  effectId:z.string().min(1).optional(),
}).strict();

const SafeSceneSchema=z.object({
  id:z.string().min(1),
  name:z.string().min(1),
  semanticType:z.string().min(1),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  summary:z.string().max(4_000).optional(),
  styleId:z.string().min(1).optional(),
}).strict();

const SafeScriptWordSchema=z.object({
  id:z.string().min(1),
  text:z.string().max(1_000),
  startFrame:z.number().int().nonnegative(),
  endFrame:z.number().int().positive(),
  segmentId:z.string().min(1),
  sceneId:z.string().min(1).optional(),
}).strict();

const SafeScriptSegmentSchema=z.object({
  id:z.string().min(1),
  sceneId:z.string().min(1).optional(),
  speaker:z.string().min(1).optional(),
  status:z.enum(["active","removed"]),
  semanticTags:z.array(z.string().min(1)).max(32),
  text:z.string().max(8_000),
  wordCount:z.number().int().nonnegative(),
}).strict();

const SafeLinkedStyleSchema=z.object({
  id:z.string().min(1),
  name:z.string().min(1),
  target:z.enum(["motion","caption","text","cta"]),
}).strict();

export const AgentContextSnapshotSchema=z.object({
  projectId:z.string().min(1),
  baseProjectRevision:z.number().int().nonnegative(),
  projectName:z.string().min(1),
  canvas:z.object({width:z.number().int().positive(),height:z.number().int().positive(),fps:z.number().int().positive(),durationInFrames:z.number().int().positive()}).strict(),
  brand:z.object({mode:z.enum(["dark","light","custom"]),colors:z.record(z.string(),z.string()),typography:z.object({headingFont:z.string(),bodyFont:z.string(),captionFont:z.string()}).strict(),motion:z.object({speed:z.number(),scale:z.number(),intensity:z.enum(["minimal","balanced","strong"])}).strict()}).strict(),
  workflow:z.object({scenario:z.string().optional(),visualIntensity:z.string().optional(),starterPrompt:z.string().optional()}).strict(),
  selection:AgentSelectionSnapshotSchema,
  selectedScene:SafeSceneSchema.nullable(),
  selectedClips:z.array(SafeClipSchema).max(64),
  selectedScriptWords:z.array(SafeScriptWordSchema).max(400),
  scenes:z.array(SafeSceneSchema).max(64),
  clips:z.array(SafeClipSchema).max(128),
  scriptSegments:z.array(SafeScriptSegmentSchema).max(64),
  assets:z.array(SafeAssetSchema).max(64),
  linkedStyles:z.array(SafeLinkedStyleSchema).max(64),
  truncated:z.object({scenes:z.boolean(),clips:z.boolean(),scriptSegments:z.boolean(),assets:z.boolean(),selectedScriptWords:z.boolean()}).strict(),
}).strict();
export type AgentContextSnapshot=z.infer<typeof AgentContextSnapshotSchema>;

export const DEFAULT_AGENT_CONTEXT_LIMITS={scenes:64,clips:128,scriptSegments:64,assets:64,selectedScriptWords:400} as const;
export type AgentContextLimits={scenes:number;clips:number;scriptSegments:number;assets:number;selectedScriptWords:number};

const bounded=(value:number,max:number)=>Math.max(1,Math.min(Math.floor(value),max));
const normalizeLimits=(input?:Partial<AgentContextLimits>):AgentContextLimits=>({
  scenes:bounded(input?.scenes??DEFAULT_AGENT_CONTEXT_LIMITS.scenes,64),
  clips:bounded(input?.clips??DEFAULT_AGENT_CONTEXT_LIMITS.clips,128),
  scriptSegments:bounded(input?.scriptSegments??DEFAULT_AGENT_CONTEXT_LIMITS.scriptSegments,64),
  assets:bounded(input?.assets??DEFAULT_AGENT_CONTEXT_LIMITS.assets,64),
  selectedScriptWords:bounded(input?.selectedScriptWords??DEFAULT_AGENT_CONTEXT_LIMITS.selectedScriptWords,400),
});

const safeScene=(scene:Project["scenes"][number])=>({id:scene.id,name:scene.name,semanticType:scene.semanticType,startFrame:scene.startFrame,endFrame:scene.endFrame,...(scene.summary?{summary:scene.summary}:{}) ,...(scene.styleId?{styleId:scene.styleId}:{})});

const safeClip=(trackId:string,clip:Clip)=>({
  id:clip.id,trackId,type:clip.type,startFrame:clip.startFrame,durationInFrames:clip.durationInFrames,enabled:clip.enabled,layer:clip.layer,
  ...("assetId" in clip&&clip.assetId?{assetId:clip.assetId}:{}),
  ...(clip.type==="caption"?{text:clip.text}:{}),
  ...(clip.type==="motion"?{engine:clip.engine,effectId:clip.effectId}:{}),
});

const allClips=(project:Project)=>project.tracks.flatMap(track=>track.clips.map(clip=>safeClip(track.id,clip))).sort((a,b)=>a.startFrame-b.startFrame||a.id.localeCompare(b.id));
const allScriptWords=(project:Project)=>project.script.segments.flatMap(segment=>segment.words.map(word=>({id:word.id,text:word.text,startFrame:word.startFrame,endFrame:word.endFrame,segmentId:segment.id,...(segment.sceneId?{sceneId:segment.sceneId}:{})})));

const selectedWords=(project:Project,range:AgentSelectionSnapshot["selectedScriptRange"],limit:number)=>{
  if(!range)return{words:[],truncated:false};
  const words=allScriptWords(project);
  const start=words.findIndex(word=>word.id===range.startWordId);
  const end=words.findIndex(word=>word.id===range.endWordId);
  if(start<0||end<0)return{words:[],truncated:false};
  const from=Math.min(start,end);const to=Math.max(start,end)+1;
  const selected=words.slice(from,to);
  return{words:selected.slice(0,limit),truncated:selected.length>limit};
};

export function buildAgentContextSnapshot(project:Project,selectionInput?:Partial<AgentSelectionSnapshot>,limitsInput?:Partial<AgentContextLimits>):AgentContextSnapshot{
  const selection=AgentSelectionSnapshotSchema.parse(selectionInput??{});
  const limits=normalizeLimits(limitsInput);
  const scenes=[...project.scenes].sort((a,b)=>a.startFrame-b.startFrame||a.id.localeCompare(b.id));
  const clips=allClips(project);
  const selectedClipSet=new Set(selection.selectedClipIds);
  const selectedClips=clips.filter(clip=>selectedClipSet.has(clip.id)).slice(0,64);
  const selectedScene=selection.selectedSceneId?project.scenes.find(scene=>scene.id===selection.selectedSceneId)??null:null;
  const scriptSelection=selectedWords(project,selection.selectedScriptRange,limits.selectedScriptWords);
  const scriptSegments=project.script.segments.slice(0,limits.scriptSegments).map(segment=>({
    id:segment.id,...(segment.sceneId?{sceneId:segment.sceneId}:{}),...(segment.speaker?{speaker:segment.speaker}:{}),status:segment.status,semanticTags:segment.semanticTags.slice(0,32),text:segment.words.map(word=>word.text).join(" ").slice(0,8_000),wordCount:segment.words.length,
  }));
  const assets=project.assets.slice(0,limits.assets).map(asset=>({id:asset.id,kind:asset.kind,...(asset.durationInFrames?{durationInFrames:asset.durationInFrames}:{}),...(asset.width?{width:asset.width}:{}),...(asset.height?{height:asset.height}:{}),...(asset.hasAudio!==undefined?{hasAudio:asset.hasAudio}:{})}));
  const linkedStyles=project.linkedStyles.slice(0,64).map(style=>({id:style.id,name:style.name,target:style.target}));
  return AgentContextSnapshotSchema.parse({
    projectId:project.project.id,
    baseProjectRevision:project.project.revision,
    projectName:project.project.name,
    canvas:project.canvas,
    brand:{mode:project.brand.mode,colors:project.brand.colors,typography:project.brand.typography,motion:project.brand.motion},
    workflow:{scenario:project.workflow.scenario,visualIntensity:project.workflow.visualIntensity,starterPrompt:project.workflow.starterPrompt},
    selection,
    selectedScene:selectedScene?safeScene(selectedScene):null,
    selectedClips,
    selectedScriptWords:scriptSelection.words,
    scenes:scenes.slice(0,limits.scenes).map(safeScene),
    clips:clips.slice(0,limits.clips),
    scriptSegments,
    assets,
    linkedStyles,
    truncated:{scenes:scenes.length>limits.scenes,clips:clips.length>limits.clips,scriptSegments:project.script.segments.length>limits.scriptSegments,assets:project.assets.length>limits.assets,selectedScriptWords:scriptSelection.truncated},
  });
}

export type AgentProjectLoader=Pick<ProjectRepository,"load">;
export class AgentContextService{
  constructor(private readonly projects:AgentProjectLoader){}
  async build(projectId:string,selection?:Partial<AgentSelectionSnapshot>,limits?:Partial<AgentContextLimits>):Promise<AgentContextSnapshot>{
    return buildAgentContextSnapshot(await this.projects.load(projectId),selection,limits);
  }
}
