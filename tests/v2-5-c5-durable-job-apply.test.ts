import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentProposalApplicationService,AgentProposalStaleError} from "@/lib/ai/application";
import {AgentProposedOperationSchema} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import type {CreateJobInput,JobRecord} from "@/lib/jobs/schema";
import {JobRecordSchema} from "@/lib/jobs/schema";
import {ProjectMutationCoordinator} from "@/lib/project/mutation-coordinator";
import {ProjectRepository} from "@/lib/project/repository";

const NOW="2026-09-01T14:00:00.000Z";
const PROJECT_ID="c5-durable-job";
const SESSION_ID="71111111-1111-4111-8111-111111111111";
const PROPOSAL_ID="72222222-2222-4222-8222-222222222222";
const OPERATION_ID="durable-render-job";
const TRUSTED_ASSET_BASE_URL="http://127.0.0.1:3032";

class FakeDurableJobs{
  readonly records=new Map<string,JobRecord>();
  readonly createInputs:CreateJobInput[]=[];
  actualCreates=0;
  failNext=false;

  async create(input:CreateJobInput){
    this.createInputs.push(structuredClone(input));
    if(this.failNext){this.failNext=false;throw new Error("simulated durable job create failure");}
    const jobId=input.jobId!;
    const existing=this.records.get(jobId);
    if(existing){
      expect(existing.type).toBe(input.type);
      expect(existing.projectId).toBe(input.projectId);
      expect(existing.input).toEqual(input.input);
      return structuredClone(existing);
    }
    this.actualCreates+=1;
    const record=JobRecordSchema.parse({
      id:jobId,
      type:input.type,
      projectId:input.projectId,
      status:"queued",
      stage:"queued",
      progress:0,
      attempt:1,
      input:input.input,
      createdAt:NOW,
      updatedAt:NOW,
    });
    this.records.set(jobId,record);
    return structuredClone(record);
  }

  async get(jobId:string){
    const value=this.records.get(jobId);
    return value?structuredClone(value):null;
  }
}

const payload={jobType:"render-final" as const,profile:{quality:"standard" as const}};

const createSession=(proposalPayload:unknown=payload)=>AgentSessionSchema.parse({
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
    title:"Create final render Job",
    summary:"Queue heavy render work without running it inside synchronous Apply.",
    rationale:["Heavy work must be represented by a durable Job reference."],
    operations:[{id:OPERATION_ID,kind:"durable-job",summary:"Queue final render.",payload:proposalPayload}],
    warnings:[],
    createdAt:NOW,
    status:"draft",
  }],
  approvedOperations:[],
  operationClaims:[],
});

const harness=async(proposalPayload:unknown=payload)=>{
  const fs=new InMemoryFileSystemAdapter();
  const projects=new ProjectRepository(fs,"/data");
  const mutations=new ProjectMutationCoordinator(fs,projects);
  const sessions=new AgentSessionRepository(fs,"/agent-sessions");
  const jobs=new FakeDurableJobs();
  await projects.create({id:PROJECT_ID,name:"Heavy Work Boundary",now:NOW});
  await sessions.create(createSession(proposalPayload));
  const service=new AgentProposalApplicationService({
    sessions,
    projects,
    mutations,
    jobs,
    trustedAssetBaseUrl:TRUSTED_ASSET_BASE_URL,
    visualPlans:{
      preview:async()=>{throw new Error("Visual Plan should not run for durable-job");},
      apply:async()=>{throw new Error("Visual Plan should not run for durable-job");},
    },
    now:()=>NOW,
  });
  return{projects,mutations,sessions,jobs,service};
};

describe("V2.5 C5 durable Job Proposal Apply",()=>{
  it("previews and queues one stable Job without synchronously mutating Project truth",async()=>{
    const test=await harness();
    const preview=await test.service.preview({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID});
    expect(preview.preview.operations).toEqual([expect.objectContaining({operationId:OPERATION_ID,kind:"durable-job",durableJobType:"render-final",selectableChangeIds:[]})]);

    const applied=await test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0});
    expect(applied.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(applied.jobType).toBe("render-final");
    expect(applied.transactionId).toBeNull();
    expect(applied.alreadyApplied).toBe(false);
    expect(test.jobs.actualCreates).toBe(1);
    expect(test.jobs.records.size).toBe(1);
    expect(test.jobs.createInputs[0]).toMatchObject({
      jobId:applied.jobId,
      type:"render-final",
      projectId:PROJECT_ID,
      input:{assetBaseUrl:TRUSTED_ASSET_BASE_URL,profile:{quality:"standard"}},
    });
    const project=await test.projects.load(PROJECT_ID);
    expect(project.project.revision).toBe(0);
    expect(applied.session.proposals[0]?.status).toBe("applied");
    expect(applied.session.approvedOperations).toHaveLength(1);

    const retried=await test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0});
    expect(retried.jobId).toBe(applied.jobId);
    expect(retried.alreadyApplied).toBe(true);
    expect(test.jobs.actualCreates).toBe(1);
    expect(test.jobs.records.size).toBe(1);
  });

  it("refuses a stale Proposal before any durable Job is created",async()=>{
    const test=await harness();
    await test.mutations.applyCommand(PROJECT_ID,{expectedRevision:0,commandId:"concurrent-before-job",command:{type:"rename-project",name:"Changed first"}});

    await expect(test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0})).rejects.toBeInstanceOf(AgentProposalStaleError);
    expect(test.jobs.records.size).toBe(0);
    expect(test.jobs.actualCreates).toBe(0);
    const session=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(session.proposals[0]?.status).toBe("stale");
    expect(session.approvedOperations).toHaveLength(0);
    expect(session.operationClaims).toHaveLength(0);
  });

  it("releases the Apply claim when durable Job creation fails",async()=>{
    const test=await harness();
    await test.service.preview({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID});
    test.jobs.failNext=true;

    await expect(test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0})).rejects.toThrow("simulated durable job create failure");
    expect(test.jobs.records.size).toBe(0);
    const session=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(session.proposals[0]?.status).toBe("reviewed");
    expect(session.approvedOperations).toHaveLength(0);
    expect(session.operationClaims).toHaveLength(0);
  });

  it("injects revision and operation authority for mutation-capable Jobs instead of accepting it from Proposal payload",async()=>{
    const test=await harness({jobType:"video-use-transcribe"});
    const applied=await test.service.apply({projectId:PROJECT_ID,sessionId:SESSION_ID,proposalId:PROPOSAL_ID,expectedRevision:0});
    expect(test.jobs.createInputs[0]).toMatchObject({
      jobId:applied.jobId,
      type:"video-use-transcribe",
      projectId:PROJECT_ID,
      input:{expectedRevision:0,operationId:applied.applyOperationId},
    });

    expect(AgentProposedOperationSchema.safeParse({
      id:"smuggle-render-origin",
      kind:"durable-job",
      summary:"Caller tries to override render origin.",
      payload:{jobType:"render-final",assetBaseUrl:"https://attacker.invalid"},
    }).success).toBe(false);
    expect(AgentProposedOperationSchema.safeParse({
      id:"smuggle-transcribe-authority",
      kind:"durable-job",
      summary:"Caller tries to override mutation authority.",
      payload:{jobType:"video-use-transcribe",expectedRevision:999,operationId:"attacker-operation"},
    }).success).toBe(false);
  });
});
