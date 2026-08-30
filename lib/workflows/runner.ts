import {createHash,randomUUID} from "node:crypto";
import {JobIdSchema,isTerminalJobStatus,type JobRecord} from "@/lib/jobs/schema";
import {WorkflowActivitySchema,type WorkflowActivityEvent} from "@/lib/workflows/activity";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry,type WorkflowStageCompletion,type WorkflowStageExecutionContext} from "@/lib/workflows/registry";
import {WorkflowArtifactReferenceSchema,WorkflowRunSchema,WorkflowStageExecutionSchema,type WorkflowDefinition,type WorkflowError,type WorkflowRun,type WorkflowStageDefinition,type WorkflowStageExecution} from "@/lib/workflows/schema";
import {assertWorkflowRunStatusTransition,assertWorkflowStageStatusTransition} from "@/lib/workflows/state-machine";
import {FileWorkflowStore,WorkflowNotFoundError} from "@/lib/workflows/store";

const nowIso=()=>new Date().toISOString();
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const completedDependencyStatuses=new Set(["completed","skipped"]);
const stableValue=(value:unknown):unknown=>Array.isArray(value)?value.map(stableValue):value&&typeof value==="object"?Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)])):value;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");

export type WorkflowJobRuntimePort={
  get:(jobId:string)=>Promise<JobRecord|null>;
  cancel:(jobId:string)=>Promise<JobRecord>;
  retry:(jobId:string)=>Promise<JobRecord>;
};
export type WorkflowRunnerOptions={jobPollIntervalMs?:number};

export class WorkflowRuntimeStateError extends Error{
  readonly code="WORKFLOW_INVALID_STATE";
  constructor(message:string,readonly workflowId:string){super(message);this.name="WorkflowRuntimeStateError";}
}

const normalizeError=(error:unknown,retryable:boolean):WorkflowError=>{
  if(error&&typeof error==="object"){
    const candidate=error as {code?:unknown;message?:unknown;retryable?:unknown;details?:unknown};
    if(typeof candidate.code==="string"&&typeof candidate.message==="string")return{
      code:candidate.code,
      message:candidate.message,
      retryable:typeof candidate.retryable==="boolean"?candidate.retryable:retryable,
      details:candidate.details&&typeof candidate.details==="object"?candidate.details as Record<string,unknown>:undefined,
    };
  }
  return{code:"WORKFLOW_STAGE_FAILED",message:error instanceof Error?error.message:String(error),retryable};
};

const replaceExecution=(run:WorkflowRun,execution:WorkflowStageExecution)=>run.stageExecutions.map(item=>item.stageId===execution.stageId?execution:item);
const getExecution=(run:WorkflowRun,stageId:string)=>{
  const execution=run.stageExecutions.find(item=>item.stageId===stageId);
  if(!execution)throw new WorkflowRuntimeStateError(`Workflow ${run.id} has no execution record for stage ${stageId}.`,run.id);
  return execution;
};
const stageInputDigest=(run:WorkflowRun,stage:WorkflowStageDefinition)=>digest({
  projectRevision:run.lastKnownProjectRevision,
  dependencies:stage.dependsOn.map(stageId=>{const execution=getExecution(run,stageId);return{stageId,status:execution.status,outputDigest:execution.outputDigest??null};}),
});
const collectInvalidationStageIds=(definition:WorkflowDefinition,startStageId:string)=>{
  const selected=new Set<string>([startStageId]);
  let changed=true;
  while(changed){
    changed=false;
    for(const stage of definition.stages){
      if(selected.has(stage.id))for(const explicit of stage.invalidates)if(!selected.has(explicit)){selected.add(explicit);changed=true;}
      if(!selected.has(stage.id)&&stage.dependsOn.some(dependency=>selected.has(dependency))){selected.add(stage.id);changed=true;}
    }
  }
  return definition.stages.map(stage=>stage.id).filter(stageId=>selected.has(stageId));
};
const invalidateExecution=(execution:WorkflowStageExecution,workflowId:string,clearDurableAttemptRefs=false)=>{
  if(execution.status==="running"||execution.status==="failed"||execution.status==="interrupted"||execution.status==="cancelled")throw new WorkflowRuntimeStateError(`Workflow stage ${execution.stageId} cannot be invalidated from ${execution.status}.`,workflowId);
  if(execution.status!=="invalidated")assertWorkflowStageStatusTransition(execution.status,"invalidated");
  const historicalJobIds=execution.historicalJobIds??[];const historicalOperationIds=execution.historicalOperationIds??[];
  return WorkflowStageExecutionSchema.parse({...execution,status:"invalidated",attemptId:undefined,startedAt:undefined,completedAt:undefined,baseProjectRevision:undefined,inputDigest:undefined,outputDigest:undefined,jobIds:clearDurableAttemptRefs?[]:execution.jobIds,operationIds:clearDurableAttemptRefs?[]:execution.operationIds,historicalJobIds:clearDurableAttemptRefs?[...historicalJobIds,...execution.jobIds]:execution.historicalJobIds,historicalOperationIds:clearDurableAttemptRefs?[...historicalOperationIds,...execution.operationIds]:execution.historicalOperationIds,artifactIds:[],error:undefined});
};

