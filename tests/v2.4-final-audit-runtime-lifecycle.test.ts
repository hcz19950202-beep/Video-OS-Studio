// Final V2.4 audit regressions for durable ownership and background error lifecycles.
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import {DurableJobRuntime,type JobExecutor} from "@/lib/jobs/runtime";
import {JobRecordSchema} from "@/lib/jobs/schema";
import {withExclusiveFileLock} from "@/lib/fs/exclusive-lock";
import {FileJobStore} from "@/lib/jobs/store";
import {ProductionCampaignRunner} from "@/lib/production/campaign/runner";
import type {ProductionCampaignRepository,ProductionCampaignRunnerClaim} from "@/lib/production/campaign/repository";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const waitFor=async<T>(read:()=>Promise<T>,predicate:(value:T)=>boolean,timeoutMs=3_000)=>{
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    const value=await read();
    if(predicate(value))return value;
    await sleep(10);
  }
  throw new Error("Timed out waiting for final-audit runtime state.");
};

afterEach(async()=>{
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));
});

describe("V2.4 final audit exclusive lock error preservation",()=>{
  it("preserves the work failure when owned-lock cleanup also fails",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-lock-error-"));
    roots.push(root);
    const workError=new Error("locked work failed");
    const cleanupError=new Error("owned lock cleanup failed");
    const removeFile=(async()=>{throw cleanupError;}) as typeof rm;
    let thrown:unknown;
    try{await withExclusiveFileLock(join(root,"audit.lock"),async()=>{throw workError;},{removeFile});}
    catch(error){thrown=error;}
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([workError,cleanupError]);
    expect((thrown as AggregateError).message).not.toContain(cleanupError.message);
  });
});

describe("V2.4 final audit durable Job ownership",()=>{
  it("allows only one runtime to claim and execute the same durable queued Job",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-job-owner-"));
    roots.push(root);
    const seedStore=new FileJobStore(root);
    await seedStore.ensure();
    const at=new Date().toISOString();
    const job=JobRecordSchema.parse({
      id:"94949494-9494-4494-8494-949494949494",
      type:"render-final",
      projectId:"demo",
      status:"queued",
      stage:"queued",
      progress:0,
      attempt:1,
      input:{},
      createdAt:at,
      updatedAt:at,
    });
    await seedStore.create(job);

    const storeA=new FileJobStore(root);
    const storeB=new FileJobStore(root);
    const realSaveA=storeA.save.bind(storeA);
    let preparingEntered!:()=>void;
    const preparingReached=new Promise<void>(resolve=>{preparingEntered=resolve;});
    let releasePreparing!:()=>void;
    const preparingGate=new Promise<void>(resolve=>{releasePreparing=resolve;});
    let gated=false;
    vi.spyOn(storeA,"save").mockImplementation(async record=>{
      if(record.status==="preparing"&&!gated){
        gated=true;
        preparingEntered();
        await preparingGate;
      }
      return realSaveA(record);
    });

    let releaseExecutors!:()=>void;
    const executorGate=new Promise<void>(resolve=>{releaseExecutors=resolve;});
    let callsA=0;
    let callsB=0;
    let executorBEntered!:()=>void;
    const executorBStarted=new Promise<void>(resolve=>{executorBEntered=resolve;});
    const executorA:JobExecutor=async()=>{callsA+=1;await executorGate;return{runtime:"a"};};
    const executorB:JobExecutor=async()=>{callsB+=1;executorBEntered();await executorGate;return{runtime:"b"};};

    const runtimeA=new DurableJobRuntime(storeA,{"render-final":executorA});
    await preparingReached;
    const runtimeB=new DurableJobRuntime(storeB,{"render-final":executorB});
    await runtimeB.waitUntilReady();

    const runtimeBExecutedBeforeOwnerReleased=await Promise.race([
      executorBStarted.then(()=>true),
      sleep(150).then(()=>false),
    ]);

    releasePreparing();
    await waitFor(async()=>callsA,calls=>calls===1);
    await sleep(50);
    releaseExecutors();
    await waitFor(()=>seedStore.get(job.id),current=>current?.status==="completed");
    await Promise.all([runtimeA.waitForIdle(job.id),runtimeB.waitForIdle(job.id)]);

    expect(runtimeBExecutedBeforeOwnerReleased).toBe(false);
    expect(callsA+callsB).toBe(1);
  });

  it("preserves execution and terminal-persistence failures without an unowned background rejection",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-job-error-"));
    roots.push(root);
    const store=new FileJobStore(root);
    const operationalError=new Error("job executor failed");
    const persistenceError=new Error("job terminal persistence failed");
    const realSave=store.save.bind(store);
    vi.spyOn(store,"save").mockImplementation(async record=>{
      if(record.status==="failed")throw persistenceError;
      return realSave(record);
    });
    const runtime=new DurableJobRuntime(store,{"render-final":async()=>{throw operationalError;}});
    const job=await runtime.create({type:"render-final",projectId:"demo",input:{}});

    let thrown:unknown;
    try{await runtime.waitForIdle(job.id);}catch(error){thrown=error;}
    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([operationalError,persistenceError]);
    expect((thrown as AggregateError).message).not.toContain(persistenceError.message);
    expect(await store.get(job.id)).toMatchObject({status:"running",stage:"running"});
  });
});

describe("V2.4 final audit Workflow background lifecycle",()=>{
  it("attaches a rejection observer to the tracked background loop",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-final-audit-workflow-"));
    roots.push(root);
    const runner=new WorkflowRunner(new FileWorkflowStore(root),new WorkflowDefinitionRegistry(),new WorkflowStageRegistry());
    let rejectionObserved=false;
    const trackedLoop={
      catch:()=>{rejectionObserved=true;return Promise.resolve();},
    } as unknown as Promise<void>;
    const internals=runner as unknown as {
      runLoop:(workflowId:string)=>Promise<void>;
      schedule:(workflowId:string)=>void;
      activeLoops:Map<string,Promise<void>>;
    };
    internals.runLoop=(()=>({finally:()=>trackedLoop} as unknown as Promise<void>));

    internals.schedule("final-audit-workflow");

    expect(internals.activeLoops.get("final-audit-workflow")).toBe(trackedLoop);
    expect(rejectionObserved).toBe(true);
  });
});

describe("V2.4 final audit Campaign error preservation",()=>{
  it("preserves the run failure when runner-claim release also fails",async()=>{
    const operationalError=new Error("campaign execution failed");
    const releaseError=new Error("campaign claim release failed");
    const claim:ProductionCampaignRunnerClaim={
      version:1,
      campaignId:"campaign-final-audit",
      ownerToken:"owner-final-audit",
      pid:process.pid,
      claimedAt:new Date().toISOString(),
    };
    const repository={
      claimRunner:async()=>claim,
      mutate:async()=>{throw operationalError;},
      releaseRunnerClaim:async()=>{throw releaseError;},
    } as unknown as ProductionCampaignRepository;
    const runner=new ProductionCampaignRunner(repository,{runMission:async()=>({status:"completed",finalArtifactIds:[]})});

    let thrown:unknown;
    try{await runner.run(claim.campaignId);}catch(error){thrown=error;}

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([operationalError,releaseError]);
    expect((thrown as AggregateError).message).not.toContain(releaseError.message);
  });
});
