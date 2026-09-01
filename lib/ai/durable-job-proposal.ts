import {z} from "zod";
import {CreateJobSchema,type CreateJobInput,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {ExportProfileSchema} from "@/lib/render/profile";
import {ProjectRelativePathSchema} from "@/schemas/asset";
import {MotionTransformSchema} from "@/schemas/clip";

export const AgentDurableJobProposalPayloadSchema=z.discriminatedUnion("jobType",[
  z.object({
    jobType:z.literal("render-final"),
    profile:ExportProfileSchema.partial().optional(),
  }).strict(),
  z.object({jobType:z.literal("render-overlay")}).strict(),
  z.object({
    jobType:z.literal("hyperframes-render"),
    effectId:z.string().min(1).max(240),
    props:z.record(z.string(),z.unknown()).default({}),
    startFrame:z.number().int().nonnegative(),
    durationInFrames:z.number().int().positive(),
    transform:MotionTransformSchema.optional(),
  }).strict(),
  z.object({
    jobType:z.literal("media-normalize"),
    kind:z.enum(["video","audio"]),
    sourceRelativePath:ProjectRelativePathSchema,
    outputRelativePath:ProjectRelativePathSchema,
  }).strict(),
  z.object({jobType:z.literal("video-use-transcribe")}).strict(),
]);
export type AgentDurableJobProposalPayload=z.infer<typeof AgentDurableJobProposalPayloadSchema>;

export type AgentDurableJobPort={
  create:(input:CreateJobInput)=>Promise<JobRecord>;
  get:(jobId:string)=>Promise<JobRecord|null>;
};

const stableUuidFromHex=(hex:string)=>{
  const raw=hex.slice(0,32).padEnd(32,"0").split("");
  const variants=["8","9","a","b"] as const;
  raw[12]="5";
  raw[16]=variants[Number.parseInt(raw[16]??"0",16)%4]??"8";
  const value=raw.join("");
  return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20,32)}`;
};

export const stableDurableJobId=(applyOperationId:string,sha256Hex:(value:string)=>string)=>
  stableUuidFromHex(sha256Hex(`video-os:c5:job:${applyOperationId}`));

export const buildAgentDurableJobCreateInput=(input:{
  payload:AgentDurableJobProposalPayload;
  jobId:string;
  projectId:string;
  expectedRevision:number;
  applyOperationId:string;
  trustedAssetBaseUrl?:string;
}):CreateJobInput=>{
  const payload=AgentDurableJobProposalPayloadSchema.parse(input.payload);
  if(payload.jobType==="render-final"||payload.jobType==="render-overlay"){
    if(!input.trustedAssetBaseUrl)throw new Error("Trusted asset origin is required for render jobs.");
    const assetBaseUrl=z.string().url().parse(input.trustedAssetBaseUrl);
    return CreateJobSchema.parse({
      jobId:input.jobId,
      type:payload.jobType,
      projectId:input.projectId,
      input:{assetBaseUrl,...(payload.jobType==="render-final"&&payload.profile?{profile:payload.profile}:{})},
    });
  }
  if(payload.jobType==="hyperframes-render")return CreateJobSchema.parse({
    jobId:input.jobId,
    type:payload.jobType,
    projectId:input.projectId,
    input:{
      expectedRevision:input.expectedRevision,
      operationId:input.applyOperationId,
      effectId:payload.effectId,
      props:payload.props,
      startFrame:payload.startFrame,
      durationInFrames:payload.durationInFrames,
      ...(payload.transform?{transform:payload.transform}:{}),
    },
  });
  if(payload.jobType==="video-use-transcribe")return CreateJobSchema.parse({
    jobId:input.jobId,
    type:payload.jobType,
    projectId:input.projectId,
    input:{expectedRevision:input.expectedRevision,operationId:input.applyOperationId},
  });
  return CreateJobSchema.parse({
    jobId:input.jobId,
    type:payload.jobType,
    projectId:input.projectId,
    input:{kind:payload.kind,sourceRelativePath:payload.sourceRelativePath,outputRelativePath:payload.outputRelativePath},
  });
};

export const durableJobSummary=(job:Pick<JobRecord,"id"|"type"|"status"|"stage">)=>({
  jobId:job.id,
  jobType:job.type as JobType,
  jobStatus:job.status,
  jobStage:job.stage,
});
