import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService} from "@/lib/ai/application";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {AgentWorkflowActionExecutor} from "@/lib/ai/workflow-application";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema,type Project} from "@/schemas/project";
import {WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";

const now="2026-08-27T09:00:00.000Z";
const later="2026-08-27T09:01:00.000Z";
const projectId="a5-workflow-apply-project";
const sessionId="55555555-5555-4555-8555-555555555555";
const proposalId="66666666-6666-4666-8666-666666666666";
const workflowId="77777777-7777-4777-8777-777777777777";
const proposalOperationId="workflow-operation-resume";

const buildProject=():Project=>{
  const project=createProject({id:projectId,name:"A5 Workflow Apply",now,durationInFrames:600});
  project.project.revision=7;
  return ProjectSchema.parse(project);
};

const pausedWorkflow=(input:Partial<WorkflowRun>={}):WorkflowRun=>WorkflowRunSchema.parse({
  id:workflowId,
  definitionId:"video-production-product-ad",
  definitionVersion:"2",
  projectId,
  createdAt:now,
  updatedAt:now,
  status:"paused",
  scenario:"product-ad",
  sourceAssetIds:[],
  canvasSnapshot:{width:1920,height:1080,fps:30},
  stageExecutions:[{stageId:"TRANSCRIBE",status:"ready",attempt:1,jobIds:[],operationIds:[],artifactIds:[]}],
  checkpoints:[],
  artifacts:[],
  lastKnownProjectRevision:7,
  ...input,
});

const sessionInput=()=>AgentSessionSchema.parse({
  id:sessionId,
  projectId,
  providerId:"mock-provider",
  model:"mock-model",
  status:"active",
  createdAt:now,
  updatedAt:now,
  messages:[],
  turns:[],
  proposals:[{
    id:proposalId,
    sessionId,
    projectId,
    baseProjectRevision:7,
    title:"Resume Workflow",
    summary:"Resume the paused production Workflow.",
    rationale:["The user requested the paused Workflow to continue."],
    operations:[{id:proposalOperationId,kind:"workflow-action",summary:"Resume Workflow",payload:{action:"resume",workflowId,expectedWorkflowUpdatedAt:now,expectedWorkflowStatus:"paused"}}],
    warnings:[],
    createdAt:now,
    status:"draft",
  }],
  approvedOperations:[],
});

const harness=async(workflowInput=pausedWorkflow())=>{
  const fs=new InMemoryFileSystemAdapter();
  const sessions=new AgentSessionRepository(fs,"/a5-workflow-apply");
  await sessions.create(sessionInput());
  const project=buildProject();
  let workflow=workflowInput;
  let resumeCalls=0;
  const runtime={
    get:async(id:string)=>id===workflow.id?workflow:null,
    create:async()=>{throw new Error("create not expected");},
    start:async()=>{throw new Error("start not expected");},
    resume:async()=>{resumeCalls+=1;workflow=WorkflowRunSchema.parse({...workflow,status:"running",updatedAt:later});return workflow;},
    retryStage:async()=>{throw new Error("retry not expected");},
    approveCheckpoint:async()=>{throw new Error("approve not expected");},
  };
  const workflowActions=new AgentWorkflowActionExecutor(runtime);
  const service=new AgentProposalApplicationService({
    sessions,
    projects:{load:async()=>project},
    mutations:{getOperation:async()=>null},
    visualPlans:{preview:async()=>{throw new Error("visual preview not expected");},apply:async()=>{throw new Error("visual apply not expected");}},
    workflowActions,
    now:()=>later,
  });
  return{sessions,service,getWorkflow:()=>workflow,getResumeCalls:()=>resumeCalls,project};
};

describe("V2.3 A5 Workflow proposal Review / Apply boundary",()=>{
  it("reviews a Workflow action without executing it or changing Project revision",async()=>{
    const test=await harness();
    const result=await test.service.preview({projectId,sessionId,proposalId});
    expect(test.getResumeCalls()).toBe(0);
    expect(test.project.project.revision).toBe(7);
    expect(result.preview.operations).toHaveLength(1);
    expect(result.preview.operations[0]).toMatchObject({kind:"workflow-action",selectableChangeIds:[],workflowAction:{action:"resume",workflowId,currentStatus:"paused"}});
    expect(result.session.proposals[0]?.status).toBe("reviewed");
    expect(result.session.approvedOperations).toHaveLength(0);
  });

  it("executes the accepted WorkflowService action only after explicit Apply and normal retries do not execute twice",async()=>{
    const test=await harness();
    await test.service.preview({projectId,sessionId,proposalId});
    const applied=await test.service.apply({projectId,sessionId,proposalId,expectedRevision:7});
    expect(test.getResumeCalls()).toBe(1);
    expect(applied.project.project.revision).toBe(7);
    expect(applied.workflow?.status).toBe("running");
    expect(applied.workflowAction).toBe("resume");
    expect(applied.transactionId).toBeNull();
    expect(applied.appliedChangeIds).toEqual([]);
    expect(applied.session.proposals[0]?.status).toBe("applied");
    expect(applied.session.approvedOperations).toHaveLength(1);

    const retried=await test.service.apply({projectId,sessionId,proposalId,expectedRevision:7});
    expect(retried.alreadyApplied).toBe(true);
    expect(test.getResumeCalls()).toBe(1);
    expect(retried.project.project.revision).toBe(7);
  });

  it("marks the proposal stale when Workflow state changes before Review",async()=>{
    const changed=pausedWorkflow({updatedAt:later});
    const test=await harness(changed);
    const result=await test.service.preview({projectId,sessionId,proposalId});
    expect(result.preview.status).toBe("stale");
    expect(result.preview.operations).toEqual([]);
    expect((await test.sessions.require(projectId,sessionId)).proposals[0]?.status).toBe("stale");
    expect(test.getResumeCalls()).toBe(0);
  });

  it("uses one stable WorkflowRun ID for first-draft Apply retries and never starts an existing run twice",async()=>{
    const runs=new Map<string,WorkflowRun>();
    let startCalls=0;
    let createCalls=0;
    const project=buildProject();
    const runtime={
      get:async(id:string)=>runs.get(id)??null,
      create:async(input:{workflowId?:string;projectId:string;definitionId:string;definitionVersion:string;sourceAssetIds?:string[];expectedProjectRevision?:number})=>{
        createCalls+=1;
        const id=input.workflowId!;
        const existing=runs.get(id);if(existing)return existing;
        const created=WorkflowRunSchema.parse({id,definitionId:input.definitionId,definitionVersion:input.definitionVersion,projectId:input.projectId,createdAt:now,updatedAt:now,status:"pending",scenario:"product-ad",sourceAssetIds:input.sourceAssetIds??[],canvasSnapshot:{width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps},stageExecutions:[{stageId:"MEDIA_IMPORT",status:"pending",attempt:0,jobIds:[],operationIds:[],artifactIds:[]}],checkpoints:[],artifacts:[],lastKnownProjectRevision:7});
        runs.set(id,created);return created;
      },
      start:async(id:string)=>{startCalls+=1;const current=runs.get(id)!;const started=WorkflowRunSchema.parse({...current,status:"running",updatedAt:later});runs.set(id,started);return started;},
      resume:async()=>{throw new Error("resume not expected");},
      retryStage:async()=>{throw new Error("retry not expected");},
      approveCheckpoint:async()=>{throw new Error("approve not expected");},
    };
    const executor=new AgentWorkflowActionExecutor(runtime);
    const payload={action:"create_first_draft" as const,scenario:"product-ad" as const,sourceAssetIds:["source-video"]};
    const first=await executor.apply(projectId,payload,7,"agent-apply:stable");
    const second=await executor.apply(projectId,payload,7,"agent-apply:stable");
    expect(first.workflow.id).toBe(second.workflow.id);
    expect(first.workflow.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first.alreadyApplied).toBe(false);
    expect(second.alreadyApplied).toBe(true);
    expect(startCalls).toBe(1);
    expect(createCalls).toBe(2);
  });
});
