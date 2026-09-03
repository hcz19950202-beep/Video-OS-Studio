import {access,mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DurableJobRuntime,JobStateError,type JobExecutor} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";
import {JobRecordSchema,isTerminalJobStatus,type JobRecord,type JobType} from "@/lib/jobs/schema";
import {ProjectRevisionConflictError} from "@/lib/project/mutation-coordinator";
import {ToolAbortedError} from "@/lib/process/tool-runner";

const roots:string[]=[];
const makeStore=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-h3-"));roots.push(root);return{root,store:new FileJobStore(root)}};
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3000)=>{const start=Date.now();while(Date.now()-start<timeoutMs){const value=await read();if(predicate(value))return value;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error("Timed out waiting for H3 job state.");};
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H3 durable job runtime",()=>{
  it("keeps construction side-effect free until the runtime is first used",async()=>{
    const{root,store}=await makeStore();
    const runtime=new DurableJobRuntime(store);
    await new Promise(resolve=>setTimeout(resolve,100));
    await expect(access(join(root,".runtime-owner.json"))).rejects.toMatchObject({code:"ENOENT"});
    await expect(access(join(root,".runtime-owner.lock"))).rejects.toMatchObject({code:"ENOENT"});
    await runtime.waitUntilReady();
    expect(JSON.parse(await readFile(join(root,".runtime-owner.json"),"utf8"))).toMatchObject({runtimeId:expect.any(String),ownerPid:expect.any(Number)});
    await expect(access(join(root,".runtime-owner.lock"))).rejects.toMatchObject({code:"ENOENT"});
  });

  it("persists job state, flushed tool logs and artifacts on disk",async()=>{
    const{root,store}=await makeStore();
    const executor:JobExecutor=async(_job,ctx)=>{await ctx.update("rendering",.5);ctx.onToolLog({tool:"fixture",stream:"stdout",chunk:"tool-log\n"});await ctx.log("stdout","hello\n");await ctx.addArtifact({id:"output",kind:"render",label:"output",relativePath:"render/out.mp4",mimeType:"video/mp4"});return{outputRelativePath:"render/out.mp4"};};
    const runtime=new DurableJobRuntime(store,{"render-final":executor});
    const created=await runtime.create({type:"render-final",projectId:"demo",input:{}});
    const completed=await waitFor(()=>runtime.get(created.id),job=>job?.status==="completed");
    expect(completed).toMatchObject({status:"completed",stage:"completed",progress:1,attempt:1,output:{outputRelativePath:"render/out.mp4"}});
    const log=await store.readLog(created.id,"stdout");expect(log).toContain("tool-log");expect(log).toContain("hello");
    expect(await store.getArtifacts(created.id)).toEqual([expect.objectContaining({id:"output",relativePath:"render/out.mp4"})]);
    expect(JSON.parse(await readFile(join(root,"jobs",created.id,"job.json"),"utf8"))).toMatchObject({id:created.id,status:"completed"});
    expect(JSON.parse(await readFile(join(root,"jobs",created.id,"artifacts.json"),"utf8"))).toHaveLength(1);
  });

  it("persists the stable runtime owner pid for jobs created by a live worker",async()=>{
    const{store}=await makeStore();const owner=await store.runtimeOwner.claimRuntimeOwner(process.ppid);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    const runtime=new DurableJobRuntime(store,{"render-final":async()=>{await gate;return{};}});const created=await runtime.create({type:"render-final",projectId:"demo",input:{}});const running=await waitFor(()=>runtime.get(created.id),job=>job?.status==="running");
    expect(running?.executorPid).toBe(owner.ownerPid);release();await waitFor(()=>runtime.get(created.id),job=>job?.status==="completed");
  });

  it("distinguishes same-process route runtimes from a restarted process",async()=>{
    const{store}=await makeStore();
    expect((await store.runtimeOwner.claimRuntimeOwner(2_147_483_646)).isNewRuntime).toBe(true);
    expect((await store.runtimeOwner.claimRuntimeOwner(2_147_483_646)).isNewRuntime).toBe(false);
    expect((await store.runtimeOwner.claimRuntimeOwner(2_147_483_647)).isNewRuntime).toBe(true);
  });

  it("recovers old active Jobs when Workflow claims the new runtime first",async()=>{
    const{store}=await makeStore();await store.ensure();
    const runtime=await store.runtimeOwner.claimRuntimeOwner();
    const oldAt=new Date(runtime.runtimeStartedAt-1_000).toISOString();
    const active=JobRecordSchema.parse({id:"33333333-3333-4333-8333-333333333333",type:"video-use-transcribe",projectId:"demo",status:"running",stage:"transcribing",progress:.5,attempt:1,input:{expectedRevision:0,operationId:"old"},createdAt:oldAt,updatedAt:oldAt,startedAt:oldAt});
    await store.create(active);
    const jobRuntime=new DurableJobRuntime(store,{"video-use-transcribe":async()=>({recovered:true})});await jobRuntime.waitUntilReady();
    const recovered=await store.get(active.id);
    expect(recovered).toMatchObject({status:"interrupted",stage:"interrupted",error:{code:"JOB_INTERRUPTED",retryable:true}});
  });

  it("recovers a same-runtime Job whose executor process has exited",async()=>{
    const{store}=await makeStore();await store.ensure();await store.runtimeOwner.claimRuntimeOwner(process.pid);
    const at=new Date().toISOString();
    const active=JobRecordSchema.parse({id:"44444444-4444-4444-8444-444444444444",type:"video-use-transcribe",projectId:"demo",status:"running",stage:"transcribing",progress:.5,attempt:1,input:{expectedRevision:0,operationId:"same-runtime"},executorPid:2_147_483_646,createdAt:at,updatedAt:at,startedAt:at});
    await store.create(active);
    const jobRuntime=new DurableJobRuntime(store,{"video-use-transcribe":async()=>({recovered:true})});await jobRuntime.waitUntilReady();
    expect(await store.get(active.id)).toMatchObject({status:"interrupted",error:{code:"JOB_INTERRUPTED",retryable:true}});
  });

  it("atomically serializes concurrent runtime-owner claims",async()=>{
    const{root}=await makeStore();const ownerPid=process.pid;const claims=await Promise.all(Array.from({length:16},()=>new FileJobStore(root).runtimeOwner.claimRuntimeOwner(ownerPid)));expect(new Set(claims.map(claim=>claim.runtimeId)).size).toBe(1);expect(claims.filter(claim=>claim.isNewRuntime)).toHaveLength(1);const persisted=JSON.parse(await readFile(join(root,".runtime-owner.json"),"utf8")) as {ownerPid:number;runtimeId:string};expect(persisted).toMatchObject({ownerPid,runtimeId:claims[0].runtimeId});await expect(access(join(root,".runtime-owner.lock"))).rejects.toMatchObject({code:"ENOENT"});
  });

  it("keeps concurrent job reads from colliding with Windows atomic metadata writes",async()=>{
    const{store}=await makeStore();
    const executor:JobExecutor=async(_job,ctx)=>{await ctx.update("rendering",.25);ctx.onToolLog({tool:"fixture",stream:"stdout",chunk:"live\n"});await ctx.log("stdout","durable\n");await ctx.addArtifact({id:"output",kind:"render",label:"output",relativePath:"render/out.mp4"});await ctx.update("finalizing",.95);return{outputRelativePath:"render/out.mp4"};};
    for(let iteration=0;iteration<200;iteration++){
      const runtime=new DurableJobRuntime(store,{"render-final":executor});
      const job=await runtime.create({type:"render-final",projectId:"demo",input:{iteration}});
      const readers=Array.from({length:8},async()=>{let terminal=false;while(!terminal){const current=await runtime.get(job.id);terminal=current?.status==="completed"||current?.status==="failed";if(!terminal)await new Promise(resolve=>setTimeout(resolve,0));}});
      await waitFor(()=>runtime.get(job.id),current=>current?.status==="completed");
      await Promise.all(readers);
    }
  },120000);

  it("enforces one active render while allowing two normalizations",async()=>{
    const{store}=await makeStore();let activeRender=0,maxRender=0,activeNormalize=0,maxNormalize=0;
    let releaseRender!:()=>void;const renderGate=new Promise<void>(resolve=>{releaseRender=resolve;});const normalizeReleases:Array<()=>void>=[];
    const render:JobExecutor=async()=>{activeRender++;maxRender=Math.max(maxRender,activeRender);await renderGate;activeRender--;return{};};
    const normalize:JobExecutor=async()=>{activeNormalize++;maxNormalize=Math.max(maxNormalize,activeNormalize);await new Promise<void>(resolve=>normalizeReleases.push(resolve));activeNormalize--;return{};};
    const runtime=new DurableJobRuntime(store,{"render-final":render,"render-overlay":render,"media-normalize":normalize});
    const r1=await runtime.create({type:"render-final",projectId:"demo",input:{}});const r2=await runtime.create({type:"render-overlay",projectId:"demo",input:{}});const n1=await runtime.create({type:"media-normalize",projectId:"demo",input:{}});const n2=await runtime.create({type:"media-normalize",projectId:"demo",input:{}});
    await waitFor(async()=>({r1:await runtime.get(r1.id),r2:await runtime.get(r2.id),n1:await runtime.get(n1.id),n2:await runtime.get(n2.id)}),state=>state.r1?.status==="running"&&state.r2?.status==="queued"&&state.n1?.status==="running"&&state.n2?.status==="running"&&activeRender===1&&activeNormalize===2);
    expect(maxRender).toBe(1);expect(maxNormalize).toBe(2);releaseRender();normalizeReleases.splice(0).forEach(release=>release());
    await Promise.all([r1,r2,n1,n2].map(job=>waitFor(()=>runtime.get(job.id),current=>current!==null&&isTerminalJobStatus(current.status))));
  });

  it("cancels an active job through AbortSignal and leaves a durable cancelled state",async()=>{
    const{store}=await makeStore();const executor:JobExecutor=async(job,ctx)=>new Promise((_resolve,reject)=>ctx.signal.addEventListener("abort",()=>reject(new ToolAbortedError(job.type,"fixture",[],null,"","")),{once:true}));const runtime=new DurableJobRuntime(store,{"render-final":executor});const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});await waitFor(()=>runtime.get(job.id),current=>current?.status==="running");await runtime.cancel(job.id);const cancelled=await waitFor(()=>runtime.get(job.id),current=>current?.status==="cancelled");expect(cancelled?.error?.code).toBe("TOOL_ABORTED");expect(cancelled?.finishedAt).toBeTruthy();
  });

  it("does not start an executor when cancellation wins during preparing",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h3-race-"));roots.push(root);let preparingSeen!:()=>void;const preparingReached=new Promise<void>(resolve=>{preparingSeen=resolve;});let releasePreparing!:()=>void;const preparingGate=new Promise<void>(resolve=>{releasePreparing=resolve;});
    class PreparingGateStore extends FileJobStore{private gated=false;override async save(record:JobRecord){if(record.status==="preparing"&&!this.gated){this.gated=true;preparingSeen();await preparingGate;}return super.save(record);}}
    const store=new PreparingGateStore(root);let calls=0;const runtime=new DurableJobRuntime(store,{"render-final":async()=>{calls++;return{};}});const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});await preparingReached;const cancelling=runtime.cancel(job.id);releasePreparing();await cancelling;const cancelled=await waitFor(()=>runtime.get(job.id),current=>current?.status==="cancelled");expect(cancelled?.cancellationRequestedAt).toBeTruthy();expect(calls).toBe(0);
  });

  it("retries failed jobs with the same id, clears prior artifact metadata and increments attempt",async()=>{
    const{store}=await makeStore();let calls=0;
    const executor:JobExecutor=async(_job,ctx)=>{calls++;if(calls===1){await ctx.addArtifact({id:"partial",kind:"file",label:"partial",relativePath:"render/partial.mp4"});throw new Error("first failure");}return{ok:true};};
    const runtime=new DurableJobRuntime(store,{"render-final":executor});const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});await waitFor(()=>runtime.get(job.id),current=>current?.status==="failed");expect(await store.getArtifacts(job.id)).toHaveLength(1);const retried=await runtime.retry(job.id);expect(retried).toMatchObject({id:job.id,status:"queued",attempt:2});const completed=await waitFor(()=>runtime.get(job.id),current=>current?.status==="completed");expect(completed).toMatchObject({attempt:2,output:{ok:true}});expect(await store.getArtifacts(job.id)).toEqual([]);expect(await store.readLog(job.id,"stdout")).toContain("retry attempt 2");
  });

  it("rejects retry for non-retryable project conflicts",async()=>{
    const{store}=await makeStore();const runtime=new DurableJobRuntime(store,{"hyperframes-render":async()=>{throw new ProjectRevisionConflictError(4,5);}});const job=await runtime.create({type:"hyperframes-render",projectId:"demo",input:{}});const failed=await waitFor(()=>runtime.get(job.id),current=>current?.status==="failed");expect(failed?.error).toMatchObject({code:"PROJECT_REVISION_CONFLICT",retryable:false});await expect(runtime.retry(job.id)).rejects.toBeInstanceOf(JobStateError);
  });

  it("marks previously active jobs interrupted and requeues queued jobs after restart",async()=>{
    const{store}=await makeStore();await store.ensure();const at=new Date().toISOString();const record=(id:string,type:JobType,status:JobRecord["status"]):JobRecord=>JobRecordSchema.parse({id,type,projectId:"demo",status,stage:status,progress:status==="queued"?0:.5,attempt:1,input:{},createdAt:at,updatedAt:at,startedAt:status==="running"?at:undefined});const running=record("11111111-1111-4111-8111-111111111111","render-final","running");const queued=record("22222222-2222-4222-8222-222222222222","render-final","queued");await store.create(running);await store.create(queued);const runtime=new DurableJobRuntime(store,{"render-final":async()=>({recovered:true})});await runtime.waitUntilReady();const interrupted=await runtime.get(running.id);expect(interrupted).toMatchObject({status:"interrupted",error:{code:"JOB_INTERRUPTED",retryable:true}});const recovered=await waitFor(()=>runtime.get(queued.id),job=>job?.status==="completed");expect(recovered?.output).toMatchObject({recovered:true});
  });
});
