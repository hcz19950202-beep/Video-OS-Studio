import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DurableJobRuntime,type JobExecutor} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {JobRecordSchema,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {ToolAbortedError} from "@/lib/process/tool-runner";

const roots:string[]=[];
const makeStore=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-h3-"));roots.push(root);return{root,store:new FileJobStore(root)}};
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3000)=>{const start=Date.now();while(Date.now()-start<timeoutMs){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error("Timed out waiting for H3 job state.");};
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H3 durable job runtime",()=>{
  it("persists job state, logs and artifacts on disk",async()=>{
    const{root,store}=await makeStore();
    const executor:JobExecutor=async(_job,ctx)=>{await ctx.update("rendering",.5);await ctx.log("stdout","hello\n");await ctx.addArtifact({id:"output",kind:"render",label:"output",relativePath:"render/out.mp4",mimeType:"video/mp4"});return{outputRelativePath:"render/out.mp4"};};
    const runtime=new DurableJobRuntime(store,{"render-final":executor});
    const created=await runtime.create({type:"render-final",projectId:"demo",input:{}});
    const completed=await waitFor(()=>runtime.get(created.id),job=>job?.status==="completed");
    expect(completed).toMatchObject({status:"completed",stage:"completed",progress:1,attempt:1,output:{outputRelativePath:"render/out.mp4"}});
    expect(await store.readLog(created.id,"stdout")).toContain("hello");
    expect(await store.getArtifacts(created.id)).toEqual([expect.objectContaining({id:"output",relativePath:"render/out.mp4"})]);
    expect(JSON.parse(await readFile(join(root,"jobs",created.id,"job.json"),"utf8"))).toMatchObject({id:created.id,status:"completed"});
    expect(JSON.parse(await readFile(join(root,"jobs",created.id,"artifacts.json"),"utf8"))).toHaveLength(1);
  });

  it("enforces one active render while allowing two normalizations",async()=>{
    const{store}=await makeStore();
    let activeRender=0,maxRender=0,activeNormalize=0,maxNormalize=0;
    let releaseRender!:()=>void;const renderGate=new Promise<void>(resolve=>{releaseRender=resolve;});
    const normalizeReleases:Array<()=>void>=[];
    const render:JobExecutor=async()=>{activeRender++;maxRender=Math.max(maxRender,activeRender);await renderGate;activeRender--;return{};};
    const normalize:JobExecutor=async()=>{activeNormalize++;maxNormalize=Math.max(maxNormalize,activeNormalize);await new Promise<void>(resolve=>normalizeReleases.push(resolve));activeNormalize--;return{};};
    const runtime=new DurableJobRuntime(store,{"render-final":render,"render-overlay":render,"media-normalize":normalize});
    const r1=await runtime.create({type:"render-final",projectId:"demo",input:{}});const r2=await runtime.create({type:"render-overlay",projectId:"demo",input:{}});
    const n1=await runtime.create({type:"media-normalize",projectId:"demo",input:{}});const n2=await runtime.create({type:"media-normalize",projectId:"demo",input:{}});
    await waitFor(async()=>({r1:await runtime.get(r1.id),r2:await runtime.get(r2.id),n1:await runtime.get(n1.id),n2:await runtime.get(n2.id)}),state=>state.r1?.status==="running"&&state.r2?.status==="queued"&&state.n1?.status==="running"&&state.n2?.status==="running");
    expect(maxRender).toBe(1);expect(maxNormalize).toBe(2);
    releaseRender();normalizeReleases.splice(0).forEach(release=>release());
    await waitFor(()=>runtime.get(r2.id),job=>job?.status==="running"||job?.status==="completed");
  });

  it("cancels an active job through AbortSignal and leaves a durable cancelled state",async()=>{
    const{store}=await makeStore();
    const executor:JobExecutor=async(job,ctx)=>new Promise((_resolve,reject)=>ctx.signal.addEventListener("abort",()=>reject(new ToolAbortedError(job.type,"fixture",[],null,"","")),{once:true}));
    const runtime=new DurableJobRuntime(store,{"render-final":executor});
    const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});
    await waitFor(()=>runtime.get(job.id),current=>current?.status==="running");
    await runtime.cancel(job.id);
    const cancelled=await waitFor(()=>runtime.get(job.id),current=>current?.status==="cancelled");
    expect(cancelled?.error?.code).toBe("TOOL_ABORTED");
    expect(cancelled?.finishedAt).toBeTruthy();
  });

  it("does not start an executor when cancellation wins during preparing",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h3-race-"));roots.push(root);
    let preparingSeen!:()=>void;const preparingReached=new Promise<void>(resolve=>{preparingSeen=resolve;});
    let releasePreparing!:()=>void;const preparingGate=new Promise<void>(resolve=>{releasePreparing=resolve;});
    class PreparingGateStore extends FileJobStore{
      private gated=false;
      override async save(record:JobRecord){
        if(record.status==="preparing"&&!this.gated){this.gated=true;preparingSeen();await preparingGate;}
        return super.save(record);
      }
    }
    const store=new PreparingGateStore(root);let calls=0;
    const runtime=new DurableJobRuntime(store,{"render-final":async()=>{calls++;return{};}});
    const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});
    await preparingReached;
    const cancelling=runtime.cancel(job.id);
    releasePreparing();
    await cancelling;
    const cancelled=await waitFor(()=>runtime.get(job.id),current=>current?.status==="cancelled");
    expect(cancelled?.cancellationRequestedAt).toBeTruthy();
    expect(calls).toBe(0);
  });

  it("retries failed jobs with the same durable id and incremented attempt",async()=>{
    const{store}=await makeStore();let calls=0;
    const executor:JobExecutor=async()=>{calls++;if(calls===1)throw new Error("first failure");return{ok:true};};
    const runtime=new DurableJobRuntime(store,{"render-final":executor});
    const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});
    await waitFor(()=>runtime.get(job.id),current=>current?.status==="failed");
    const retried=await runtime.retry(job.id);
    expect(retried).toMatchObject({id:job.id,status:"queued",attempt:2});
    const completed=await waitFor(()=>runtime.get(job.id),current=>current?.status==="completed");
    expect(completed).toMatchObject({attempt:2,output:{ok:true}});
    expect(await store.readLog(job.id,"stdout")).toContain("retry attempt 2");
  });

  it("marks previously active jobs interrupted and requeues queued jobs after restart",async()=>{
    const{store}=await makeStore();await store.ensure();
    const at=new Date().toISOString();
    const record=(id:string,type:JobType,status:JobRecord["status"]):JobRecord=>JobRecordSchema.parse({id,type,projectId:"demo",status,stage:status,progress:status==="queued"?0:.5,attempt:1,input:{},createdAt:at,updatedAt:at,startedAt:status==="running"?at:undefined});
    const running=record("11111111-1111-4111-8111-111111111111","render-final","running");
    const queued=record("22222222-2222-4222-8222-222222222222","render-final","queued");
    await store.create(running);await store.create(queued);
    const runtime=new DurableJobRuntime(store,{"render-final":async()=>({recovered:true})});
    await runtime.waitUntilReady();
    const interrupted=await runtime.get(running.id);expect(interrupted).toMatchObject({status:"interrupted",error:{code:"JOB_INTERRUPTED",retryable:true}});
    const recovered=await waitFor(()=>runtime.get(queued.id),job=>job?.status==="completed");expect(recovered?.output).toMatchObject({recovered:true});
  });
});
