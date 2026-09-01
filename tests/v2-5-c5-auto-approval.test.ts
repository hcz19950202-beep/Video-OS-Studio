import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService} from "@/lib/ai/application";
import {attemptAgentProposalAutoApply} from "@/lib/ai/proposal-approval-policy";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";
import type {ProjectCommand} from "@/lib/project/commands";

const NOW="2026-09-01T12:00:00.000Z";
const PROJECT_ID="c5-auto-approval";
const SESSION_ID="61111111-1111-4111-8111-111111111111";
const TURN_ID="62222222-2222-4222-8222-222222222222";
const PROPOSAL_ID="63333333-3333-4333-8333-333333333333";
const SECOND_PROPOSAL_ID="64444444-4444-4444-8444-444444444444";
const USER_MESSAGE_ID="auto-user-message";

const proposalFor=(id:string,operationId:string,commands:ProjectCommand[])=>({
  id,
  sessionId:SESSION_ID,
  projectId:PROJECT_ID,
  baseProjectRevision:0,
  title:"Controlled safe edit",
  summary:"Apply a bounded Project transaction only when application policy allows it.",
  rationale:["Auto-approval remains application-owned and revision-bound."],
  operations:[{
    id:operationId,
    kind:"project-transaction" as const,
    summary:"Apply bounded Project commands.",
    payload:{label:"C5 safe auto apply",commands},
  }],
  warnings:[],
  createdAt:NOW,
  status:"draft" as const,
});

const createSession=(commands:ProjectCommand[],multipleProposals=false):AgentSession=>{
  const proposals=[proposalFor(PROPOSAL_ID,"auto-safe-operation",commands)];
  if(multipleProposals)proposals.push(proposalFor(SECOND_PROPOSAL_ID,"second-safe-operation",[{type:"rename-project",name:"Second proposal"}]));
  return AgentSessionSchema.parse({
    id:SESSION_ID,
    projectId:PROJECT_ID,
    providerId:"scripted-provider",
    status:"active",
    createdAt:NOW,
    updatedAt:NOW,
    messages:[{id:USER_MESSAGE_ID,role:"user",content:"Apply safe edits",createdAt:NOW}],
    turns:[{
      id:TURN_ID,
      baseProjectRevision:0,
      userMessageId:USER_MESSAGE_ID,
      startedAt:NOW,
      completedAt:NOW,
      status:"completed",
      providerRoundTrips:1,
      toolExecutions:[],
      proposalIds:proposals.map(item=>item.id),
    }],
    proposals,
    approvedOperations:[],
    operationClaims:[],
  });
};

const harness=async(commands:ProjectCommand[],multipleProposals=false)=>{
  const fs=new InMemoryFileSystemAdapter();
  const projects=new ProjectRepository(fs,"/data");
  const mutations=new ProjectMutationCoordinator(fs,projects);
  const sessions=new AgentSessionRepository(fs,"/agent-sessions");
  await projects.create({id:PROJECT_ID,name:"Before Auto Apply",now:NOW});
  await sessions.create(createSession(commands,multipleProposals));
  const application=new AgentProposalApplicationService({
    sessions,
    projects,
    mutations,
    visualPlans:{
      preview:async()=>{throw new Error("Visual Plan must not run in C5 safe transaction auto-approval tests");},
      apply:async()=>{throw new Error("Visual Plan must not run in C5 safe transaction auto-approval tests");},
    },
    now:()=>NOW,
  });
  const session=await sessions.require(PROJECT_ID,SESSION_ID);
  const sourceTurn=session.turns[0]!;
  const proposal=session.proposals.find(item=>item.id===PROPOSAL_ID)!;
  return{fs,projects,mutations,sessions,application,session,sourceTurn,proposal};
};

const operationLog=async(test:Awaited<ReturnType<typeof harness>>)=>{
  const path=test.projects.resolveProjectFile(PROJECT_ID,"operations.jsonl");
  return await test.fs.exists(path)?await test.fs.readText(path):"";
};

