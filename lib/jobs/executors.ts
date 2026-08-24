import {dirname} from "node:path";
import {z} from "zod";
import type {FileSystemAdapter,FfmpegAdapter,RemotionRenderAdapter} from "@/adapters/contracts";
import type {HyperFramesRenderService} from "@/lib/hyperframes/render-service";
import type {JobExecutor} from "@/lib/jobs/runtime";
import type {JobRecord,JobType} from "@/lib/jobs/schema";
import {ExpectedProjectRevisionSchema,ProjectOperationIdSchema} from "@/lib/project/mutation-contract";
import type {ProjectRepository} from "@/lib/project/repository";
import {ExportProfileSchema,projectForExportProfile,type ExportProfile} from "@/lib/render/profile";
import type {VideoUseService} from "@/lib/video-use/service";
import {ProjectRelativePathSchema} from "@/schemas/asset";
import {MotionTransformSchema} from "@/schemas/clip";

const requireProjectId=(job:JobRecord)=>{if(!job.projectId)throw new Error(`Job type ${job.type} requires a projectId.`);return job.projectId;};

export const RenderJobInputSchema=z.object({assetBaseUrl:z.string().url(),profile:ExportProfileSchema.partial().optional()});
export const HyperFramesJobInputSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema,effectId:z.string().min(1),props:z.record(z.string(),z.unknown()).default({}),startFrame:z.number().int().nonnegative(),durationInFrames:z.number().int().positive(),transform:MotionTransformSchema.optional()});
export const MediaNormalizeJobInputSchema=z.object({kind:z.enum(["video","audio"]),sourceRelativePath:ProjectRelativePathSchema,outputRelativePath:ProjectRelativePathSchema});
export const VideoUseTranscribeJobInputSchema=z.object({expectedRevision:ExpectedProjectRevisionSchema,operationId:ProjectOperationIdSchema});

export type JobExecutorDependencies={
  fs:FileSystemAdapter;
  repository:ProjectRepository;
  remotion:RemotionRenderAdapter;
  ffmpeg:FfmpegAdapter;
  hyperFrames:HyperFramesRenderService;
  videoUse:VideoUseService;
};

const renderExecutor=(deps:JobExecutorDependencies):JobExecutor=>async(job,context)=>{
  const projectId=requireProjectId(job);
  const input=RenderJobInputSchema.parse(job.input);
  const mode=job.type==="render-overlay"?"overlay":"final";
  await context.update("load-project",.1);
  const sourceProject=await deps.repository.load(projectId);
  const sourceProjectRevision=sourceProject.project.revision;
  const prepared=mode==="final"?projectForExportProfile(sourceProject,input.profile as Partial<ExportProfile>|undefined):{project:sourceProject,profile:undefined};
  const profile=prepared.profile;
  const ext=mode==="overlay"?"webm":"mp4";
  const suffix=profile?`-${profile.width}x${profile.height}-${profile.fps}fps`:"";
  const relativePath=`render/${mode}${suffix}-${job.id}.${ext}`;
  const outputPath=deps.repository.resolveProjectFile(projectId,relativePath);
  await deps.fs.ensureDir(dirname(outputPath));
  await context.update("rendering",.2,{outputRelativePath:relativePath,mode,sourceProjectRevision,...(profile?{profile}:{})});
  await deps.remotion.render({project:prepared.project,outputPath,mode,assetBaseUrl:input.assetBaseUrl,quality:profile?.quality,includeAudio:profile?.audio!=="none"},{signal:context.signal,onLog:context.onToolLog});
  await context.addArtifact({id:"render-output",kind:"render",label:`${mode} render`,relativePath,mimeType:mode==="overlay"?"video/webm":"video/mp4"});
  await context.update("finalizing",.95);
  return{outputRelativePath:relativePath,mode,sourceProjectRevision,...(profile?{profile}:{})};
};

