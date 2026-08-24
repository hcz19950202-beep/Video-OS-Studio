import {createHash} from "node:crypto";
import type {FileSystemAdapter} from "@/adapters/contracts";
import type {CreateJobInput,JobArtifact,JobRecord} from "@/lib/jobs/schema";
import type {ProjectMutationResponse,ProjectTransactionMutation} from "@/lib/project/mutation-contract";
import type {ProjectRepository} from "@/lib/project/repository";
import {buildAutoScenesTransaction} from "@/lib/scenes/model";
import {getSegmentTimelineRange,segmentText} from "@/lib/script/model";
import {VisualPlanSchema,type VisualPlan,type VisualSuggestion} from "@/lib/visual-planner/schema";
import type {VisualPlanApplyResult} from "@/lib/visual-planner/service";
import type {WorkflowJobRuntimePort} from "@/lib/workflows/runner";
import type {WorkflowStageExecutionContext,WorkflowStageRegistry,WorkflowStageCompletion,WorkflowStageExecutor} from "@/lib/workflows/registry";
import type {WorkflowArtifactReference} from "@/lib/workflows/schema";
import type {ProjectCommandTransaction} from "@/lib/project/history";
import type {Project} from "@/schemas/project";

export const W2_EXECUTOR_KEYS={
  mediaImport:"w2.media-import",
  mediaProbe:"w2.media-probe",
  mediaNormalize:"w2.media-normalize",
  transcribe:"w2.transcribe",
  scriptAnalysis:"w2.script-analysis",
  sceneDetection:"w2.scene-detection",
  captionGeneration:"w2.caption-generation",
  visualPlanning:"w2.visual-planning",
  motionGeneration:"w2.motion-generation",
  brollAssembly:"w2.broll-assembly",
  audioAssembly:"w2.audio-assembly",
  timelineAssembly:"w2.timeline-assembly",
  preview:"w2.preview",
  finalRender:"w2.final-render",
} as const;

export type ProductionWorkflowJobRuntime=WorkflowJobRuntimePort&{
  create:(input:CreateJobInput)=>Promise<JobRecord>;
  getArtifacts:(jobId:string)=>Promise<JobArtifact[]>;
};

export type ProductionWorkflowRepository=Pick<ProjectRepository,"load"|"resolveProjectFile">;
export type ProductionWorkflowFileSystem=Pick<FileSystemAdapter,"readText"|"writeTextAtomic">;
export type ProductionWorkflowMutations={applyTransaction:(projectId:string,input:ProjectTransactionMutation)=>Promise<ProjectMutationResponse>};
export type ProductionWorkflowVisualPlan={
  generate:(projectId:string)=>Promise<VisualPlan>;
  apply:(projectId:string,plan:VisualPlan,selectedIds:string[],meta:{expectedRevision:number;operationId:string})=>Promise<VisualPlanApplyResult>;
};

export type ProductionWorkflowDependencies={
  fs:ProductionWorkflowFileSystem;
  repository:ProductionWorkflowRepository;
  mutations:ProductionWorkflowMutations;
  jobs:ProductionWorkflowJobRuntime;
  visualPlan:ProductionWorkflowVisualPlan;
  assetBaseUrl:string;
};

