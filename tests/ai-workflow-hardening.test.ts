import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService} from "@/lib/ai/application";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {AgentWorkflowActionExecutor} from "@/lib/ai/workflow-application";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import {WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";

const now="2026-08-27T12:00:00.000Z";
const later="2026-08-27T12:01:00.000Z";
const projectId="a6-workflow-hardening-project";
const sessionId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const proposalId="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const workflowId="dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const project=(()=>{
  const value=createProject({id:projectId,name:"A6 Workflow Hardening",now,durationInFrames:300});
  value.project.revision=5;
  return ProjectSchema.parse(value);
})();

const pausedWorkflow=():WorkflowRun=>WorkflowRunSchema.parse({
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
  lastKnownProjectRevision:5,
});

const sessionFixture=()=>AgentSessionSchema.parse({
  id:sessionId,
  projectId,
  providerId:"hardening-provider",
  model:"hardening-model",
  status:"active",
  createdAt:now,
  updatedAt:now,
  messages:[],
  turns:[],
  proposals:[{
    id:proposalId,
    sessionId,
    projectId,
    baseProjectRevision:5,
    title:"Resume Workflow",
    summary:"Resume the paused Workflow.",
    rationale:["Explicit user confirmation is required."],
    operations:[{
      id:"resume-workflow",
      kind:"workflow-action",
      summary:"Resume Workflow",
      payload:{action:"resume",workflowId,expectedWorkflowUpdatedAt:now,expectedWorkflowStatus:"paused"},
    }],
    warnings:[],
    createdAt:now,
    status:"reviewed",
  }],
  approvedOperations:[],
});

const applicationWith=async(runtime:ConstructorParameters<typeof AgentWorkflowActionExecutor>[0])=>{
  const fs=new InMemoryFileSystemAdapter();
  const sessions=new AgentSessionRepository(fs,"/a6-workflow-hardening");
  await sessions.create(sessionFixture());
  const service=new AgentProposalApplicationService({
    sessions,
    projects:{load:async()=>ProjectSchema.parse(project)},
    mutations:{getOperation:async()=>null},
    visualPlans:{
      preview:async()=>{throw new Error("visual preview not expected");},
      apply:async()=>{throw new Error("visual apply not expected");},
    },
    workflowActions:new AgentWorkflowActionExecutor(runtime),
    now:()=>later,
  });
  return{sessions,service};
};

describe("V2.3 A6 Workflow action hardening",()=>{
  it("does not persist approval or applied state when the existing Workflow runtime fails",async()=>{
    const workflow=pausedWorkflow();
    let resumeCalls=0;
    const test=await applicationWith({
      get:async id=>id===workflow.id?workflow:null,
      create:async()=>{throw new Error("create not expected");},
      start:async()=>{throw new Error("start not expected");},
      resume:async()=>{resumeCalls+=1;throw new Error("temporary Workflow runtime failure");},
      retryStage:async()=>{throw new Error("retry not expected");},
      approveCheckpoint:async()=>{throw new Error("approve not expected");},
    });

    await expect(test.service.apply({projectId,sessionId,proposalId,expectedRevision:5})).rejects.toThrow("temporary Workflow runtime failure");

    const persisted=await test.sessions.require(projectId,sessionId);
    expect(resumeCalls).toBe(1);
    expect(persisted.proposals[0]?.status).toBe("reviewed");
    expect(persisted.approvedOperations).toEqual([]);
    expect(project.project.revision).toBe(5);
    expect(workflow.status).toBe("paused");
  });

  it("serializes concurrent duplicate confirmations so the Workflow action executes exactly once",async()=>{
    let workflow=pausedWorkflow();
    let resumeCalls=0;
    const test=await applicationWith({
      get:async id=>id===workflow.id?workflow:null,
      create:async()=>{throw new Error("create not expected");},
      start:async()=>{throw new Error("start not expected");},
      resume:async()=>{
        resumeCalls+=1;
        await new Promise(resolve=>setTimeout(resolve,10));
        workflow=WorkflowRunSchema.parse({...workflow,status:"running",updatedAt:later});
        return workflow;
      },
      retryStage:async()=>{throw new Error("retry not expected");},
      approveCheckpoint:async()=>{throw new Error("approve not expected");},
    });

    const [first,second]=await Promise.all([
      test.service.apply({projectId,sessionId,proposalId,expectedRevision:5}),
      test.service.apply({projectId,sessionId,proposalId,expectedRevision:5}),
    ]);

    const persisted=await test.sessions.require(projectId,sessionId);
    expect(resumeCalls).toBe(1);
    expect([first.alreadyApplied,second.alreadyApplied].sort()).toEqual([false,true]);
    expect(persisted.proposals[0]?.status).toBe("applied");
    expect(persisted.approvedOperations).toHaveLength(1);
    expect(project.project.revision).toBe(5);
    expect(workflow.status).toBe("running");
  });
});
