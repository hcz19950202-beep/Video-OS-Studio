import {CreateJobSchema,type JobType} from "@/lib/jobs/schema";
import {HyperFramesJobInputSchema,MediaNormalizeJobInputSchema,RenderJobInputSchema,VideoUseTranscribeJobInputSchema} from "@/lib/jobs/executors";
import {jobRuntime} from "@/lib/server/runtime";
import {resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

export const runtime="nodejs";

const parseInput=(type:JobType,input:Record<string,unknown>,origin:string)=>{
  if(type==="render-final"||type==="render-overlay")return RenderJobInputSchema.parse({...input,assetBaseUrl:origin});
  if(type==="hyperframes-render")return HyperFramesJobInputSchema.parse(input);
  if(type==="media-normalize")return MediaNormalizeJobInputSchema.parse(input);
  return VideoUseTranscribeJobInputSchema.parse(input);
};

export async function GET(request:Request){
  const url=new URL(request.url);
  const projectId=url.searchParams.get("projectId");
  const rawLimit=Number(url.searchParams.get("limit")??50);
  const limit=Number.isFinite(rawLimit)?Math.max(1,Math.min(200,Math.round(rawLimit))):50;
  let jobs=await jobRuntime.list();
  if(projectId)jobs=jobs.filter(job=>job.projectId===projectId);
  return Response.json({jobs:jobs.slice(-limit).reverse()});
}

export async function POST(request:Request){
  try{
    const body=CreateJobSchema.parse(await request.json());
    if(!body.projectId)throw new Error(`Job type ${body.type} requires projectId.`);
    const input=parseInput(body.type,body.input,resolveTrustedAssetBaseUrl());
    const job=await jobRuntime.create({...body,input});
    return Response.json({job},{status:202});
  }catch(error){
    return Response.json({code:"JOB_REQUEST_INVALID",error:error instanceof Error?error.message:String(error),retryable:false},{status:400});
  }
}