const stableValue=(value:unknown):unknown=>Array.isArray(value)?value.map(stableValue):value&&typeof value==="object"?Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)])):value;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
const operationId=(context:WorkflowStageExecutionContext,suffix:string)=>`wf-${createHash("sha256").update(`${context.operationId}:${suffix}`).digest("hex").slice(0,32)}-${suffix}`.slice(0,160);
const latestProject=(deps:ProductionWorkflowDependencies,context:WorkflowStageExecutionContext)=>deps.repository.load(context.run.projectId);
const selectedSourceAssets=(project:Project,context:WorkflowStageExecutionContext)=>{
  const requested=new Set(context.run.sourceAssetIds);
  return project.assets.filter(asset=>requested.has(asset.id));
};
const primarySourceVideo=(project:Project,context:WorkflowStageExecutionContext)=>{
  const selected=selectedSourceAssets(project,context).find(asset=>asset.kind==="video");
  const activeVideoClip=project.tracks.find(track=>track.id==="video-main")?.clips.find(clip=>clip.type==="video");
  const active=activeVideoClip&&project.assets.find(asset=>asset.id===activeVideoClip.assetId&&asset.kind==="video");
  const asset=selected??active??project.assets.find(item=>item.kind==="video");
  if(!asset)throw new Error("Workflow requires an imported source video before Generate First Draft.");
  return asset;
};
const artifactKind=(kind:JobArtifact["kind"]):WorkflowArtifactReference["kind"]=>kind==="transcript"?"transcript":kind==="render"?"final-render":kind==="overlay"?"motion":"other";
const jobArtifacts=async(deps:ProductionWorkflowDependencies,stageId:string,jobId:string)=>{
  const artifacts=await deps.jobs.getArtifacts(jobId);
  return artifacts.map((artifact,index):WorkflowArtifactReference=>({
    id:`wf-${stageId}-${jobId}-${artifact.id}-${index}`,
    stageId,
    kind:artifactKind(artifact.kind),
    createdAt:new Date().toISOString(),
    jobId,
    relativePath:artifact.relativePath,
    digest:artifact.relativePath?digest({jobId,relativePath:artifact.relativePath,sizeBytes:artifact.sizeBytes}):undefined,
  }));
};
const reusableJob=async(deps:ProductionWorkflowDependencies,context:WorkflowStageExecutionContext,input:CreateJobInput)=>{
  const prior=context.previousJobIds.at(-1);
  if(prior){
    const job=await deps.jobs.get(prior);
    if(job&&["failed","cancelled","interrupted"].includes(job.status)&&job.error?.retryable!==false)return deps.jobs.retry(prior);
  }
  return deps.jobs.create(input);
};
const transactionPayload=(transaction:ProjectCommandTransaction):ProjectTransactionMutation["transaction"]=>({label:transaction.label,commands:transaction.commands});
const applyTransaction=async(deps:ProductionWorkflowDependencies,context:WorkflowStageExecutionContext,transaction:ProjectCommandTransaction,suffix:string)=>{
  const project=await latestProject(deps,context);
  return deps.mutations.applyTransaction(project.project.id,{expectedRevision:project.project.revision,transactionId:operationId(context,suffix),transaction:transactionPayload(transaction)});
};

const captionPreset=(project:Project):"primary"|"minimal"|"bold"=>project.workflow.captionHint.toLowerCase().includes("bold")?"bold":project.workflow.captionHint.toLowerCase().includes("minimal")?"minimal":"primary";
const captionKeywords=(text:string)=>[...new Set(text.match(/\d+(?:\.\d+)?%?|[A-Za-z]{4,}|[\p{Script=Han}]{2,4}/gu)??[])].slice(0,6);
const buildCaptionTransaction=(project:Project,transactionId:string):ProjectCommandTransaction=>{
  const commands:ProjectCommandTransaction["commands"]=[];
  for(const clip of project.tracks.find(track=>track.id==="captions-main")?.clips??[])commands.push({type:"remove-clip",clipId:clip.id});
  let count=0;
  for(const segment of project.script.segments){
    if(segment.status!=="active"||segment.words.length===0)continue;
    const range=getSegmentTimelineRange(project,segment);if(!range)continue;
    const text=segmentText(segment).trim();if(!text)continue;
    commands.push({type:"add-clip",trackId:"captions-main",clip:{id:`wf-caption-${createHash("sha256").update(segment.id).digest("hex").slice(0,16)}`,type:"caption",text,preset:captionPreset(project),emphasis:"both",keywords:captionKeywords(text),startFrame:range.startFrame,durationInFrames:Math.max(1,range.endFrame-range.startFrame),enabled:true,layer:0}});count++;
  }
  if(count===0)throw new Error("Caption generation requires active transcript words.");
  return{id:transactionId,label:"Workflow · Generate captions from transcript",commands};
};