export class WorkflowRunner{
  private readonly runLocks=new Map<string,Promise<void>>();
  private readonly activeLoops=new Map<string,Promise<void>>();
  private readonly jobPollIntervalMs:number;

  constructor(
    readonly store:FileWorkflowStore,
    readonly definitions:WorkflowDefinitionRegistry,
    readonly stages:WorkflowStageRegistry,
    readonly jobs?:WorkflowJobRuntimePort,
    options:WorkflowRunnerOptions={},
  ){this.jobPollIntervalMs=Math.max(1,options.jobPollIntervalMs??250);}

  private async withRunLock<T>(workflowId:string,fn:()=>Promise<T>):Promise<T>{
    const previous=this.runLocks.get(workflowId)??Promise.resolve();
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const tail=previous.then(()=>gate);
    this.runLocks.set(workflowId,tail);
    await previous.catch(()=>undefined);
    try{return await fn();}
    finally{release();if(this.runLocks.get(workflowId)===tail)this.runLocks.delete(workflowId);}
  }

  private async withDurableRunLock<T>(workflowId:string,fn:()=>Promise<T>):Promise<T>{
    return this.store.withRunLock(workflowId,()=>this.withRunLock(workflowId,fn));
  }

  private async requireRun(workflowId:string,skipRunLock=false){const run=await this.store.get(workflowId,{skipRunLock});if(!run)throw new WorkflowNotFoundError(workflowId);return run;}
  private definitionFor(run:WorkflowRun){return this.definitions.get(run.definitionId,run.definitionVersion);}
  private async activity(workflowId:string,event:WorkflowActivityEvent,details:Partial<{stageId:string;jobId:string;data:Record<string,unknown>}>= {}){
    const record=WorkflowActivitySchema.parse({id:randomUUID(),workflowId,at:nowIso(),event,stageId:details.stageId,jobId:details.jobId,details:details.data});
    await this.store.appendActivity(record);return record;
  }
  private schedule(workflowId:string){
    if(this.activeLoops.has(workflowId))return;
    const loop=this.runLoop(workflowId).finally(()=>{if(this.activeLoops.get(workflowId)===loop)this.activeLoops.delete(workflowId);});
    this.activeLoops.set(workflowId,loop);
  }
  async waitForIdle(workflowId:string){for(;;){const loop=this.activeLoops.get(workflowId);if(!loop)return;await loop;}}

