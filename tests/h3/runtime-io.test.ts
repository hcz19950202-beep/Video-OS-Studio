import {randomUUID} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {readFileSync} from "node:fs";
import {afterEach,describe,expect,it} from "vitest";
import {FileJobStore} from "@/lib/jobs/store";
import type {JobRecord} from "@/lib/jobs/schema";

const roots:string[]=[];
const createStore=async()=>{
  const root=await mkdtemp(join(tmpdir(),"video-os-h3-"));
  roots.push(root);
  const store=new FileJobStore(root);
  await store.ensure();
  return store;
};

const createJob=async(store:FileJobStore)=>{
  const at=new Date().toISOString();
  const job:JobRecord={
    id:randomUUID(),
    type:"render-final",
    status:"queued",
    stage:"queued",
    progress:0,
    attempt:1,
    input:{},
    createdAt:at,
    updatedAt:at,
  };
  await store.create(job);
  return job;
};

afterEach(async()=>{
  await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));
});

describe("H3 runtime I/O",()=>{
  it("reads only the requested tail while preserving total log bytes",async()=>{
    const store=await createStore();
    const job=await createJob(store);
    await store.appendLog(job.id,"stdout","0123456789abcdefghijklmnopqrstuvwxyz");

    await expect(store.readLog(job.id,"stdout")).resolves.toBe("0123456789abcdefghijklmnopqrstuvwxyz");
    await expect(store.readLogTail(job.id,"stdout",8)).resolves.toEqual({
      text:"stuvwxyz",
      totalBytes:36,
    });
    await expect(store.readLogTail(job.id,"stderr",8)).resolves.toEqual({text:"",totalBytes:0});
  });

  it("keeps the production workflow polling interval out of the 25ms hot loop",()=>{
    const runtime=readFileSync("lib/server/runtime.ts","utf8");
    expect(runtime).toContain("const workflowJobPollIntervalMs=250");
    expect(runtime).toContain("{jobPollIntervalMs:workflowJobPollIntervalMs}");
  });

  it("serves job log tails from the range reader instead of slicing a full log",()=>{
    const route=readFileSync("app/api/jobs/[jobId]/logs/route.ts","utf8");
    expect(route).toContain("jobRuntime.store.readLogTail");
    expect(route).not.toContain("Buffer.from(text");
  });
});
