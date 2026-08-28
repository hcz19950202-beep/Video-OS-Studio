import {randomUUID} from "node:crypto";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {probeExecutorLiveness} from "@/lib/jobs/process-probes";
import {JobRecordSchema,type JobRecord} from "@/lib/jobs/schema";
import {FileJobStore} from "@/lib/jobs/store";
import {RuntimeOwnerStore} from "@/lib/runtime/runtime-owner";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

class ProbeRuntimeOwnerStore extends RuntimeOwnerStore{
  readonly calls:number[]=[];
  constructor(root:string,private readonly alive:Set<number>){super(root);}
  override async isProcessAlive(pid:number){this.calls.push(pid);await Promise.resolve();return this.alive.has(pid);}
}

const activeJob=(id:string,startedAt:string,executorPid:number):JobRecord=>JobRecordSchema.parse({
  id,
  type:"video-use-transcribe",
  projectId:"demo",
  status:"running",
  stage:"transcribing",
  progress:.5,
  attempt:1,
  input:{expectedRevision:0,operationId:id},
  executorPid,
  createdAt:startedAt,
  updatedAt:startedAt,
  startedAt,
});

describe("H3b executor process probes",()=>{
  it("deduplicates pids and starts distinct probes concurrently",async()=>{
    let active=0;
    let maxActive=0;
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const probe=vi.fn(async(pid:number)=>{
      active+=1;
      maxActive=Math.max(maxActive,active);
      await gate;
      active-=1;
      return pid===101;
    });

    const pending=probeExecutorLiveness([101,101,202,undefined,202],probe);
    await Promise.resolve();
    expect(probe).toHaveBeenCalledTimes(2);
    expect(new Set(probe.mock.calls.map(([pid])=>pid))).toEqual(new Set([101,202]));
    expect(maxActive).toBe(2);
    release();

    const result=await pending;
    expect(result.get(101)).toBe(true);
    expect(result.get(202)).toBe(false);
  });

  it("probes a shared live executor once and preserves both same-runtime active jobs",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-h3b-"));
    roots.push(root);
    const executorPid=777_001;
    const owner=new ProbeRuntimeOwnerStore(root,new Set([executorPid]));
    const store=new FileJobStore(root,owner);
    const claim=await owner.claimRuntimeOwner(process.ppid);
    const startedAt=new Date(claim.runtimeStartedAt+1_000).toISOString();
    const first=activeJob(randomUUID(),startedAt,executorPid);
    const second=activeJob(randomUUID(),startedAt,executorPid);
    await store.create(first);
    await store.create(second);

    const runtime=new DurableJobRuntime(store,{"video-use-transcribe":async()=>({})});
    await runtime.waitUntilReady();

    expect(owner.calls).toEqual([executorPid]);
    expect(await store.get(first.id)).toMatchObject({status:"running",executorPid});
    expect(await store.get(second.id)).toMatchObject({status:"running",executorPid});
  });
});