const hyperFramesExecutor=(deps:JobExecutorDependencies):JobExecutor=>async(job,context)=>{
  const projectId=requireProjectId(job);
  const input=HyperFramesJobInputSchema.parse(job.input);
  await context.update("hyperframes-render",.15);
  const project=await deps.hyperFrames.renderAndAdd({projectId,effectId:input.effectId,props:input.props,startFrame:input.startFrame,durationInFrames:input.durationInFrames,transform:input.transform},{expectedRevision:input.expectedRevision,operationId:input.operationId},{signal:context.signal,onLog:context.onToolLog});
  await context.update("project-commit",.9);
  const matches=(project.tracks.find(track=>track.id==="motion-main")?.clips??[]).filter(clip=>clip.type==="motion"&&clip.engine==="hyperframes"&&clip.effectId===input.effectId&&clip.startFrame===input.startFrame&&clip.durationInFrames===input.durationInFrames);
  const clip=matches[matches.length-1];
  const asset=clip?.type==="motion"&&clip.assetId?project.assets.find(item=>item.id===clip.assetId):undefined;
  if(asset?.relativePath)await context.addArtifact({id:"hyperframes-output",kind:"overlay",label:asset.label||input.effectId,relativePath:asset.relativePath,mimeType:asset.mimeType||"video/webm"});
  return{projectRevision:project.project.revision,assetId:asset?.id,outputRelativePath:asset?.relativePath};
};

const normalizeExecutor=(deps:JobExecutorDependencies):JobExecutor=>async(job,context)=>{
  const projectId=requireProjectId(job);
  const input=MediaNormalizeJobInputSchema.parse(job.input);
  const sourcePath=deps.repository.resolveProjectFile(projectId,input.sourceRelativePath);
  const outputPath=deps.repository.resolveProjectFile(projectId,input.outputRelativePath);
  await deps.fs.ensureDir(dirname(outputPath));
  await context.update("normalizing",.15,{outputRelativePath:input.outputRelativePath});
  if(input.kind==="video")await deps.ffmpeg.normalizeVideo({inputPath:sourcePath,outputPath},{signal:context.signal,onLog:context.onToolLog});
  else await deps.ffmpeg.normalizeAudio({inputPath:sourcePath,outputPath},{signal:context.signal,onLog:context.onToolLog});
  await context.addArtifact({id:"normalized-output",kind:"project-file",label:`normalized ${input.kind}`,relativePath:input.outputRelativePath,mimeType:input.kind==="video"?"video/mp4":"audio/mp4"});
  await context.update("probing",.85);
  const probe=await deps.ffmpeg.probe(outputPath,{signal:context.signal,onLog:context.onToolLog});
  return{outputRelativePath:input.outputRelativePath,durationSeconds:probe.durationSeconds,width:probe.width,height:probe.height,fps:probe.fps,hasAudio:probe.hasAudio};
};

const videoUseExecutor=(deps:JobExecutorDependencies):JobExecutor=>async(job,context)=>{
  const projectId=requireProjectId(job);
  const input=VideoUseTranscribeJobInputSchema.parse(job.input);
  await context.update("transcribing",.15);
  const result=await deps.videoUse.prepare(projectId,{expectedRevision:input.expectedRevision,operationId:input.operationId},{signal:context.signal,onLog:context.onToolLog});
  await context.update("project-commit",.9);
  await context.addArtifact({id:"transcript",kind:"transcript",label:"video-use transcript",relativePath:result.transcriptRelativePath,mimeType:"application/json"});
  await context.addArtifact({id:"packed-transcript",kind:"transcript",label:"video-use packed transcript",relativePath:result.packedTranscriptRelativePath,mimeType:"text/markdown"});
  return{projectRevision:result.project.project.revision,wordCount:result.wordCount,scriptSegmentCount:result.scriptSegmentCount,transcriptRelativePath:result.transcriptRelativePath,packedTranscriptRelativePath:result.packedTranscriptRelativePath,alreadyApplied:result.alreadyApplied};
};

export const createJobExecutors=(deps:JobExecutorDependencies):Record<JobType,JobExecutor>=>({
  "render-final":renderExecutor(deps),
  "render-overlay":renderExecutor(deps),
  "hyperframes-render":hyperFramesExecutor(deps),
  "media-normalize":normalizeExecutor(deps),
  "video-use-transcribe":videoUseExecutor(deps),
});
