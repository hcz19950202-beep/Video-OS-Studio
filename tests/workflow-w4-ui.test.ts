import {afterEach,describe,expect,it} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createProject} from "@/lib/project/factory";
import {JobRecordSchema,type CreateJobInput,type JobRecord} from "@/lib/jobs/schema";
import {CreateWorkflowRequestSchema,WorkflowActionRequestSchema} from "@/lib/workflows/http";
import {registerProductionWorkflowDefinitions} from "@/lib/workflows/production-definitions";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry,type WorkflowStageExecutionContext} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";
import {W4_WORKFLOW_DEFINITIONS,registerW4WorkflowDefinitions} from "@/lib/workflows/w4-definitions";
import {W4_FINAL_RENDER_EXECUTOR_KEY,registerW4WorkflowStages,type W4WorkflowJobRuntime} from "@/lib/workflows/w4-stages";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const projectFixture=()=>createProject({id:"w4-project",name:"W4",now:"2026-08-24T00:00:00.000Z",width:1920,height:1080,fps:30,durationInFrames:300});
const completedRenderJob=(id:string):JobRecord=>JobRecordSchema.parse({id,type:"render-final",projectId:"w4-project",status:"completed",stage:"completed",progress:1,attempt:1,input:{assetBaseUrl:"http://127.0.0.1:3000"},output:{outputRelativePath:`render/${id}.mp4`,mode:"final"},createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:01.000Z",startedAt:"2026-08-24T00:00:00.100Z",finishedAt:"2026-08-24T00:00:01.000Z"});

describe("V2.2 W4 user-facing workflow contract",()=>{
  it("registers version 2 production definitions with both human review gates",()=>{
    expect(W4_WORKFLOW_DEFINITIONS).toHaveLength(3);
    for(const definition of W4_WORKFLOW_DEFINITIONS){
      expect(definition.version).toBe("2");
      expect(definition.stages).toHaveLength(16);
      expect(definition.stages.map(stage=>stage.id)).toEqual(expect.arrayContaining(["CONTENT_REVIEW","ASSEMBLY_REVIEW","FINAL_RENDER"]));
      expect(definition.stages.find(stage=>stage.id==="CONTENT_REVIEW")?.kind).toBe("checkpoint");
      expect(definition.stages.find(stage=>stage.id==="ASSEMBLY_REVIEW")?.kind).toBe("checkpoint");
      expect(definition.stages.find(stage=>stage.id==="FINAL_RENDER")?.executorKey).toBe(W4_FINAL_RENDER_EXECUTOR_KEY);
    }
  });

  it("requires a real selected source asset at the HTTP boundary and validates UI actions",()=>{
    expect(()=>CreateWorkflowRequestSchema.parse({projectId:"demo",scenario:"talking-head",sourceAssetIds:[],expectedProjectRevision:0})).toThrow();
    expect(CreateWorkflowRequestSchema.parse({projectId:"demo",scenario:"product-ad",sourceAssetIds:["video-a"],expectedProjectRevision:7})).toMatchObject({scenario:"product-ad",expectedProjectRevision:7});
    expect(WorkflowActionRequestSchema.parse({action:"approve",checkpointId:"CONTENT_REVIEW"})).toEqual({action:"approve",checkpointId:"CONTENT_REVIEW"});
    expect(WorkflowActionRequestSchema.parse({action:"replay",stageId:"VISUAL_PLANNING"})).toEqual({action:"replay",stageId:"VISUAL_PLANNING"});
  });

  it("persists and refreshes the request asset origin outside Project JSON",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-w4-"));roots.push(root);
    const store=new FileWorkflowStore(root);
    const definitions=registerW4WorkflowDefinitions(registerProductionWorkflowDefinitions(new WorkflowDefinitionRegistry()));
    const runner=new WorkflowRunner(store,definitions,new WorkflowStageRegistry());
    const project=projectFixture();
    const service=new WorkflowService({load:async()=>project},store,definitions,runner);
    const created=await service.create({projectId:project.project.id,definitionId:"video-production-talking-head",definitionVersion:"2",sourceAssetIds:[],expectedProjectRevision:0,assetBaseUrl:"http://127.0.0.1:3017"});
    expect(created.assetBaseUrl).toBe("http://127.0.0.1:3017");
    const rebound=await service.bindAssetBaseUrl(created.id,"http://localhost:3018");
    expect(rebound.assetBaseUrl).toBe("http://localhost:3018");
    expect(project.project.revision).toBe(0);
  });

  it("creates a fresh final render after W3 invalidation instead of reusing a historical completed MP4",async()=>{
    const priorId="11111111-1111-4111-8111-111111111111";const nextId="22222222-2222-4222-8222-222222222222";const prior=completedRenderJob(priorId);let creates=0;let retries=0;
    const jobs:W4WorkflowJobRuntime={
      get:async(id:string)=>id===priorId?prior:null,
      cancel:async()=>prior,
      retry:async()=>{retries++;return prior;},
      create:async(input:CreateJobInput)=>{creates++;return JobRecordSchema.parse({id:nextId,type:"render-final",projectId:"w4-project",status:"queued",stage:"queued",progress:0,attempt:1,input:input.input,createdAt:"2026-08-24T00:00:02.000Z",updatedAt:"2026-08-24T00:00:02.000Z"});},
      getArtifacts:async()=>[],
    };
    const registry=registerW4WorkflowStages(new WorkflowStageRegistry(),{repository:{load:async()=>projectFixture()},jobs,fallbackAssetBaseUrl:"http://127.0.0.1:3000"});
    const definition=W4_WORKFLOW_DEFINITIONS[0];const stage=definition.stages.find(item=>item.id==="FINAL_RENDER")!;
    const run={id:"33333333-3333-4333-8333-333333333333",definitionId:definition.id,definitionVersion:definition.version,projectId:"w4-project",createdAt:"2026-08-24T00:00:00.000Z",updatedAt:"2026-08-24T00:00:00.000Z",status:"running" as const,scenario:"talking-head" as const,sourceAssetIds:[],assetBaseUrl:"http://127.0.0.1:3017",canvasSnapshot:{width:1920,height:1080,fps:30},stageExecutions:[],checkpoints:[],artifacts:[],lastKnownProjectRevision:5};
    const context={run,definition,stage,execution:{stageId:"FINAL_RENDER",status:"running" as const,attempt:2,jobIds:[priorId],operationIds:["old","new"],artifactIds:[]},attemptId:"44444444-4444-4444-8444-444444444444",operationId:"workflow:new",previousJobIds:[priorId]} as WorkflowStageExecutionContext;
    const result=await registry.get(W4_FINAL_RENDER_EXECUTOR_KEY).start(context);
    expect(result).toEqual({kind:"job",jobId:nextId});expect(creates).toBe(1);expect(retries).toBe(0);
  });
});
