import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService,AgentProposalStaleError} from "@/lib/ai/application";
import {AgentProposedOperationSchema} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const NOW="2026-09-01T10:00:00.000Z";
const PROJECT_ID="c5-project-transaction";
const SESSION_ID="11111111-1111-4111-8111-111111111111";
const PROPOSAL_ID="22222222-2222-4222-8222-222222222222";
const OPERATION_ID="bounded-project-edit";

const transactionPayload={
  label:"Rename Project and resize the bounded timeline",
  commands:[
    {type:"rename-project" as const,name:"Controlled Apply"},
    {type:"set-duration" as const,durationInFrames:480},
  ],
};

const createSession=(payload:unknown=transactionPayload)=>AgentSessionSchema.parse({
  id:SESSION_ID,
  projectId:PROJECT_ID,
  providerId:"local-mcp",
  status:"active",
  createdAt:NOW,
  updatedAt:NOW,
  messages:[],
  turns:[],
  proposals:[{
    id:PROPOSAL_ID,
    sessionId:SESSION_ID,
    projectId:PROJECT_ID,
    baseProjectRevision:0,
    title:"Bounded Project edit",
    summary:"Apply reviewed Project commands through the existing mutation coordinator.",
    rationale:["External agents may propose this edit but cannot write the Project directly."],
    operations:[{id:OPERATION_ID,kind:"project-transaction",summary:"Apply a bounded Project command transaction.",payload}],
    warnings:[],
    createdAt:NOW,
    status:"draft",
  }],
  approvedOperations:[],
  operationClaims:[],
});

const harness=async(payload:unknown=transactionPayload)=>{
  const fs=new InMemoryFileSystemAdapter();
  const projects=new ProjectRepository(fs,"/data");
  const mutations=new ProjectMutationCoordinator(fs,projects);
  const sessions=new AgentSessionRepository(fs,"/agent-sessions");
  await projects.create({id:PROJECT_ID,name:"Before Apply",now:NOW});
  await sessions.create(createSession(payload));
  const service=new AgentProposalApplicationService({
    sessions,
    projects,
    mutations,
    visualPlans:{
      preview:async()=>{throw new Error("Visual Plan should not run for project-transaction");},
      apply:async()=>{throw new Error("Visual Plan should not run for project-transaction");},
    },
    now:()=>NOW,
  });
  return{fs,projects,mutations,sessions,service};
};

const operationLog=async(test:Awaited<ReturnType<typeof harness>>)=>{
  const path=test.projects.resolveProjectFile(PROJECT_ID,"operations.jsonl");
  return await test.fs.exists(path)?await test.fs.readText(path):"";
};