  async start(workflowId:string){
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);assertWorkflowRunStatusTransition(current.status,"running");
      return this.store.save(WorkflowRunSchema.parse({...current,status:"running",updatedAt:nowIso(),error:undefined}));
    });
    await this.activity(workflowId,"workflow-started");this.schedule(workflowId);return run;
  }

  async pause(workflowId:string){
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status!=="running")throw new WorkflowRuntimeStateError(`Workflow ${workflowId} can only be paused while running.`,workflowId);
      assertWorkflowRunStatusTransition(current.status,"paused");
      return this.store.save(WorkflowRunSchema.parse({...current,status:"paused",updatedAt:nowIso()}));
    });
    await this.activity(workflowId,"workflow-paused");return run;
  }

  async resume(workflowId:string,projectRevision?:number){
    const invalidatedStageIds:string[]=[];
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status!=="paused")throw new WorkflowRuntimeStateError(`Workflow ${workflowId} can only resume from paused.`,workflowId);
      const revision=projectRevision??current.lastKnownProjectRevision;
      if(revision<current.lastKnownProjectRevision)throw new WorkflowRuntimeStateError(`Workflow ${workflowId} cannot resume with project revision ${revision} behind ${current.lastKnownProjectRevision}.`,workflowId);
      let stageExecutions=current.stageExecutions;
      if(revision>current.lastKnownProjectRevision){
        stageExecutions=stageExecutions.map(execution=>{
          if(execution.status!=="ready")return execution;
          invalidatedStageIds.push(execution.stageId);return invalidateExecution(execution,workflowId);
        });
      }
      assertWorkflowRunStatusTransition(current.status,"running");
      return this.store.save(WorkflowRunSchema.parse({...current,status:"running",stageExecutions,lastKnownProjectRevision:revision,updatedAt:nowIso()}));
    });
    for(const stageId of invalidatedStageIds)await this.activity(workflowId,"stage-invalidated",{stageId,data:{reason:"project-revision-changed-on-resume",projectRevision:run.lastKnownProjectRevision}});
    await this.activity(workflowId,"workflow-resumed",{data:{projectRevision:run.lastKnownProjectRevision}});this.schedule(workflowId);return run;
  }

  async cancel(workflowId:string){
    const jobIds:string[]=[];
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status==="completed"||current.status==="cancelled")return current;
      assertWorkflowRunStatusTransition(current.status,"cancelled");
      let stageExecutions=current.stageExecutions;
      if(current.currentStageId){
        const execution=getExecution(current,current.currentStageId);jobIds.push(...execution.jobIds);
        if(["pending","ready","running","waiting_review","failed","interrupted"].includes(execution.status)){
          assertWorkflowStageStatusTransition(execution.status,"cancelled");
          const cancelled=WorkflowStageExecutionSchema.parse({...execution,status:"cancelled",completedAt:nowIso()});
          stageExecutions=replaceExecution(current,cancelled);
        }
      }
      return this.store.save(WorkflowRunSchema.parse({...current,status:"cancelled",stageExecutions,currentStageId:undefined,updatedAt:nowIso()}));
    });
    if(this.jobs)await Promise.all(jobIds.map(async jobId=>{try{await this.jobs!.cancel(jobId);}catch{return;}}));
    await this.activity(workflowId,"workflow-cancelled");return run;
  }

  async retryStage(workflowId:string,stageId:string){
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status!=="failed"&&current.status!=="interrupted")throw new WorkflowRuntimeStateError(`Workflow ${workflowId} is not in a retryable run state.`,workflowId);
      const definition=this.definitionFor(current);const stage=definition.stages.find(item=>item.id===stageId);
      if(!stage)throw new WorkflowRuntimeStateError(`Workflow ${workflowId} has no stage ${stageId}.`,workflowId);
      if(!stage.retryable)throw new WorkflowRuntimeStateError(`Workflow stage ${stageId} is not retryable.`,workflowId);
      const execution=getExecution(current,stageId);
      if(execution.status!=="failed"&&execution.status!=="interrupted")throw new WorkflowRuntimeStateError(`Workflow stage ${stageId} cannot retry from ${execution.status}.`,workflowId);
      assertWorkflowStageStatusTransition(execution.status,"ready");assertWorkflowRunStatusTransition(current.status,"running");
      const retried=WorkflowStageExecutionSchema.parse({...execution,status:"ready",attemptId:undefined,startedAt:undefined,completedAt:undefined,baseProjectRevision:undefined,inputDigest:undefined,outputDigest:undefined,artifactIds:[],error:undefined});
      return this.store.save(WorkflowRunSchema.parse({...current,status:"running",stageExecutions:replaceExecution(current,retried),currentStageId:undefined,error:undefined,updatedAt:nowIso()}));
    });
    await this.activity(workflowId,"stage-retried",{stageId});this.schedule(workflowId);return run;
  }

  async replayFromStage(workflowId:string,stageId:string,projectRevision:number){
    const invalidatedStageIds:string[]=[];const supersededCheckpointIds:string[]=[];
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status!=="waiting_review")throw new WorkflowRuntimeStateError(`Workflow ${workflowId} can only replay completed work while waiting for review.`,workflowId);
      if(projectRevision<current.lastKnownProjectRevision)throw new WorkflowRuntimeStateError(`Workflow ${workflowId} cannot replay from project revision ${projectRevision} behind ${current.lastKnownProjectRevision}.`,workflowId);
      const definition=this.definitionFor(current);const stage=definition.stages.find(item=>item.id===stageId);
      if(!stage)throw new WorkflowRuntimeStateError(`Workflow ${workflowId} has no stage ${stageId}.`,workflowId);
      if(!stage.retryable)throw new WorkflowRuntimeStateError(`Workflow stage ${stageId} is not replayable.`,workflowId);
      const activeCheckpoint=current.checkpoints.find(item=>item.status==="waiting_review");
      if(!activeCheckpoint)throw new WorkflowRuntimeStateError(`Workflow ${workflowId} has no active review checkpoint.`,workflowId);
      const invalidationIds=collectInvalidationStageIds(definition,stageId);
      if(!invalidationIds.includes(activeCheckpoint.stageId))throw new WorkflowRuntimeStateError(`Workflow stage ${stageId} is downstream of the active review checkpoint and cannot be replayed from this review.`,workflowId);
      const invalidationSet=new Set(invalidationIds);invalidatedStageIds.push(...invalidationIds);
      const stageExecutions=current.stageExecutions.map(execution=>invalidationSet.has(execution.stageId)?invalidateExecution(execution,workflowId,true):execution);
      const at=nowIso();
      const checkpoints=current.checkpoints.map(checkpoint=>{
        if(!invalidationSet.has(checkpoint.stageId)||(checkpoint.status!=="waiting_review"&&checkpoint.status!=="approved"))return checkpoint;
        supersededCheckpointIds.push(checkpoint.id);return{...checkpoint,status:"superseded" as const,resolvedAt:checkpoint.resolvedAt??at,resolvedProjectRevision:checkpoint.resolvedProjectRevision??projectRevision};
      });
      assertWorkflowRunStatusTransition(current.status,"running");
      return this.store.save(WorkflowRunSchema.parse({...current,status:"running",stageExecutions,checkpoints,artifacts:current.artifacts.filter(artifact=>!invalidationSet.has(artifact.stageId)),currentStageId:undefined,lastKnownProjectRevision:projectRevision,error:undefined,updatedAt:at}));
    });
    for(const invalidatedStageId of invalidatedStageIds)await this.activity(workflowId,"stage-invalidated",{stageId:invalidatedStageId,data:{reason:"human-review-replay",replayFromStageId:stageId,projectRevision}});
    for(const checkpointId of supersededCheckpointIds)await this.activity(workflowId,"review-superseded",{data:{checkpointId,replayFromStageId:stageId,projectRevision}});
    this.schedule(workflowId);return run;
  }

  async approveCheckpoint(workflowId:string,checkpointId:string,projectRevision?:number){
    let approvedStageId:string|undefined;const invalidatedStageIds:string[]=[];
    const run=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);
      if(current.status!=="waiting_review")throw new WorkflowRuntimeStateError(`Workflow ${workflowId} is not waiting for review.`,workflowId);
      const checkpoint=current.checkpoints.find(item=>item.id===checkpointId);
      if(!checkpoint||checkpoint.status!=="waiting_review")throw new WorkflowRuntimeStateError(`Workflow checkpoint ${checkpointId} is not waiting for review.`,workflowId);
      approvedStageId=checkpoint.stageId;
      const execution=getExecution(current,checkpoint.stageId);
      if(execution.status!=="waiting_review")throw new WorkflowRuntimeStateError(`Workflow stage ${checkpoint.stageId} is not waiting for review.`,workflowId);
      const revision=projectRevision??current.lastKnownProjectRevision;
      if(revision<checkpoint.baseProjectRevision||revision<current.lastKnownProjectRevision)throw new WorkflowRuntimeStateError(`Workflow checkpoint ${checkpointId} cannot approve project revision ${revision} behind its review base.`,workflowId);
      let stageExecutions=current.stageExecutions;
      if(revision>current.lastKnownProjectRevision){
        stageExecutions=stageExecutions.map(item=>{
          if(item.status!=="ready")return item;
          invalidatedStageIds.push(item.stageId);return invalidateExecution(item,workflowId);
        });
      }
      assertWorkflowStageStatusTransition(execution.status,"completed");assertWorkflowRunStatusTransition(current.status,"running");
      const at=nowIso();const completedExecution=WorkflowStageExecutionSchema.parse({...execution,status:"completed",completedAt:at,outputDigest:digest({inputDigest:execution.inputDigest??null,approvedProjectRevision:revision}),error:undefined});
      stageExecutions=stageExecutions.map(item=>item.stageId===checkpoint.stageId?completedExecution:item);
      const checkpoints=current.checkpoints.map(item=>item.id===checkpointId?{...item,status:"approved" as const,resolvedAt:at,resolvedProjectRevision:revision}:item);
      return this.store.save(WorkflowRunSchema.parse({...current,status:"running",stageExecutions,checkpoints,currentStageId:undefined,lastKnownProjectRevision:revision,error:undefined,updatedAt:at}));
    });
    for(const stageId of invalidatedStageIds)await this.activity(workflowId,"stage-invalidated",{stageId,data:{reason:"project-revision-changed-during-review",projectRevision:run.lastKnownProjectRevision}});
    await this.activity(workflowId,"review-approved",{stageId:approvedStageId,data:{checkpointId,resolvedProjectRevision:run.lastKnownProjectRevision,projectChanged:run.checkpoints.find(item=>item.id===checkpointId)?.baseProjectRevision!==run.lastKnownProjectRevision}});this.schedule(workflowId);return run;
  }

  async recover(){
    const processStartedAt=(await this.store.runtimeOwner.claimRuntimeOwner()).runtimeStartedAt;
    for(const run of await this.store.list()){
      if(run.status!=="running")continue;
      const active=run.currentStageId?getExecution(run,run.currentStageId):run.stageExecutions.find(item=>item.status==="running");
      const activeStartedAt=active?.startedAt?Date.parse(active.startedAt):Date.parse(run.updatedAt);
      if(active?.status==="running"&&active.jobIds.length===0&&Number.isFinite(activeStartedAt)&&activeStartedAt<processStartedAt){
        await this.markInterrupted(run.id,active.stageId,{code:"WORKFLOW_STAGE_INTERRUPTED",message:"The Video OS process stopped while a non-job workflow stage was active.",retryable:true});continue;
      }
      this.schedule(run.id);
    }
  }

  private async runLoop(workflowId:string){
    for(;;){
      let run=await this.requireRun(workflowId);if(run.status!=="running")return;
      const definition=this.definitionFor(run);const active=run.stageExecutions.find(item=>item.status==="running");
      if(active){if(active.jobIds.length===0)return;await this.reconcileJobStage(run,definition,active);continue;}
      run=await this.markReadyStages(run,definition);if(run.status!=="running")return;
      if(run.stageExecutions.every(item=>item.status==="completed"||item.status==="skipped")){await this.completeWorkflow(run.id);return;}
      const readyStage=definition.stages.find(stage=>getExecution(run,stage.id).status==="ready");if(!readyStage)return;
      if(readyStage.kind==="checkpoint"){await this.enterCheckpoint(run,readyStage);return;}
      await this.executeStage(run,definition,readyStage);
    }
  }

  private async markReadyStages(run:WorkflowRun,definition:WorkflowDefinition){
    const readyStageIds:string[]=[];
    const updated=await this.withDurableRunLock(run.id,async()=>{
      const current=await this.requireRun(run.id,true);if(current.status!=="running")return current;let stageExecutions=current.stageExecutions;
      for(const stage of definition.stages){
        const execution=stageExecutions.find(item=>item.stageId===stage.id);if(!execution||(execution.status!=="pending"&&execution.status!=="invalidated"))continue;
        const dependenciesReady=stage.dependsOn.every(dependencyId=>{const dependency=stageExecutions.find(item=>item.stageId===dependencyId);return dependency!==undefined&&completedDependencyStatuses.has(dependency.status);});
        if(!dependenciesReady)continue;
        let pending=execution;
        if(execution.status==="invalidated"){assertWorkflowStageStatusTransition(execution.status,"pending");pending=WorkflowStageExecutionSchema.parse({...execution,status:"pending"});}
        assertWorkflowStageStatusTransition(pending.status,"ready");const ready=WorkflowStageExecutionSchema.parse({...pending,status:"ready"});
        stageExecutions=stageExecutions.map(item=>item.stageId===stage.id?ready:item);readyStageIds.push(stage.id);
      }
      if(!readyStageIds.length)return current;
      return this.store.save(WorkflowRunSchema.parse({...current,stageExecutions,updatedAt:nowIso()}));
    });
    for(const stageId of readyStageIds)await this.activity(run.id,"stage-ready",{stageId});return updated;
  }

  private async executeStage(run:WorkflowRun,definition:WorkflowDefinition,stage:WorkflowStageDefinition){
    const attemptId=randomUUID();const operationId=`workflow:${run.id}:stage:${stage.id}:attempt:${attemptId}`;
    const started=await this.withDurableRunLock(run.id,async()=>{
      const current=await this.requireRun(run.id,true);if(current.status!=="running")return null;
      const execution=getExecution(current,stage.id);if(execution.status!=="ready")return null;
      assertWorkflowStageStatusTransition(execution.status,"running");const previousJobIds=[...execution.jobIds];
      const running=WorkflowStageExecutionSchema.parse({...execution,status:"running",attempt:execution.attempt+1,attemptId,startedAt:nowIso(),completedAt:undefined,baseProjectRevision:current.lastKnownProjectRevision,inputDigest:stageInputDigest(current,stage),outputDigest:undefined,jobIds:previousJobIds,artifactIds:[],operationIds:[...execution.operationIds,operationId],error:undefined});
      const updated=await this.store.save(WorkflowRunSchema.parse({...current,stageExecutions:replaceExecution(current,running),currentStageId:stage.id,updatedAt:nowIso()}));
      return{run:updated,execution:running,previousJobIds};
    });
    if(!started)return;await this.activity(run.id,"stage-started",{stageId:stage.id,data:{attempt:started.execution.attempt,attemptId,operationId,inputDigest:started.execution.inputDigest}});
    const executor=this.stages.get(stage.executorKey);const context:WorkflowStageExecutionContext={run:started.run,definition,stage,execution:started.execution,attemptId,operationId,previousJobIds:started.previousJobIds};
    try{
      const result=await executor.start(context);
      if(result.kind==="completed"){await this.completeStage(run.id,stage.id,result);return;}
      const jobId=JobIdSchema.parse(result.jobId);const attached=await this.attachJob(run.id,stage.id,jobId);
      if(!attached){await this.cancelUnattachedJob(jobId);return;}
      const latest=await this.requireRun(run.id);if(latest.status==="running")await this.reconcileJobStage(latest,definition,getExecution(latest,stage.id));
    }catch(error){await this.failStage(run.id,stage,error);}
  }

  private async cancelUnattachedJob(jobId:string){if(!this.jobs)return;try{await this.jobs.cancel(jobId);}catch{return;}}

  private async attachJob(workflowId:string,stageId:string,jobId:string){
    let accepted=false;let changed=false;
    await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);const execution=getExecution(current,stageId);
      if(!["running","paused"].includes(current.status)||execution.status!=="running")return;
      accepted=true;
      if(execution.jobIds.includes(jobId))return;
      changed=true;
      const attached=WorkflowStageExecutionSchema.parse({...execution,jobIds:[...execution.jobIds,jobId]});
      await this.store.save(WorkflowRunSchema.parse({...current,stageExecutions:replaceExecution(current,attached),updatedAt:nowIso()}));
    });
    if(changed)await this.activity(workflowId,"job-attached",{stageId,jobId});
    return accepted;
  }

  private async reconcileJobStage(run:WorkflowRun,definition:WorkflowDefinition,execution:WorkflowStageExecution){
    const stage=definition.stages.find(item=>item.id===execution.stageId);
    if(!stage)throw new WorkflowRuntimeStateError(`Workflow ${run.id} definition has no stage ${execution.stageId}.`,run.id);
    if(!this.jobs){await this.failStage(run.id,stage,{code:"WORKFLOW_JOB_RUNTIME_UNAVAILABLE",message:"Workflow job runtime is unavailable.",retryable:true});return;}
    const jobId=execution.jobIds[execution.jobIds.length-1];if(!jobId)return;let job:JobRecord|null=null;
    for(;;){
      const latestRun=await this.requireRun(run.id);if(latestRun.status==="cancelled")return;
      job=await this.jobs.get(jobId);
      if(!job){await this.failStage(run.id,stage,{code:"WORKFLOW_JOB_NOT_FOUND",message:`Workflow job ${jobId} was not found.`,retryable:true});return;}
      if(isTerminalJobStatus(job.status))break;await sleep(this.jobPollIntervalMs);
    }
    if(job.status==="completed"){
      try{
        const latest=await this.requireRun(run.id);if(latest.status==="paused")return;if(latest.status!=="running")return;
        const executor=this.stages.get(stage.executorKey);const currentExecution=getExecution(latest,stage.id);
        const attemptId=currentExecution.attemptId;const operationId=currentExecution.operationIds[currentExecution.operationIds.length-1];
        if(!attemptId||!operationId)throw new WorkflowRuntimeStateError(`Workflow stage ${stage.id} is missing durable attempt identity.`,run.id);
        const reconciliation=executor.reconcileJob?await executor.reconcileJob({run:latest,definition,stage,execution:currentExecution,attemptId,operationId,previousJobIds:currentExecution.jobIds.slice(0,-1)},job):{};
        if("kind" in reconciliation&&reconciliation.kind==="job"){
          const nextJobId=JobIdSchema.parse(reconciliation.jobId);const attached=await this.attachJob(run.id,stage.id,nextJobId);
          if(!attached)await this.cancelUnattachedJob(nextJobId);
          return;
        }
        await this.completeStage(run.id,stage.id,reconciliation as WorkflowStageCompletion);
      }catch(error){await this.failStage(run.id,stage,error);}
      return;
    }
    if(job.status==="interrupted"){
      await this.markInterrupted(run.id,stage.id,{code:job.error?.code??"WORKFLOW_JOB_INTERRUPTED",message:job.error?.message??`Workflow job ${jobId} was interrupted.`,retryable:stage.retryable&&job.error?.retryable!==false,details:{jobId}});return;
    }
    await this.failStage(run.id,stage,{code:job.error?.code??"WORKFLOW_JOB_FAILED",message:job.error?.message??`Workflow job ${jobId} ended in ${job.status}.`,retryable:stage.retryable&&job.error?.retryable!==false,details:{jobId,jobStatus:job.status}});
  }

  private async completeStage(workflowId:string,stageId:string,completion:WorkflowStageCompletion){
    const parsedArtifacts=(completion.artifacts??[]).map(artifact=>WorkflowArtifactReferenceSchema.parse(artifact));
    for(const artifact of parsedArtifacts)if(artifact.stageId!==stageId)throw new WorkflowRuntimeStateError(`Workflow artifact ${artifact.id} belongs to ${artifact.stageId}, expected ${stageId}.`,workflowId);
    let changed=false;
    const completed=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);const execution=getExecution(current,stageId);if(execution.status!=="running")return current;
      assertWorkflowStageStatusTransition(execution.status,"completed");const at=nowIso();changed=true;
      const done=WorkflowStageExecutionSchema.parse({...execution,status:"completed",completedAt:at,outputDigest:completion.outputDigest,artifactIds:parsedArtifacts.map(item=>item.id),error:undefined});
      const artifacts=[...current.artifacts.filter(item=>item.stageId!==stageId),...parsedArtifacts];
      const lastKnownProjectRevision=completion.projectRevision===undefined?current.lastKnownProjectRevision:Math.max(current.lastKnownProjectRevision,completion.projectRevision);
      return this.store.save(WorkflowRunSchema.parse({...current,stageExecutions:replaceExecution(current,done),artifacts,lastKnownProjectRevision,currentStageId:current.currentStageId===stageId?undefined:current.currentStageId,updatedAt:at}));
    });
    if(changed)await this.activity(workflowId,"stage-completed",{stageId});return completed;
  }

  private async failStage(workflowId:string,stage:WorkflowStageDefinition,error:unknown){
    const normalized=normalizeError(error,stage.retryable);let changed=false;
    const failed=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);if(current.status==="cancelled"||current.status==="completed")return current;
      if(current.status!=="running"&&current.status!=="paused")return current;
      const execution=getExecution(current,stage.id);if(execution.status!=="running")return current;
      assertWorkflowStageStatusTransition(execution.status,"failed");assertWorkflowRunStatusTransition(current.status,"failed");const at=nowIso();changed=true;
      const failedExecution=WorkflowStageExecutionSchema.parse({...execution,status:"failed",completedAt:at,error:normalized});
      return this.store.save(WorkflowRunSchema.parse({...current,status:"failed",stageExecutions:replaceExecution(current,failedExecution),currentStageId:stage.id,error:normalized,updatedAt:at}));
    });
    if(changed){await this.activity(workflowId,"stage-failed",{stageId:stage.id,data:{code:normalized.code,retryable:normalized.retryable}});await this.activity(workflowId,"workflow-failed",{stageId:stage.id,data:{code:normalized.code}});}return failed;
  }

  private async markInterrupted(workflowId:string,stageId:string,error:WorkflowError){
    let changed=false;
    const interrupted=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);if(current.status!=="running"&&current.status!=="paused")return current;
      const execution=getExecution(current,stageId);if(execution.status!=="running")return current;
      assertWorkflowStageStatusTransition(execution.status,"interrupted");assertWorkflowRunStatusTransition(current.status,"interrupted");const at=nowIso();changed=true;
      const interruptedExecution=WorkflowStageExecutionSchema.parse({...execution,status:"interrupted",completedAt:at,error});
      return this.store.save(WorkflowRunSchema.parse({...current,status:"interrupted",stageExecutions:replaceExecution(current,interruptedExecution),currentStageId:stageId,error,updatedAt:at}));
    });
    if(changed){await this.activity(workflowId,"stage-interrupted",{stageId,data:{code:error.code}});await this.activity(workflowId,"workflow-interrupted",{stageId,data:{code:error.code}});}return interrupted;
  }

  private async enterCheckpoint(run:WorkflowRun,stage:WorkflowStageDefinition){
    const checkpointId=randomUUID();
    const waiting=await this.withDurableRunLock(run.id,async()=>{
      const current=await this.requireRun(run.id,true);if(current.status!=="running")return current;const execution=getExecution(current,stage.id);if(execution.status!=="ready")return current;
      assertWorkflowStageStatusTransition(execution.status,"running");assertWorkflowStageStatusTransition("running","waiting_review");assertWorkflowRunStatusTransition(current.status,"waiting_review");
      const at=nowIso();const reviewExecution=WorkflowStageExecutionSchema.parse({...execution,status:"waiting_review",attempt:execution.attempt+1,attemptId:randomUUID(),startedAt:at,baseProjectRevision:current.lastKnownProjectRevision,inputDigest:stageInputDigest(current,stage),error:undefined});
      const checkpoint={id:checkpointId,stageId:stage.id,status:"waiting_review" as const,createdAt:at,baseProjectRevision:current.lastKnownProjectRevision};
      return this.store.save(WorkflowRunSchema.parse({...current,status:"waiting_review",stageExecutions:replaceExecution(current,reviewExecution),checkpoints:[...current.checkpoints,checkpoint],currentStageId:stage.id,updatedAt:at}));
    });
    if(waiting.status==="waiting_review")await this.activity(run.id,"review-requested",{stageId:stage.id,data:{checkpointId,baseProjectRevision:waiting.lastKnownProjectRevision}});return waiting;
  }

  private async completeWorkflow(workflowId:string){
    let changed=false;
    const completed=await this.withDurableRunLock(workflowId,async()=>{
      const current=await this.requireRun(workflowId,true);if(current.status!=="running")return current;
      if(!current.stageExecutions.every(item=>item.status==="completed"||item.status==="skipped"))return current;
      assertWorkflowRunStatusTransition(current.status,"completed");changed=true;
      return this.store.save(WorkflowRunSchema.parse({...current,status:"completed",currentStageId:undefined,error:undefined,updatedAt:nowIso()}));
    });
    if(changed)await this.activity(workflowId,"workflow-completed");return completed;
  }
}
