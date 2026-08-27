import {describe,expect,it} from "vitest";
import {buildAgentContextSnapshot} from "@/lib/ai/context";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import {WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";

const now="2026-08-27T08:00:00.000Z";
const projectId="a5-agent-workflow-project";
const sessionId="11111111-1111-4111-8111-111111111115";
const proposalId="22222222-2222-4222-8222-222222222225";
const workflowId="33333333-3333-4333-8333-333333333335";

const project=(()=>{
  const value=createProject({id:projectId,name:"A5 Agent Workflow",now,durationInFrames:900});
  value.assets.push({id:"source-video",kind:"video",relativePath:"media/source.mp4",durationInFrames:900,width:1920,height:1080,hasAudio:true});
  value.project.revision=7;
  return ProjectSchema.parse(value);
})();
const context=buildAgentContextSnapshot(project);
const executionContext={sessionId,context,now:()=>now,makeId:()=>proposalId};

const run=(input:Partial<WorkflowRun>={}):WorkflowRun=>WorkflowRunSchema.parse({
  id:workflowId,
  definitionId:"video-production-product-ad",
  definitionVersion:"2",
  projectId,
  createdAt:now,
  updatedAt:now,
  status:"failed",
  scenario:"product-ad",
  currentStageId:"TRANSCRIBE",
  sourceAssetIds:["source-video"],
  canvasSnapshot:{width:1920,height:1080,fps:30},
  stageExecutions:[{stageId:"TRANSCRIBE",status:"failed",attempt:1,jobIds:[],operationIds:[],artifactIds:["transcript-a"],error:{code:"TRANSCRIBE_FAILED",message:"C:\\Users\\private\\secret-media.mp4 failed",retryable:true}}],
  checkpoints:[],
  artifacts:[{id:"transcript-a",stageId:"TRANSCRIBE",kind:"transcript",createdAt:now,projectRevision:7,logicalAssetId:"transcript-main",relativePath:"edit/transcript.json"}],
  lastKnownProjectRevision:7,
  error:{code:"WORKFLOW_STAGE_FAILED",message:"C:\\Users\\private\\workflow.log",retryable:true},
  ...input,
});

const reader=(runs:WorkflowRun[])=>({
  list:async()=>runs,
  get:async(id:string)=>runs.find(item=>item.id===id)??null,
});
const registryFor=(runs:WorkflowRun[])=>createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("not used");}},workflows:reader(runs)});

