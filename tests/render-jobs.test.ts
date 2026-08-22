import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {RenderJobManager} from "@/lib/render/render-jobs";

const roots:string[]=[];
const makeJobs=async(executors:ConstructorParameters<typeof DurableJobRuntime>[1])=>{const root=await mkdtemp(join(tmpdir(),"video-os-render-jobs-"));roots.push(root);const runtime=new DurableJobRuntime(new FileJobStore(root),executors);return new RenderJobManager(runtime);};
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean)=>{for(let i=0;i<200;i++){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error("Timed out waiting for render job.");};
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H3 durable render jobs",()=>{
  it("moves a successful render from queued to completed",async()=>{
    const jobs=await makeJobs({"render-final":async(_job,ctx)=>{await ctx.update("rendering",.5,{outputRelativePath:"render/final.mp4"});return{outputRelativePath:"render/final.mp4"};}});
    const job=await jobs.create("demo","final","http://localhost:3000");
    const completed=await waitFor(()=>jobs.get(job.id),current=>current?.status==="completed");
    expect(completed).toMatchObject({status:"completed",progress:1,mode:"final",outputRelativePath:"render/final.mp4",attempt:1});
  });

  it("surfaces durable executor failures",async()=>{
    const jobs=await makeJobs({"render-overlay":async()=>{throw new Error("renderer unavailable");}});
    const job=await jobs.create("demo","overlay","http://localhost:3000");
    const failed=await waitFor(()=>jobs.get(job.id),current=>current?.status==="failed");
    expect(failed).toMatchObject({status:"failed",mode:"overlay",error:"renderer unavailable"});
  });
});
