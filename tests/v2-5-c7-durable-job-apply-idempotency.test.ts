import {describe,expect,it,vi} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {
  AgentProposalApplicationError,
  AgentProposalApplicationService,
} from "@/lib/ai/application";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema} from "@/lib/ai/session/schema";
import {JobRecordSchema,type CreateJobInput,type JobRecord} from "@/lib/jobs/schema";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const NOW="2026-09-02T02:00:00.000Z";
const PROJECT_ID="c7-durable-job-apply";
const SESSION_ID="11111111-1111-4111-8111-111111111111";
const PROPOSAL_ID="22222222-2222-4222-8222-222222222222";
const OPERATION_ID="durable-render-final";

const project=ProjectSchema.parse(createProject({
  id:PROJECT_ID,
  name:"C7 Durable Job Apply",
  now:NOW,
  durationInFrames:300,
}));

const createSession=()=>AgentSessionSchema.parse({
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
    title:"Render reviewed final",
    summary:"Create exactly one durable render-final Job after explicit approval.",
    rationale:["Durable render work must stay idempotent across interrupted Apply finalization."],
    operations:[{
      id:OPERATION_ID,
      kind:"durable-job",
      summary:"Queue the reviewed final render.",
      payload:{jobType:"render-final"},
    }],
    warnings:[],
    createdAt:NOW,
    status:"draft",
  }],
  approvedOperations:[],
  operationClaims:[],
});

const harness=async(failFinalizationOnce=false)=>{
  const fs=new InMemoryFileSystemAdapter();
  const sessions=new AgentSessionRepository(fs,"/c7-durable-job-apply");
  await sessions.create(createSession());

  if(failFinalizationOnce){
    let failOnce=true;
    const durableMutate=sessions.mutate.bind(sessions);
    sessions.mutate=async(projectId,sessionId,mutation)=>durableMutate(projectId,sessionId,async current=>{
      const next=await mutation(current);
      if(failOnce&&next.approvedOperations.length>current.approvedOperations.length){
        failOnce=false;
        throw new Error("simulated durable job finalization failure");
      }
      return next;
    });
  }

  const records=new Map<string,JobRecord>();
  const create=vi.fn(async(input:CreateJobInput)=>{
    if(!input.jobId)throw new Error("C7 durable Job must use a deterministic explicit jobId.");
    if(records.has(input.jobId))throw new Error("duplicate durable Job create");
    const record=JobRecordSchema.parse({
      id:input.jobId,
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
    records.set(record.id,record);
    return structuredClone(record);
  });
  const get=vi.fn(async(jobId:string)=>{
    const record=records.get(jobId);
    return record?structuredClone(record):null;
  });

  const service=new AgentProposalApplicationService({
    sessions,
    projects:{load:async()=>ProjectSchema.parse(project)},
    mutations:{getOperation:async()=>null},
    visualPlans:{
      preview:async()=>{throw new Error("Visual Plan should not run for durable-job Apply");},
      apply:async()=>{throw new Error("Visual Plan should not run for durable-job Apply");},
    },
    jobs:{create,get},
    trustedAssetBaseUrl:"http://127.0.0.1:3000",
    now:()=>NOW,
  });

  return{sessions,records,create,get,service};
};

describe("V2.5 C7 durable Job Apply idempotency",()=>{
  it("recovers the already-created deterministic Job after interrupted Session finalization without dispatching a duplicate",async()=>{
    const test=await harness(true);

    await expect(test.service.apply({
      projectId:PROJECT_ID,
      sessionId:SESSION_ID,
      proposalId:PROPOSAL_ID,
      expectedRevision:0,
    })).rejects.toThrow("simulated durable job finalization failure");

    expect(test.create).toHaveBeenCalledTimes(1);
    expect(test.records.size).toBe(1);
    const interrupted=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(interrupted.approvedOperations).toHaveLength(0);
    expect(interrupted.operationClaims).toHaveLength(0);

    const existingJobId=[...test.records.keys()][0];
    expect(existingJobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);

    const retried=await test.service.apply({
      projectId:PROJECT_ID,
      sessionId:SESSION_ID,
      proposalId:PROPOSAL_ID,
      expectedRevision:0,
    });

    expect(retried.alreadyApplied).toBe(true);
    expect(retried.jobId).toBe(existingJobId);
    expect(retried.jobType).toBe("render-final");
    expect(retried.project.project.revision).toBe(0);
    expect(test.create).toHaveBeenCalledTimes(1);
    expect(test.records.size).toBe(1);

    const recovered=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(recovered.proposals[0]?.status).toBe("applied");
    expect(recovered.approvedOperations).toHaveLength(1);
    expect(recovered.operationClaims).toHaveLength(0);
    expect(recovered.operationAudit.filter(entry=>entry.action==="proposal-applied")).toHaveLength(1);
  });

  it("fails closed when Apply is durably recorded but the deterministic Job is missing",async()=>{
    const test=await harness();

    const applied=await test.service.apply({
      projectId:PROJECT_ID,
      sessionId:SESSION_ID,
      proposalId:PROPOSAL_ID,
      expectedRevision:0,
    });
    expect(applied.alreadyApplied).toBe(false);
    expect(applied.jobId).toBeTruthy();
    expect(test.create).toHaveBeenCalledTimes(1);

    test.records.delete(applied.jobId!);

    await expect(test.service.apply({
      projectId:PROJECT_ID,
      sessionId:SESSION_ID,
      proposalId:PROPOSAL_ID,
      expectedRevision:0,
    })).rejects.toEqual(expect.objectContaining({
      name:"AgentProposalApplicationError",
      message:"Proposal Apply was recorded but its durable Job could not be recovered.",
    } satisfies Partial<AgentProposalApplicationError>));

    expect(test.create).toHaveBeenCalledTimes(1);
    expect(test.records.size).toBe(0);
    const session=await test.sessions.require(PROJECT_ID,SESSION_ID);
    expect(session.proposals[0]?.status).toBe("applied");
    expect(session.approvedOperations).toHaveLength(1);
    expect(session.operationClaims).toHaveLength(0);
  });
});