describe("V2.3 A5 bounded Agent Workflow tools",()=>{
  it("adds only bounded Workflow read/proposal tools with explicit safety metadata",()=>{
    const registry=registryFor([]);
    const definitions=registry.listDefinitions();
    expect(definitions.map(item=>item.id)).toEqual(["get_project_context","get_workflow_status","propose_visual_plan","request_workflow_action"]);
    expect(registry.getDefinition("get_workflow_status")).toMatchObject({risk:"read",idempotency:"read-only",requiresConfirmation:false});
    expect(registry.getDefinition("request_workflow_action")).toMatchObject({risk:"proposal",revisionPolicy:"snapshot",idempotency:"proposal-only",requiresConfirmation:false});
    expect(registry.getDefinition("workflow_write_json")).toBeUndefined();
    expect(registry.getDefinition("spawn_stage")).toBeUndefined();
  });

  it("returns a bounded Project-scoped Workflow summary and redacts machine paths",async()=>{
    const other=run({id:"44444444-4444-4444-8444-444444444444",projectId:"other-project"});
    const registry=registryFor([other,run()]);
    const result=await registry.execute({id:"call_workflow_status",toolId:"get_workflow_status",arguments:{}},executionContext);
    expect(result.status).toBe("success");
    const output=result.output as {workflows?:Array<{id:string;stages:Array<{error?:{message:string}}> ;artifacts:Array<Record<string,unknown>>}>}|undefined;
    expect(output?.workflows).toHaveLength(1);
    expect(output?.workflows?.[0]?.id).toBe(workflowId);
    expect(output?.workflows?.[0]?.stages[0]?.error?.message).toContain("[redacted-path]");
    expect(JSON.stringify(output)).not.toContain("Users");
    expect(JSON.stringify(output)).not.toContain("relativePath");
  });

  it("creates a first-draft Workflow proposal without creating or starting a Workflow",async()=>{
    let listCalls=0;let getCalls=0;
    const workflows={list:async()=>{listCalls+=1;return[];},get:async()=>{getCalls+=1;return null;}};
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("not used");}},workflows});
    const result=await registry.execute({id:"call_workflow_create",toolId:"request_workflow_action",arguments:{action:"create_first_draft",scenario:"product-ad",sourceAssetIds:["source-video"]}},executionContext);
    expect(result.status).toBe("success");
    const proposal=result.output?.proposal as {baseProjectRevision?:number;operations?:Array<{kind?:string;payload?:Record<string,unknown>}>}|undefined;
    expect(proposal?.baseProjectRevision).toBe(7);
    expect(proposal?.operations?.[0]?.kind).toBe("workflow-action");
    expect(proposal?.operations?.[0]?.payload).toEqual({action:"create_first_draft",scenario:"product-ad",sourceAssetIds:["source-video"]});
    expect(listCalls).toBe(0);
    expect(getCalls).toBe(0);
    expect(project.project.revision).toBe(7);
  });

  it("rejects a first-draft request that references assets outside current bounded Project context",async()=>{
    const registry=registryFor([]);
    const result=await registry.execute({id:"call_missing_source",toolId:"request_workflow_action",arguments:{action:"create_first_draft",scenario:"product-ad",sourceAssetIds:["missing-video"]}},executionContext);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("workflow_source_asset_missing");
    expect(result.error?.retryable).toBe(false);
  });

  it("captures Workflow state when proposing retry and rejects invalid retry states",async()=>{
    const failed=run();
    const registry=registryFor([failed]);
    const retry=await registry.execute({id:"call_retry",toolId:"request_workflow_action",arguments:{action:"retry",workflowId,stageId:"TRANSCRIBE"}},executionContext);
    expect(retry.status).toBe("success");
    const payload=(retry.output?.proposal as {operations?:Array<{payload?:Record<string,unknown>}>})?.operations?.[0]?.payload;
    expect(payload).toMatchObject({action:"retry",workflowId,stageId:"TRANSCRIBE",expectedWorkflowUpdatedAt:now,expectedWorkflowStatus:"failed"});

    const running=run({status:"running",error:undefined});
    const blocked=await registryFor([running]).execute({id:"call_bad_retry",toolId:"request_workflow_action",arguments:{action:"retry",workflowId,stageId:"TRANSCRIBE"}},executionContext);
    expect(blocked.status).toBe("error");
    expect(blocked.error?.code).toBe("workflow_invalid_state");
  });

  it("only proposes resume for paused Workflow state",async()=>{
    const paused=run({status:"paused",currentStageId:undefined,error:undefined,stageExecutions:[{stageId:"TRANSCRIBE",status:"ready",attempt:1,jobIds:[],operationIds:[],artifactIds:[]}]});
    const result=await registryFor([paused]).execute({id:"call_resume",toolId:"request_workflow_action",arguments:{action:"resume",workflowId}},executionContext);
    expect(result.status).toBe("success");
    const payload=(result.output?.proposal as {operations?:Array<{payload?:Record<string,unknown>}>})?.operations?.[0]?.payload;
    expect(payload).toMatchObject({action:"resume",workflowId,expectedWorkflowUpdatedAt:now,expectedWorkflowStatus:"paused"});
  });

  it("routes final-render intent through the existing ASSEMBLY_REVIEW checkpoint proposal boundary",async()=>{
    const waiting=run({
      status:"waiting_review",
      currentStageId:"ASSEMBLY_REVIEW",
      error:undefined,
      stageExecutions:[{stageId:"ASSEMBLY_REVIEW",status:"waiting_review",attempt:1,jobIds:[],operationIds:[],artifactIds:["preview-a"]}],
      checkpoints:[{id:"assembly-review-1",stageId:"ASSEMBLY_REVIEW",status:"waiting_review",createdAt:now,baseProjectRevision:7}],
      artifacts:[{id:"preview-a",stageId:"ASSEMBLY_REVIEW",kind:"preview",createdAt:now,projectRevision:7}],
    });
    const result=await registryFor([waiting]).execute({id:"call_final_render",toolId:"request_workflow_action",arguments:{action:"final_render",workflowId}},executionContext);
    expect(result.status).toBe("success");
    const proposal=result.output?.proposal as {warnings?:string[];operations?:Array<{payload?:Record<string,unknown>}>}|undefined;
    expect(proposal?.operations?.[0]?.payload).toMatchObject({action:"final_render",workflowId,checkpointId:"assembly-review-1",expectedWorkflowStatus:"waiting_review"});
    expect(proposal?.warnings?.join(" ")).toContain("FINAL_RENDER");
  });
});
