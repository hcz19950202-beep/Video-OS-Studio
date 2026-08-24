import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {WorkflowDefinitionSchema,WorkflowRunSchema,type WorkflowDefinition,type WorkflowRun} from "@/lib/workflows/schema";

const definition=():WorkflowDefinition=>WorkflowDefinitionSchema.parse({
  id:"talking-head",
  version:"1",
  name:"Talking Head First Draft",
  scenario:"talking-head",
  entryStageIds:["media-import"],
  stages:[
    {id:"media-import",kind:"mutation",dependsOn:[],retryable:true,executorKey:"media-import"},
    {id:"transcribe",kind:"job",dependsOn:["media-import"],retryable:true,executorKey:"transcribe"},
    {id:"content-review",kind:"checkpoint",dependsOn:["transcribe"],retryable:false,reviewRequired:true,executorKey:"content-review"},
  ],
});

const run=():WorkflowRun=>{
  const at=new Date().toISOString();
  return WorkflowRunSchema.parse({
    id:randomUUID(),
    definitionId:"talking-head",
    definitionVersion:"1",
    projectId:"demo-project",
    createdAt:at,
    updatedAt:at,
    status:"pending",
    scenario:"talking-head",
    currentStageId:"media-import",
    sourceAssetIds:["asset-main"],
    canvasSnapshot:{width:1080,height:1920,fps:30},
    stageExecutions:[
      {stageId:"media-import",status:"pending",attempt:0},
      {stageId:"transcribe",status:"pending",attempt:0},
      {stageId:"content-review",status:"pending",attempt:0},
    ],
    checkpoints:[],
    artifacts:[],
    lastKnownProjectRevision:0,
  });
};

describe("V2.2 W0 workflow schemas",()=>{
  it("accepts a versioned workflow definition and applies safe defaults",()=>{
    const parsed=definition();
    expect(parsed).toMatchObject({id:"talking-head",version:"1",scenario:"talking-head",entryStageIds:["media-import"]});
    expect(parsed.stages[0]).toMatchObject({optional:false,reviewRequired:false,invalidates:[]});
  });

  it("rejects duplicate stage ids",()=>{
    const input=definition();
    const result=WorkflowDefinitionSchema.safeParse({...input,stages:[...input.stages,{...input.stages[0]}]});
    expect(result.success).toBe(false);
    if(!result.success)expect(result.error.issues.some(issue=>issue.message.includes("Duplicate workflow stage id"))).toBe(true);
  });

  it("rejects missing dependencies and invalidation targets",()=>{
    const input=definition();
    const stages=input.stages.map(stage=>stage.id==="transcribe"?{...stage,dependsOn:["missing-stage"],invalidates:["also-missing"]}:stage);
    const result=WorkflowDefinitionSchema.safeParse({...input,stages});
    expect(result.success).toBe(false);
    if(!result.success){
      expect(result.error.issues.some(issue=>issue.message.includes("depends on missing stage"))).toBe(true);
      expect(result.error.issues.some(issue=>issue.message.includes("invalidates missing stage"))).toBe(true);
    }
  });

  it("rejects dependency cycles even when the cycle is outside the entry path",()=>{
    const input=definition();
    const stages=[
      ...input.stages,
      {id:"cycle-a",kind:"analysis" as const,dependsOn:["cycle-b"],optional:false,retryable:true,reviewRequired:false,invalidates:[],executorKey:"cycle-a"},
      {id:"cycle-b",kind:"analysis" as const,dependsOn:["cycle-a"],optional:false,retryable:true,reviewRequired:false,invalidates:[],executorKey:"cycle-b"},
    ];
    const result=WorkflowDefinitionSchema.safeParse({...input,stages});
    expect(result.success).toBe(false);
    if(!result.success)expect(result.error.issues.some(issue=>issue.message.includes("dependency cycle"))).toBe(true);
  });

  it("rejects entry stages that are missing or depend on other stages",()=>{
    const input=definition();
    expect(WorkflowDefinitionSchema.safeParse({...input,entryStageIds:["missing"]}).success).toBe(false);
    expect(WorkflowDefinitionSchema.safeParse({...input,entryStageIds:["transcribe"]}).success).toBe(false);
  });

  it("rejects duplicate source assets, executions, checkpoints and artifacts in a run",()=>{
    const base=run();
    const at=new Date().toISOString();
    const result=WorkflowRunSchema.safeParse({
      ...base,
      sourceAssetIds:["asset-main","asset-main"],
      stageExecutions:[...base.stageExecutions,{...base.stageExecutions[0]}],
      checkpoints:[
        {id:"review-a",stageId:"content-review",status:"waiting_review",createdAt:at,baseProjectRevision:0},
        {id:"review-a",stageId:"content-review",status:"waiting_review",createdAt:at,baseProjectRevision:0},
      ],
      artifacts:[
        {id:"transcript-a",stageId:"transcribe",kind:"transcript",createdAt:at},
        {id:"transcript-a",stageId:"transcribe",kind:"transcript",createdAt:at},
      ],
    });
    expect(result.success).toBe(false);
    if(!result.success){
      const messages=result.error.issues.map(issue=>issue.message).join("\n");
      expect(messages).toContain("Duplicate source asset id");
      expect(messages).toContain("Duplicate stage execution");
      expect(messages).toContain("Duplicate checkpoint id");
      expect(messages).toContain("Duplicate workflow artifact id");
    }
  });

  it("rejects run references to missing stage executions",()=>{
    const base=run();
    const at=new Date().toISOString();
    const result=WorkflowRunSchema.safeParse({
      ...base,
      currentStageId:"not-executed",
      checkpoints:[{id:"review-a",stageId:"not-executed",status:"waiting_review",createdAt:at,baseProjectRevision:0}],
      artifacts:[{id:"artifact-a",stageId:"not-executed",kind:"other",createdAt:at}],
    });
    expect(result.success).toBe(false);
    if(!result.success){
      const messages=result.error.issues.map(issue=>issue.message).join("\n");
      expect(messages).toContain("does not exist in stage executions");
      expect(messages).toContain("references missing stage execution");
    }
  });
});
