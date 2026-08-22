import {describe,expect,it} from "vitest";
import {ProjectCommandMutationSchema,ProjectReplacementMutationSchema,ProjectTransactionMutationSchema} from "@/lib/project/mutation-contract";
import {ProjectRevisionConflictError,ProjectOperationIdReuseError} from "@/lib/project/mutation-coordinator";
import {projectMutationErrorResponse} from "@/lib/server/project-mutation-http";
import {createProject} from "@/lib/project/factory";

describe("H1 mutation contract",()=>{
  it("rejects legacy raw command and accepts the revision envelope",()=>{
    expect(ProjectCommandMutationSchema.safeParse({type:"rename-project",name:"Legacy"}).success).toBe(false);
    expect(ProjectCommandMutationSchema.parse({expectedRevision:4,commandId:"cmd-1",command:{type:"rename-project",name:"Safe"}})).toMatchObject({expectedRevision:4,commandId:"cmd-1"});
  });

  it("requires expected revision and operation ID for transactions",()=>{
    expect(ProjectTransactionMutationSchema.safeParse({transaction:{label:"No envelope",commands:[]}}).success).toBe(false);
    expect(ProjectTransactionMutationSchema.parse({expectedRevision:2,transactionId:"tx-1",transaction:{label:"Batch",commands:[{type:"rename-project",name:"B"}]}})).toMatchObject({expectedRevision:2,transactionId:"tx-1"});
  });

  it("restricts whole-project replacement to explicit maintenance reasons",()=>{
    const project=createProject({id:"replace",name:"Replace"});
    expect(ProjectReplacementMutationSchema.safeParse({expectedRevision:0,operationId:"replace-1",project}).success).toBe(false);
    expect(ProjectReplacementMutationSchema.parse({expectedRevision:0,operationId:"replace-1",reason:"restore",project}).reason).toBe("restore");
  });

  it("maps stale revisions to a structured 409 response",async()=>{
    const response=projectMutationErrorResponse(new ProjectRevisionConflictError(20,21),"Reload and retry");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({code:"PROJECT_REVISION_CONFLICT",retryable:true,details:{expectedRevision:20,currentRevision:21},action:"Reload and retry"});
  });

  it("maps operation ID reuse to a non-retryable 409 response",async()=>{
    const response=projectMutationErrorResponse(new ProjectOperationIdReuseError("cmd-reused"),"Retry");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({code:"PROJECT_OPERATION_ID_REUSED",retryable:false,details:{operationId:"cmd-reused"}});
  });
});