const readVisualPlan=async(deps:ProductionWorkflowDependencies,projectId:string)=>VisualPlanSchema.parse(JSON.parse(await deps.fs.readText(deps.repository.resolveProjectFile(projectId,"edit/ai-director-plan.json"))));
const suggestionsFor=(plan:VisualPlan,engine:VisualSuggestion["recommendation"]["engine"])=>plan.suggestions.filter(item=>item.recommendation.engine===engine);

const mediaImportExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const assets=selectedSourceAssets(project,context);
  if(context.run.sourceAssetIds.length===0)throw new Error("Workflow sourceAssetIds are empty. Import media before starting the Workflow.");
  if(assets.length!==context.run.sourceAssetIds.length)throw new Error("One or more Workflow source assets are no longer present in the Project.");
  primarySourceVideo(project,context);
  return{kind:"completed",outputDigest:digest(assets.map(asset=>({id:asset.id,kind:asset.kind,relativePath:asset.relativePath,sizeBytes:asset.sizeBytes})))};
}});

const mediaProbeExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const asset=primarySourceVideo(project,context);
  if(!asset.durationInFrames||!asset.width||!asset.height)throw new Error("Imported source video is missing ffprobe metadata. Re-import the media through MediaImportService.");
  return{kind:"completed",outputDigest:digest({assetId:asset.id,durationInFrames:asset.durationInFrames,width:asset.width,height:asset.height,sourceFps:asset.sourceFps,hasAudio:asset.hasAudio})};
}});

const mediaNormalizeExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const asset=primarySourceVideo(project,context);
  if(asset.originalRelativePath&&asset.mimeType!=="video/mp4")throw new Error("Source video has an original file but no normalized MP4 working asset. Re-import it through MediaImportService.");
  return{kind:"completed",outputDigest:digest({assetId:asset.id,workingRelativePath:asset.relativePath,originalRelativePath:asset.originalRelativePath??null,mimeType:asset.mimeType,normalized:Boolean(asset.originalRelativePath)})};
}});

const transcribeExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({
  start:async context=>{
    const project=await latestProject(deps,context);
    const job=await reusableJob(deps,context,{type:"video-use-transcribe",projectId:project.project.id,input:{expectedRevision:project.project.revision,operationId:operationId(context,"transcribe")}});
    return{kind:"job",jobId:job.id};
  },
  reconcileJob:async(context,job)=>{
    const project=await latestProject(deps,context);const artifacts=await jobArtifacts(deps,context.stage.id,job.id);
    return{projectRevision:project.project.revision,artifacts,outputDigest:digest({jobId:job.id,attempt:job.attempt,output:job.output})};
  },
});

const scriptAnalysisExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const segments=project.script.segments.filter(segment=>segment.status==="active");const words=segments.flatMap(segment=>segment.words);
  if(words.length===0)throw new Error("Script analysis requires a transcript. Run TRANSCRIBE first.");
  const analysis={version:1,projectId:project.project.id,scenario:context.run.scenario,segmentCount:segments.length,wordCount:words.length,startFrame:Math.min(...words.map(word=>word.startFrame)),endFrame:Math.max(...words.map(word=>word.endFrame)),generatedAt:new Date().toISOString()};
  const relativePath="edit/workflow-script-analysis.json";await deps.fs.writeTextAtomic(deps.repository.resolveProjectFile(project.project.id,relativePath),JSON.stringify(analysis,null,2)+"\n");
  return{kind:"completed",outputDigest:digest(analysis),artifacts:[{id:`wf-script-analysis-${context.run.id}`,stageId:context.stage.id,kind:"script-analysis",createdAt:new Date().toISOString(),projectRevision:project.project.revision,relativePath,digest:digest(analysis)}]};
}});

const sceneDetectionExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const transaction=buildAutoScenesTransaction(project);const committed=await applyTransaction(deps,context,transaction,"scenes");
  return{kind:"completed",projectRevision:committed.appliedRevision,outputDigest:digest(committed.project.scenes.map(scene=>({id:scene.id,type:scene.semanticType,start:scene.startFrame,end:scene.endFrame})))};
}});

const captionGenerationExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const transaction=buildCaptionTransaction(project,operationId(context,"captions"));const committed=await applyTransaction(deps,context,transaction,"captions");const captions=committed.project.tracks.find(track=>track.id==="captions-main")?.clips??[];
  return{kind:"completed",projectRevision:committed.appliedRevision,outputDigest:digest(captions.map(clip=>({id:clip.id,start:clip.startFrame,duration:clip.durationInFrames})))};
}});

const visualPlanningExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const plan=await deps.visualPlan.generate(context.run.projectId);const relativePath="edit/ai-director-plan.json";
  return{kind:"completed",outputDigest:digest(plan),artifacts:[{id:`wf-visual-plan-${context.run.id}`,stageId:context.stage.id,kind:"visual-plan",createdAt:new Date().toISOString(),projectRevision:context.run.lastKnownProjectRevision,relativePath,digest:digest(plan)}]};
}});

const applyVisualIds=async(deps:ProductionWorkflowDependencies,context:WorkflowStageExecutionContext,plan:VisualPlan,ids:string[],suffix:string)=>{
  if(ids.length===0)return null;const project=await latestProject(deps,context);return deps.visualPlan.apply(project.project.id,plan,ids,{expectedRevision:project.project.revision,operationId:operationId(context,suffix)});
};

const motionGenerationExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({
  start:async context=>{
    const plan=await readVisualPlan(deps,context.run.projectId);const hyperframes=suggestionsFor(plan,"hyperframes");
    if(hyperframes.length===0){const remotion=suggestionsFor(plan,"remotion").map(item=>item.id);const applied=await applyVisualIds(deps,context,plan,remotion,"remotion-motion");return{kind:"completed",projectRevision:applied?.project.project.revision,outputDigest:digest({remotionApplied:applied?.appliedIds??[],hyperframesApplied:[]})};}
    const suggestion=hyperframes[0]!;const recommendation=suggestion.recommendation;if(!recommendation.effectId)throw new Error(`HyperFrames suggestion ${suggestion.id} has no effectId.`);const project=await latestProject(deps,context);
    const job=await reusableJob(deps,context,{type:"hyperframes-render",projectId:project.project.id,input:{expectedRevision:project.project.revision,operationId:operationId(context,"hyperframes-motion"),effectId:recommendation.effectId,props:recommendation.props??{},startFrame:suggestion.startFrame,durationInFrames:suggestion.endFrame-suggestion.startFrame}});
    return{kind:"job",jobId:job.id};
  },
  reconcileJob:async(context,job)=>{
    const plan=await readVisualPlan(deps,context.run.projectId);const remotion=suggestionsFor(plan,"remotion").map(item=>item.id);const applied=await applyVisualIds(deps,context,plan,remotion,"remotion-motion");const project=applied?.project??await latestProject(deps,context);const artifacts=await jobArtifacts(deps,context.stage.id,job.id);const hyperframes=suggestionsFor(plan,"hyperframes");
    return{projectRevision:project.project.revision,artifacts,outputDigest:digest({jobId:job.id,hyperframesApplied:hyperframes.slice(0,1).map(item=>item.id),hyperframesDeferred:hyperframes.slice(1).map(item=>item.id),remotionApplied:applied?.appliedIds??[]})};
  },
});

const brollAssemblyExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const plan=await readVisualPlan(deps,context.run.projectId);const ids=suggestionsFor(plan,"broll").map(item=>item.id);const applied=await applyVisualIds(deps,context,plan,ids,"broll");const project=applied?.project??await latestProject(deps,context);
  return{kind:"completed",projectRevision:applied?.project.project.revision,outputDigest:digest({appliedIds:applied?.appliedIds??[],brollClips:project.tracks.find(track=>track.id==="broll-main")?.clips.map(clip=>clip.id)??[]})};
}});

const audioAssemblyExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const audio=project.tracks.find(track=>track.id==="audio-main")?.clips??[];
  return{kind:"completed",outputDigest:digest(audio.map(clip=>({id:clip.id,start:clip.startFrame,duration:clip.durationInFrames,enabled:clip.enabled})))};
}});

const timelineAssemblyExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const timeline=project.tracks.map(track=>({id:track.id,type:track.type,clips:track.clips.map(clip=>({id:clip.id,type:clip.type,start:clip.startFrame,duration:clip.durationInFrames,enabled:clip.enabled,layer:clip.layer}))}));
  return{kind:"completed",outputDigest:digest({durationInFrames:project.canvas.durationInFrames,timeline})};
}});

const previewExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({start:async context=>{
  const project=await latestProject(deps,context);const video=project.tracks.find(track=>track.id==="video-main")?.clips.filter(clip=>clip.type==="video"&&clip.enabled)??[];if(video.length===0)throw new Error("Preview requires at least one enabled video clip on video-main.");
  return{kind:"completed",outputDigest:digest({canvas:project.canvas,projectRevision:project.project.revision,videoClips:video.map(clip=>clip.id),captionCount:project.tracks.find(track=>track.id==="captions-main")?.clips.length??0,motionCount:project.tracks.find(track=>track.id==="motion-main")?.clips.length??0})};
}});

const finalRenderExecutor=(deps:ProductionWorkflowDependencies):WorkflowStageExecutor=>({
  start:async context=>{const project=await latestProject(deps,context);const job=await reusableJob(deps,context,{type:"render-final",projectId:project.project.id,input:{assetBaseUrl:deps.assetBaseUrl}});return{kind:"job",jobId:job.id};},
  reconcileJob:async(context,job)=>({artifacts:await jobArtifacts(deps,context.stage.id,job.id),outputDigest:digest({jobId:job.id,attempt:job.attempt,output:job.output})}),
});

export const registerProductionWorkflowStages=(registry:WorkflowStageRegistry,deps:ProductionWorkflowDependencies)=>{
  const registrations:[string,WorkflowStageExecutor][]=[
    [W2_EXECUTOR_KEYS.mediaImport,mediaImportExecutor(deps)],
    [W2_EXECUTOR_KEYS.mediaProbe,mediaProbeExecutor(deps)],
    [W2_EXECUTOR_KEYS.mediaNormalize,mediaNormalizeExecutor(deps)],
    [W2_EXECUTOR_KEYS.transcribe,transcribeExecutor(deps)],
    [W2_EXECUTOR_KEYS.scriptAnalysis,scriptAnalysisExecutor(deps)],
    [W2_EXECUTOR_KEYS.sceneDetection,sceneDetectionExecutor(deps)],
    [W2_EXECUTOR_KEYS.captionGeneration,captionGenerationExecutor(deps)],
    [W2_EXECUTOR_KEYS.visualPlanning,visualPlanningExecutor(deps)],
    [W2_EXECUTOR_KEYS.motionGeneration,motionGenerationExecutor(deps)],
    [W2_EXECUTOR_KEYS.brollAssembly,brollAssemblyExecutor(deps)],
    [W2_EXECUTOR_KEYS.audioAssembly,audioAssemblyExecutor(deps)],
    [W2_EXECUTOR_KEYS.timelineAssembly,timelineAssemblyExecutor(deps)],
    [W2_EXECUTOR_KEYS.preview,previewExecutor(deps)],
    [W2_EXECUTOR_KEYS.finalRender,finalRenderExecutor(deps)],
  ];
  for(const[key,executor]of registrations)if(!registry.has(key))registry.register(key,executor);
  return registry;
};