describe("V2.5 C5 application-owned Proposal auto approval",()=>{
  it("auto-applies one safe bounded Project transaction with exactly one durable History transaction in apply-safe-edits mode",async()=>{
    const test=await harness([
      {type:"rename-project",name:"Auto Applied"},
      {type:"set-duration",durationInFrames:420},
    ]);

    const result=await attemptAgentProposalAutoApply({
      projectId:PROJECT_ID,
      session:test.session,
      sourceTurn:test.sourceTurn,
      proposal:test.proposal,
      executionMode:"apply-safe-edits",
      application:test.application,
    });

    expect(result.applied).toBe(true);
    if(!result.applied)throw new Error("Expected C5 safe Proposal to auto-apply");
    expect(result.decision).toMatchObject({mode:"auto-apply",reason:"safe-bounded-project-transaction"});
    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.name).toBe("Auto Applied");
    expect(project.canvas.durationInFrames).toBe(420);
    expect(project.project.revision).toBe(1);
    expect(result.session.proposals.find(item=>item.id===PROPOSAL_ID)?.status).toBe("applied");
    expect(result.session.approvedOperations).toHaveLength(1);
    const history=await test.mutations.listHistory(PROJECT_ID);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      operationId:result.applyOperationId,
      label:"C5 safe auto apply",
      beforeRevision:0,
      appliedRevision:1,
    });
    const records=(await operationLog(test)).trim().split(/\r?\n/u).filter(Boolean).map(line=>JSON.parse(line) as {operationId:string;kind:string;status:string});
    expect(records.filter(record=>record.operationId===result.applyOperationId&&record.kind==="transaction"&&record.status==="applied")).toHaveLength(1);
  });

  it("keeps review-first Proposals reviewable and leaves Project truth unchanged",async()=>{
    const test=await harness([{type:"rename-project",name:"Must Stay Proposed"}]);
    const result=await attemptAgentProposalAutoApply({
      projectId:PROJECT_ID,
      session:test.session,
      sourceTurn:test.sourceTurn,
      proposal:test.proposal,
      executionMode:"review-first",
      application:test.application,
    });

    expect(result).toMatchObject({applied:false,decision:{mode:"explicit-approval",reason:"execution-mode-requires-review"}});
    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.name).toBe("Before Auto Apply");
    expect(project.project.revision).toBe(0);
    expect((await test.sessions.require(PROJECT_ID,SESSION_ID)).proposals[0]?.status).toBe("draft");
    expect(await operationLog(test)).toBe("");
  });

  it("forces destructive commands through explicit approval even in apply-safe-edits mode",async()=>{
    const test=await harness([{type:"remove-clip",clipId:"protected-clip"}]);
    const result=await attemptAgentProposalAutoApply({
      projectId:PROJECT_ID,
      session:test.session,
      sourceTurn:test.sourceTurn,
      proposal:test.proposal,
      executionMode:"apply-safe-edits",
      application:test.application,
    });

    expect(result).toMatchObject({
      applied:false,
      decision:{mode:"explicit-approval",reason:"protected-command-requires-review",protectedCommandTypes:["remove-clip"]},
    });
    expect((await test.projects.load(PROJECT_ID)).project.revision).toBe(0);
    expect((await test.sessions.require(PROJECT_ID,SESSION_ID)).approvedOperations).toHaveLength(0);
    expect(await operationLog(test)).toBe("");
  });

  it("does not auto-apply when the same Agent turn produced multiple Proposals",async()=>{
    const test=await harness([{type:"rename-project",name:"First proposal"}],true);
    const result=await attemptAgentProposalAutoApply({
      projectId:PROJECT_ID,
      session:test.session,
      sourceTurn:test.sourceTurn,
      proposal:test.proposal,
      executionMode:"apply-safe-edits",
      application:test.application,
    });

    expect(result).toMatchObject({applied:false,decision:{mode:"explicit-approval",reason:"multiple-proposals-require-review"}});
    expect((await test.projects.load(PROJECT_ID)).project.revision).toBe(0);
    expect((await test.sessions.require(PROJECT_ID,SESSION_ID)).approvedOperations).toHaveLength(0);
  });
});
