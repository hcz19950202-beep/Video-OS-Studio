import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {Project} from "@/schemas/project";
import {WorkflowActivitySchema} from "@/lib/workflows/activity";
import {WorkflowDefinitionRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowRunIdSchema,WorkflowRunSchema,type WorkflowRun} from "@/lib/workflows/schema";
import {FileWorkflowStore,WorkflowNotFoundError} from "@/lib/workflows/store";

export type WorkflowProjectReader={load:(projectId:string)=>Promise<Project>};

export const CreateWorkflowRunInputSchema=z.object({
  projectId:z.string().min(1),
  definitionId:z.string().min(1),
  definitionVersion:z.string().min(1),
  sourceAssetIds:z.array(z.string().min(1)).default([]),
  expectedProjectRevision:z.number().int().nonnegative().optional(),
  assetBaseUrl:z.string().url().optional(),
});
export type CreateWorkflowRunInput=z.infer<typeof CreateWorkflowRunInputSchema>;

export class WorkflowProjectRevisionConflictError extends Error{
  readonly code="WORKFLOW_PROJECT_REVISION_CONFLICT";
  readonly retryable=false;
  constructor(readonly expectedRevision:number,readonly currentRevision:number){
    super(`Workflow creation expected project revision ${expectedRevision}, but the current revision is ${currentRevision}.`);
    this.name="WorkflowProjectRevisionConflictError";
  }
}

export class WorkflowSourceAssetNotFoundError extends Error{
  readonly code="WORKFLOW_SOURCE_ASSET_NOT_FOUND";
  readonly retryable=false;
  constructor(readonly assetId:string){super(`Workflow source asset ${assetId} was not found in the project.`);this.name="WorkflowSourceAssetNotFoundError";}
}

const nowIso=()=>new Date().toISOString();

export class WorkflowService{
  private readonly startupRecovery:Promise<void>;

  constructor(
    readonly projects:WorkflowProjectReader,
    readonly store:FileWorkflowStore,
    readonly definitions:WorkflowDefinitionRegistry,
    readonly runner:WorkflowRunner,
  ){
    this.startupRecovery=this.runner.recover();
  }

  private ready(){return this.startupRecovery;}

  async create(input:CreateWorkflowRunInput):Promise<WorkflowRun>{
    await this.ready();
    const parsed=CreateWorkflowRunInputSchema.parse(input);
    const definition=this.definitions.get(parsed.definitionId,parsed.definitionVersion);
    const project=await this.projects.load(parsed.projectId);
    const revision=project.project.revision;
    if(parsed.expectedProjectRevision!==undefined&&parsed.expectedProjectRevision!==revision)throw new WorkflowProjectRevisionConflictError(parsed.expectedProjectRevision,revision);

    const assetIds=new Set(project.assets.map(asset=>asset.id));
    for(const assetId of parsed.sourceAssetIds)if(!assetIds.has(assetId))throw new WorkflowSourceAssetNotFoundError(assetId);

    const at=nowIso();
    const run=WorkflowRunSchema.parse({
      id:randomUUID(),
      definitionId:definition.id,
      definitionVersion:definition.version,
      projectId:project.project.id,
      createdAt:at,
      updatedAt:at,
      status:"pending",
      scenario:definition.scenario,
      sourceAssetIds:parsed.sourceAssetIds,
      assetBaseUrl:parsed.assetBaseUrl,
      canvasSnapshot:{width:project.canvas.width,height:project.canvas.height,fps:project.canvas.fps},
      stageExecutions:definition.stages.map(stage=>({stageId:stage.id,status:"pending",attempt:0,jobIds:[],operationIds:[],artifactIds:[]})),
      checkpoints:[],
      artifacts:[],
      lastKnownProjectRevision:revision,
    });
    const created=await this.store.create(run);
    await this.store.appendActivity(WorkflowActivitySchema.parse({id:randomUUID(),workflowId:created.id,at:nowIso(),event:"workflow-created",details:{definitionId:definition.id,definitionVersion:definition.version,projectRevision:revision,assetBaseUrl:parsed.assetBaseUrl}}));
    return created;
  }

  private async requireRun(workflowId:string){await this.ready();const id=WorkflowRunIdSchema.parse(workflowId);const run=await this.store.get(id);if(!run)throw new WorkflowNotFoundError(id);return run;}
  private async latestProjectRevision(workflowId:string){const run=await this.requireRun(workflowId);return(await this.projects.load(run.projectId)).project.revision;}

  async bindAssetBaseUrl(workflowId:string,assetBaseUrl:string){
    const id=WorkflowRunIdSchema.parse(workflowId);const url=z.string().url().parse(assetBaseUrl);
    return this.store.withRunLock(id,async()=>{
      const run=await this.requireRun(id);
      if(run.assetBaseUrl===url)return run;
      return this.store.save(WorkflowRunSchema.parse({...run,assetBaseUrl:url,updatedAt:nowIso()}));
    });
  }

  async get(workflowId:string){await this.ready();return this.store.get(WorkflowRunIdSchema.parse(workflowId));}
  async list(){await this.ready();return this.store.list();}
  async activity(workflowId:string){await this.ready();return this.store.readActivity(WorkflowRunIdSchema.parse(workflowId));}
  async start(workflowId:string){await this.ready();return this.runner.start(WorkflowRunIdSchema.parse(workflowId));}
  async pause(workflowId:string){await this.ready();return this.runner.pause(WorkflowRunIdSchema.parse(workflowId));}
  async resume(workflowId:string){await this.ready();const id=WorkflowRunIdSchema.parse(workflowId);return this.runner.resume(id,await this.latestProjectRevision(id));}
  async cancel(workflowId:string){await this.ready();return this.runner.cancel(WorkflowRunIdSchema.parse(workflowId));}
  async retryStage(workflowId:string,stageId:string){
    await this.ready();
    const id=WorkflowRunIdSchema.parse(workflowId);
    await this.store.withRunLock(id,async()=>{
      const run=await this.requireRun(id);
      const projectRevision=(await this.projects.load(run.projectId)).project.revision;
      if(projectRevision>run.lastKnownProjectRevision){
        await this.store.save(WorkflowRunSchema.parse({...run,lastKnownProjectRevision:projectRevision,updatedAt:nowIso()}));
      }
    });
    return this.runner.retryStage(id,stageId);
  }
  async replayFromStage(workflowId:string,stageId:string){await this.ready();const id=WorkflowRunIdSchema.parse(workflowId);return this.runner.replayFromStage(id,stageId,await this.latestProjectRevision(id));}
  async approveCheckpoint(workflowId:string,checkpointId:string){await this.ready();const id=WorkflowRunIdSchema.parse(workflowId);return this.runner.approveCheckpoint(id,checkpointId,await this.latestProjectRevision(id));}
  async recover(){await this.ready();return this.runner.recover();}
}