describe("V2.5 C5 Proposal project-transaction Apply",()=>{
  it("applies one reviewed bounded transaction through ProjectMutationCoordinator and makes retries and audit idempotent",async()=>{
    const test=await harness();
    const preview=await test.service.preview({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID});
    expect(preview.preview.operations).toEqual([expect.objectContaining({operationId:OPERATION_ID,kind:"project-transaction",selectableChangeIds:[],selectedChangeIds:[]})]);
    expect(preview.session.operationAudit).toEqual([expect.objectContaining({
      id:`proposal-review:${PROPOSAL_ID}`,
      source:"local-mcp",
      action:"proposal-reviewed",
      outcome:"success",
      proposalId:PROPOSAL_ID,
    })]);
    expect((await test.projects.load(PROJECT_ID)).project.revision).toBe(0);

    const applied=await test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0});
    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.name).toBe("Controlled Apply");
    expect(project.canvas.durationInFrames).toBe(480);
    expect(project.project.revision).toBe(1);
    expect(applied.transactionId).toBe(applied.applyOperationId);
    expect(applied.alreadyApplied).toBe(false);
    expect(applied.session.proposals[0]?.status).toBe("applied");
    expect(applied.session.approvedOperations).toHaveLength(1);
    expect(applied.session.operationAudit).toEqual([
      expect.objectContaining({id:`proposal-review:${PROPOSAL_ID}`,action:"proposal-reviewed"}),
      expect.objectContaining({
        id:`proposal-apply:${applied.applyOperationId}`,
        source:"local-mcp",
        action:"proposal-applied",
        outcome:"success",
        proposalId:PROPOSAL_ID,
        operationId:applied.applyOperationId,
      }),
    ]);

    const records=(await operationLog(test)).trim().split(/\r?\n/u).filter(Boolean).map(line=>JSON.parse(line) as {operationId:string;kind:string;status:string});
    expect(records.filter(record=>record.operationId===applied.applyOperationId&&record.kind==="transaction"&&record.status==="applied")).toHaveLength(1);

    const retried=await test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0});
    expect(retried.alreadyApplied).toBe(true);
    expect((await test.projects.load(PROJECT_ID)).project.revision).toBe(1);
    const retriedRecords=(await operationLog(test)).trim().split(/\r?\n/u).filter(Boolean).map(line=>JSON.parse(line) as {operationId:string;status:string});
    expect(retriedRecords.filter(record=>record.operationId===applied.applyOperationId&&record.status==="applied")).toHaveLength(1);
    expect(retried.session.operationAudit.filter(entry=>entry.id===`proposal-apply:${applied.applyOperationId}`)).toHaveLength(1);
  });

  it("marks the Proposal stale, audits the conflict, and refuses Apply when baseProjectRevision no longer matches",async()=>{
    const test=await harness();
    await test.mutations.applyCommand(PROJECT_ID,{expectedRevision:0,commandId:"concurrent-edit",command:{type:"rename-project",name:"Concurrent Edit"}});

    await expect(test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0})).rejects.toBeInstanceOf(AgentProposalStaleError);

    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.name).toBe("Concurrent Edit");
    expect(project.project.revision).toBe(1);
    const session=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(session.proposals[0]?.status).toBe("stale");
    expect(session.approvedOperations).toHaveLength(0);
    expect(session.operationClaims).toHaveLength(0);
    expect(session.operationAudit).toEqual([expect.objectContaining({
      id:`proposal-stale:${PROPOSAL_ID}:0`,
      source:"local-mcp",
      action:"proposal-stale",
      outcome:"stale",
      proposalId:PROPOSAL_ID,
    })]);
  });

  it("leaves zero partial Project mutation, no false Apply audit, and releases the claim when any command fails",async()=>{
    const test=await harness({
      label:"Transaction that must fail atomically",
      commands:[
        {type:"rename-project",name:"Must Not Persist"},
        {type:"remove-clip",clipId:"missing-clip"},
      ],
    });
    await test.service.preview({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID});

    await expect(test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0})).rejects.toThrow("Clip missing-clip not found");

    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.name).toBe("Before Apply");
    expect(project.project.revision).toBe(0);
    expect(await operationLog(test)).not.toContain("agent-apply:");
    const session=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(session.proposals[0]?.status).toBe("reviewed");
    expect(session.approvedOperations).toHaveLength(0);
    expect(session.operationClaims).toHaveLength(0);
    expect(session.operationAudit.map(entry=>entry.action)).toEqual(["proposal-reviewed"]);
  });

  it("audits an explicit Proposal rejection without mutating the Project",async()=>{
    const test=await harness();
    const before=await test.projects.load(PROJECT_ID);

    const rejected=await test.service.reject({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID});

    expect(rejected.proposals[0]?.status).toBe("rejected");
    expect(rejected.operationAudit).toEqual([expect.objectContaining({
      id:`proposal-reject:${PROPOSAL_ID}`,
      source:"local-mcp",
      action:"proposal-rejected",
      outcome:"rejected",
      proposalId:PROPOSAL_ID,
    })]);
    expect(await test.projects.load(PROJECT_ID)).toEqual(before);
  });

  it("rejects whole-Project snapshot replacement at the Proposal schema boundary",async()=>{
    const test=await harness();
    const snapshot=await test.projects.load(PROJECT_ID);
    const parsed=AgentProposedOperationSchema.safeParse({
      id:"forbidden-restore",
      kind:"project-transaction",
      summary:"Attempt to smuggle a raw Project replacement through Proposal.",
      payload:{label:"Forbidden replacement",commands:[{type:"restore-project-snapshot",snapshot}]},
    });
    expect(parsed.success).toBe(false);
  });
});
