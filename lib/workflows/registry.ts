import {WorkflowDefinitionSchema,type WorkflowArtifactReference,type WorkflowDefinition,type WorkflowRun,type WorkflowStageDefinition,type WorkflowStageExecution} from "@/lib/workflows/schema";
import type {JobRecord} from "@/lib/jobs/schema";

const definitionKey=(id:string,version:string)=>`${id}@${version}`;

export class WorkflowDefinitionNotFoundError extends Error{
  readonly code="WORKFLOW_DEFINITION_NOT_FOUND";
  constructor(readonly definitionId:string,readonly version:string){
    super(`Workflow definition ${definitionId}@${version} was not found.`);
    this.name="WorkflowDefinitionNotFoundError";
  }
}

export class WorkflowExecutorNotFoundError extends Error{
  readonly code="WORKFLOW_EXECUTOR_NOT_FOUND";
  constructor(readonly executorKey:string){
    super(`Workflow stage executor ${executorKey} was not found.`);
    this.name="WorkflowExecutorNotFoundError";
  }
}

export class WorkflowDefinitionRegistry{
  private readonly definitions=new Map<string,WorkflowDefinition>();

  register(definition:WorkflowDefinition){
    const parsed=WorkflowDefinitionSchema.parse(definition);
    const key=definitionKey(parsed.id,parsed.version);
    if(this.definitions.has(key))throw new Error(`Workflow definition ${key} is already registered.`);
    this.definitions.set(key,parsed);
    return parsed;
  }

  get(id:string,version:string){
    const definition=this.definitions.get(definitionKey(id,version));
    if(!definition)throw new WorkflowDefinitionNotFoundError(id,version);
    return definition;
  }

  list(){return [...this.definitions.values()];}
}

export type WorkflowStageExecutionContext={
  run:WorkflowRun;
  definition:WorkflowDefinition;
  stage:WorkflowStageDefinition;
  execution:WorkflowStageExecution;
  attemptId:string;
  operationId:string;
  previousJobIds:string[];
};

export type WorkflowStageCompletion={
  outputDigest?:string;
  artifacts?:WorkflowArtifactReference[];
  projectRevision?:number;
};

export type WorkflowStageStartResult=
  |({kind:"completed"}&WorkflowStageCompletion)
  |{kind:"job";jobId:string};

export type WorkflowStageJobReconcileResult=
  |WorkflowStageCompletion
  |{kind:"job";jobId:string};

export type WorkflowStageExecutor={
  start:(context:WorkflowStageExecutionContext)=>Promise<WorkflowStageStartResult>;
  reconcileJob?:(context:WorkflowStageExecutionContext,job:JobRecord)=>Promise<WorkflowStageJobReconcileResult>;
};

export class WorkflowStageRegistry{
  private readonly executors=new Map<string,WorkflowStageExecutor>();

  register(executorKey:string,executor:WorkflowStageExecutor){
    if(!executorKey.trim())throw new Error("Workflow executor key cannot be empty.");
    if(this.executors.has(executorKey))throw new Error(`Workflow stage executor ${executorKey} is already registered.`);
    this.executors.set(executorKey,executor);
    return executor;
  }

  get(executorKey:string){
    const executor=this.executors.get(executorKey);
    if(!executor)throw new WorkflowExecutorNotFoundError(executorKey);
    return executor;
  }

  has(executorKey:string){return this.executors.has(executorKey);}
}
