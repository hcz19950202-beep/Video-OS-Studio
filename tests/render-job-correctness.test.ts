import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {describe,expect,it,vi} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {RemotionRenderAdapter} from "@/adapters/contracts";
import {createJobExecutors,type JobExecutorDependencies} from "@/lib/jobs/executors";
import type {JobExecutionContext} from "@/lib/jobs/runtime";
import {JobRecordSchema} from "@/lib/jobs/schema";
import {ProjectRepository} from "@/lib/project/repository";
import {RenderReferencedMediaUnavailableError} from "@/lib/render/errors";
import {ProjectSchema} from "@/schemas/project";

const projectId="render-correctness-project";
const jobId="11111111-1111-4111-8111-111111111111";
const assetId="video-source";
const relativePath="assets/video-source.mp4";
const now="2026-08-30T00:00:00.000Z";

const project=()=>ProjectSchema.parse({
  version:"2.0.0",
  project:{id:projectId,name:"Render correctness",revision:1,createdAt:now,updatedAt:now},
  canvas:{width:640,height:360,fps:30,durationInFrames:60},
  assets:[{id:assetId,kind:"video",relativePath,durationInFrames:60,sourceFps:30}],
  tracks:[{
    id:"video-main",
    type:"video",
    name:"Video",
    clips:[{id:"video-clip",type:"video",assetId,sourceStartFrame:0,startFrame:0,durationInFrames:60,enabled:true,layer:0}],
  }],
});

const job=()=>JobRecordSchema.parse({
  id:jobId,
  type:"render-final",
  projectId,
  status:"running",
  stage:"running",
  progress:.05,
  attempt:1,
  input:{assetBaseUrl:"http://127.0.0.1:3000"},
  createdAt:now,
  updatedAt:now,
  startedAt:now,
});

const context=(record:ReturnType<typeof job>):JobExecutionContext=>({
  signal:new AbortController().signal,
  update:async()=>record,
  log:async()=>undefined,
  onToolLog:()=>undefined,
  addArtifact:async()=>undefined,
});

const setup=async(render:RemotionRenderAdapter["render"])=>{
  const fs=new InMemoryFileSystemAdapter();
  const repository=new ProjectRepository(fs,"/data");
  await repository.save(project());
  const deps={
    fs,
    repository,
    remotion:{render},
    ffmpeg:{} as JobExecutorDependencies["ffmpeg"],
    hyperFrames:{} as JobExecutorDependencies["hyperFrames"],
    videoUse:{} as JobExecutorDependencies["videoUse"],
  } satisfies JobExecutorDependencies;
  return{fs,repository,executor:createJobExecutors(deps)["render-final"]};
};

describe("V2.4.2 render correctness",()=>{
  it("fails closed before Remotion when an enabled referenced media file is unavailable",async()=>{
    const render=vi.fn<RemotionRenderAdapter["render"]>(async input=>({outputPath:input.outputPath}));
    const test=await setup(render);

    await expect(test.executor(job(),context(job()))).rejects.toEqual(expect.objectContaining({
      name:"RenderReferencedMediaUnavailableError",
      code:"RENDER_REFERENCED_MEDIA_UNAVAILABLE",
      assetIds:[assetId],
    } satisfies Partial<RenderReferencedMediaUnavailableError>));
    expect(render).not.toHaveBeenCalled();
  });

  it("returns structured backend fallback evidence in durable render output",async()=>{
    const render=vi.fn<RemotionRenderAdapter["render"]>(async input=>({
      outputPath:input.outputPath,
      backend:"html5-video",
      fallbackUsed:true,
      fallbackReason:"offthread-frame-extraction",
    }));
    const test=await setup(render);
    await test.fs.writeBinary(test.repository.resolveProjectFile(projectId,relativePath),new Uint8Array([1,2,3]));

    const output=await test.executor(job(),context(job()));

    expect(output).toMatchObject({
      mode:"final",
      backend:"html5-video",
      fallbackUsed:true,
      fallbackReason:"offthread-frame-extraction",
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("maps missing referenced media to a stable non-path durable Job error",async()=>{
    const source=await readFile(join(process.cwd(),"lib","jobs","runtime.ts"),"utf8");
    expect(source).toContain("error instanceof RenderReferencedMediaUnavailableError");
    expect(source).toContain('code:error.code,message:error.message,retryable:false,details:{assetIds:error.assetIds}');
    expect(new RenderReferencedMediaUnavailableError([assetId]).message).not.toContain(relativePath);
  });
});
