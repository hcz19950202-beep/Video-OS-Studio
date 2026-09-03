import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {DurableJobRuntime} from "@/lib/jobs/runtime";
import {JobRecordSchema} from "@/lib/jobs/schema";
import {FileJobStore} from "@/lib/jobs/store";
import {createWorkflowJobRuntimePort} from "@/lib/workflows/job-port";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema,WorkflowRunSchema} from "@/lib/workflows/schema";
import {FileWorkflowStore} from "@/lib/workflows/store";

const roots:string[]=[];
const DEAD_OWNER_PID=2_147_483_646;

afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("V2.5.1 Workflow durable Job restart reconciliation",()=>{
  it("turns a Workflow waiting on a dead-runtime render Job into interrupted on restart",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-v2-5-1-workflow-job-restart-"));roots.push(root);
    const jobStore=new FileJobStore(root);await jobStore.ensure();
    const oldRuntime=await jobStore.runtimeOwner.claimRuntimeOwner(DEAD_OWNER_PID);
    const at=new Date(Math.max(Date.now()-1_000,oldRuntime.runtimeStartedAt+1)).toISOString();
    const jobId="11111111-1111-4111-8111-111111111111";
    await jobStore.create(JobRecordSchema.parse({
      id:jobId,
      type:"render-final",
      projectId:"demo",
      status:"running",
      stage:"rendering",
      progress:.2,
      attempt:1,
      input:{assetBaseUrl:"http://127.0.0.1:3000"},
      executorPid:DEAD_OWNER_PID,
      createdAt:at,
      updatedAt:at,
      startedAt:at,
    }));

    const workflowStore=new FileWorkflowStore(root);
    const definitions=new WorkflowDefinitionRegistry();
    definitions.register(WorkflowDefinitionSchema.parse({
      id:"v2-5-1-restart-render",
      version:"1",
      name:"V2.5.1 Restart Render",
      scenario:"talking-head",
      entryStageIds:["FINAL_RENDER"],
      stages:[{
        id:"FINAL_RENDER",
        kind:"render",
        dependsOn:[],
        optional:false,
        retryable:true,
        reviewRequired:false,
        invalidates:[],
        executorKey:"v2-5-1.final-render",
      }],
    }));
    const workflowId="22222222-2222-4222-8222-222222222222";
    await workflowStore.create(WorkflowRunSchema.parse({
      id:workflowId,
      definitionId:"v2-5-1-restart-render",
      definitionVersion:"1",
      projectId:"demo",
      createdAt:at,
      updatedAt:at,
      status:"running",
      scenario:"talking-head",
      currentStageId:"FINAL_RENDER",
      sourceAssetIds:[],
      canvasSnapshot:{width:1920,height:1080,fps:30},
      stageExecutions:[{
        stageId:"FINAL_RENDER",
        status:"running",
        attempt:1,
        attemptId:"33333333-3333-4333-8333-333333333333",
        startedAt:at,
        baseProjectRevision:0,
        inputDigest:"restart-render-input",
        jobIds:[jobId],
        operationIds:[],
        artifactIds:[],
      }],
      checkpoints:[],
      artifacts:[],
      lastKnownProjectRevision:0,
    }));

    let executorCalls=0;
    const jobs=new DurableJobRuntime(jobStore,{"render-final":async()=>{executorCalls++;return{};}});
    await jobs.waitUntilReady();
    expect(await jobs.get(jobId)).toMatchObject({status:"interrupted",stage:"interrupted",error:{code:"JOB_INTERRUPTED",retryable:true}});
    expect(executorCalls).toBe(0);

    const runner=new WorkflowRunner(workflowStore,definitions,new WorkflowStageRegistry(),createWorkflowJobRuntimePort(jobs),{jobPollIntervalMs:2});
    await runner.recover();
    await runner.waitForIdle(workflowId);

    const recovered=await workflowStore.get(workflowId);
    expect(recovered).toMatchObject({
      status:"interrupted",
      currentStageId:"FINAL_RENDER",
      error:{code:"JOB_INTERRUPTED",retryable:true,details:{jobId}},
    });
    expect(recovered?.stageExecutions[0]).toMatchObject({
      stageId:"FINAL_RENDER",
      status:"interrupted",
      jobIds:[jobId],
      error:{code:"JOB_INTERRUPTED",retryable:true,details:{jobId}},
    });
    expect((await workflowStore.readActivity(workflowId)).map(item=>item.event)).toEqual(expect.arrayContaining(["stage-interrupted","workflow-interrupted"]));
  });
});
