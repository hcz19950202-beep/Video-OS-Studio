import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DurableJobRuntime,JobIdempotencyConflictError,type JobExecutor} from "@/lib/jobs/runtime";
import {FileJobStore} from "@/lib/jobs/store";

const JOB_ID="11111111-1111-4111-8111-111111111111";
const PROJECT_ID="project-1";
const roots:string[]=[];
const noopExecutor:JobExecutor=async()=>({ok:true});

const setup=async()=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-job-idempotency-"));
  roots.push(root);
  const store=new FileJobStore(root);
  const runtime=new DurableJobRuntime(store,{"render-final":noopExecutor},{render:0});
  await runtime.waitUntilReady();
  return{store,runtime};
};

afterEach(async()=>{
  await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));
});

describe("DurableJobRuntime create idempotency",()=>{
  it("returns the existing durable job for the same explicit id and immutable create input",async()=>{
    const{runtime}=await setup();
    const input={jobId:JOB_ID,type:"render-final" as const,projectId:PROJECT_ID,input:{expectedProjectRevision:7,exportProfileId:"social-vertical"}};

    const created=await runtime.create(input);
    const replayed=await runtime.create(input);
    const jobs=await runtime.list();

    expect(replayed).toEqual(created);
    expect(replayed.id).toBe(JOB_ID);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(JOB_ID);
  });

  it("serializes concurrent creates for the same explicit id without duplicating the job",async()=>{
    const{runtime}=await setup();
    const input={jobId:JOB_ID,type:"render-final" as const,projectId:PROJECT_ID,input:{expectedProjectRevision:7}};

    const[first,second]=await Promise.all([runtime.create(input),runtime.create(input)]);

    expect(first).toEqual(second);
    expect(await runtime.list()).toHaveLength(1);
  });

  it("fails closed when an explicit id is reused with different immutable create input",async()=>{
    const{runtime}=await setup();
    await runtime.create({jobId:JOB_ID,type:"render-final",projectId:PROJECT_ID,input:{expectedProjectRevision:7}});

    await expect(runtime.create({jobId:JOB_ID,type:"render-final",projectId:PROJECT_ID,input:{expectedProjectRevision:8}})).rejects.toBeInstanceOf(JobIdempotencyConflictError);
    await expect(runtime.create({jobId:JOB_ID,type:"render-final",projectId:PROJECT_ID,input:{expectedProjectRevision:8}})).rejects.toMatchObject({code:"JOB_IDEMPOTENCY_CONFLICT",jobId:JOB_ID});
    expect(await runtime.list()).toHaveLength(1);
  });

  it("keeps random ids for ordinary callers that do not supply an idempotency id",async()=>{
    const{runtime}=await setup();

    const job=await runtime.create({type:"render-final",projectId:PROJECT_ID,input:{expectedProjectRevision:7}});

    expect(job.id).not.toBe(JOB_ID);
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await runtime.list()).toHaveLength(1);
  });
});
