import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import type {FfmpegAdapter,RemotionRenderAdapter} from "@/adapters/contracts";
import {createJobExecutors} from "@/lib/jobs/executors";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {ProjectRepository} from "@/lib/project/repository";
import {RenderJobManager} from "@/lib/render/render-jobs";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean)=>{for(let i=0;i<200;i++){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error("Timed out waiting for render job.");};

describe("V2.3.1 H5 render Job export dimensions",()=>{
  it("persists and renders the resolved even H.264 profile for an odd Project Canvas",async()=>{
    const fs=new InMemoryFileSystemAdapter();
    const repository=new ProjectRepository(fs,"/data");
    await repository.create({id:"odd-job",name:"Odd Job",width:641,height:361,fps:30,durationInFrames:30});

    const render=vi.fn<RemotionRenderAdapter["render"]>(async()=>({outputPath:"/data/out.mp4"}));
    const ffmpeg={} as FfmpegAdapter;
    const executors=createJobExecutors({fs,repository,remotion:{render},ffmpeg,hyperFrames:{} as never,videoUse:{} as never});
    const root=await mkdtemp(join(tmpdir(),"video-os-h5-render-dimensions-"));
    roots.push(root);
    const runtime=new DurableJobRuntime(new FileJobStore(root),executors);
    const manager=new RenderJobManager(runtime);

    const queued=await manager.create("odd-job","final","http://127.0.0.1:3000",{sizing:"project"});
    const completed=await waitFor(()=>manager.get(queued.id),job=>job?.status==="completed");

    expect(completed?.profile).toMatchObject({width:640,height:360,dimensionAdjusted:true});
    expect(completed?.outputRelativePath).toContain("final-640x360-30fps-");
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]![0].project.canvas).toMatchObject({width:640,height:360});
    expect((await repository.load("odd-job")).canvas).toMatchObject({width:641,height:361});
  });
});
