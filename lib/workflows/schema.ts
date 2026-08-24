import {z} from "zod";
import {ProjectIdSchema} from "@/schemas/project";

const SlugIdSchema=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/,"IDs may contain only letters, numbers, underscores, and hyphens");

export const WorkflowRunIdSchema=z.string().uuid();
export const WorkflowDefinitionIdSchema=SlugIdSchema;
export const WorkflowDefinitionVersionSchema=z.string().min(1).max(64);
export const WorkflowStageIdSchema=SlugIdSchema;
export const WorkflowCheckpointIdSchema=SlugIdSchema;
export const WorkflowArtifactIdSchema=SlugIdSchema;

export const WorkflowScenarioSchema=z.enum(["talking-head","product-ad","explainer"]);
export type WorkflowScenario=z.infer<typeof WorkflowScenarioSchema>;

export const WorkflowRunStatusSchema=z.enum(["pending","running","waiting_review","paused","completed","failed","cancelled","interrupted"]);
export type WorkflowRunStatus=z.infer<typeof WorkflowRunStatusSchema>;

export const WorkflowStageKindSchema=z.enum(["analysis","job","mutation","checkpoint","render"]);
export type WorkflowStageKind=z.infer<typeof WorkflowStageKindSchema>;

export const WorkflowStageStatusSchema=z.enum(["pending","ready","running","waiting_review","completed","failed","cancelled","interrupted","skipped","invalidated"]);
export type WorkflowStageStatus=z.infer<typeof WorkflowStageStatusSchema>;

export const WorkflowCheckpointStatusSchema=z.enum(["pending","waiting_review","approved","rejected","superseded"]);
export type WorkflowCheckpointStatus=z.infer<typeof WorkflowCheckpointStatusSchema>;

export const WorkflowArtifactKindSchema=z.enum(["transcript","script-analysis","scene-plan","caption-plan","visual-plan","motion","preview","final-render","other"]);
export type WorkflowArtifactKind=z.infer<typeof WorkflowArtifactKindSchema>;

export const WorkflowErrorSchema=z.object({
  code:z.string().min(1),
  message:z.string().min(1),
  retryable:z.boolean(),
  details:z.record(z.string(),z.unknown()).optional(),
});
export type WorkflowError=z.infer<typeof WorkflowErrorSchema>;

export const WorkflowStageDefinitionSchema=z.object({
  id:WorkflowStageIdSchema,
  kind:WorkflowStageKindSchema,
  dependsOn:z.array(WorkflowStageIdSchema).default([]),
  optional:z.boolean().default(false),
  retryable:z.boolean(),
  reviewRequired:z.boolean().default(false),
  invalidates:z.array(WorkflowStageIdSchema).default([]),
  executorKey:z.string().min(1).max(128),
});
export type WorkflowStageDefinition=z.infer<typeof WorkflowStageDefinitionSchema>;

const addDefinitionIssue=(ctx:z.RefinementCtx,path:(string|number)[],message:string)=>ctx.addIssue({code:"custom",path,message});

export const WorkflowDefinitionSchema=z.object({
  id:WorkflowDefinitionIdSchema,
  version:WorkflowDefinitionVersionSchema,
  name:z.string().min(1).max(200),
  scenario:WorkflowScenarioSchema,
  stages:z.array(WorkflowStageDefinitionSchema).min(1),
  entryStageIds:z.array(WorkflowStageIdSchema).min(1),
  metadata:z.object({description:z.string().max(2000).optional()}).optional(),
}).superRefine((definition,ctx)=>{
  const stageIndexById=new Map<string,number>();
  for(const[index,stage]of definition.stages.entries()){
    if(stageIndexById.has(stage.id))addDefinitionIssue(ctx,["stages",index,"id"],`Duplicate workflow stage id ${stage.id}`);
    else stageIndexById.set(stage.id,index);
  }

  const stageIds=new Set(stageIndexById.keys());
  for(const[index,stage]of definition.stages.entries()){
    const seenDependencies=new Set<string>();
    for(const[dependencyIndex,dependencyId]of stage.dependsOn.entries()){
      if(seenDependencies.has(dependencyId))addDefinitionIssue(ctx,["stages",index,"dependsOn",dependencyIndex],`Duplicate dependency ${dependencyId}`);
      seenDependencies.add(dependencyId);
      if(dependencyId===stage.id)addDefinitionIssue(ctx,["stages",index,"dependsOn",dependencyIndex],`Stage ${stage.id} cannot depend on itself`);
      else if(!stageIds.has(dependencyId))addDefinitionIssue(ctx,["stages",index,"dependsOn",dependencyIndex],`Stage ${stage.id} depends on missing stage ${dependencyId}`);
    }

    const seenInvalidations=new Set<string>();
    for(const[invalidationIndex,invalidationId]of stage.invalidates.entries()){
      if(seenInvalidations.has(invalidationId))addDefinitionIssue(ctx,["stages",index,"invalidates",invalidationIndex],`Duplicate invalidation target ${invalidationId}`);
      seenInvalidations.add(invalidationId);
      if(invalidationId===stage.id)addDefinitionIssue(ctx,["stages",index,"invalidates",invalidationIndex],`Stage ${stage.id} cannot invalidate itself`);
      else if(!stageIds.has(invalidationId))addDefinitionIssue(ctx,["stages",index,"invalidates",invalidationIndex],`Stage ${stage.id} invalidates missing stage ${invalidationId}`);
    }
  }

  const seenEntries=new Set<string>();
  for(const[index,stageId]of definition.entryStageIds.entries()){
    if(seenEntries.has(stageId))addDefinitionIssue(ctx,["entryStageIds",index],`Duplicate entry stage ${stageId}`);
    seenEntries.add(stageId);
    if(!stageIds.has(stageId))addDefinitionIssue(ctx,["entryStageIds",index],`Entry stage ${stageId} does not exist`);
    else{
      const stage=definition.stages[stageIndexById.get(stageId)!];
      if(stage.dependsOn.length)addDefinitionIssue(ctx,["entryStageIds",index],`Entry stage ${stageId} cannot have dependencies`);
    }
  }

  const visiting=new Set<string>();
  const visited=new Set<string>();
  const visit=(stageId:string,path:string[]):boolean=>{
    if(visiting.has(stageId)){
      const stageIndex=stageIndexById.get(stageId);
      addDefinitionIssue(ctx,stageIndex===undefined?["stages"]:["stages",stageIndex,"dependsOn"],`Workflow dependency cycle detected: ${[...path,stageId].join(" -> ")}`);
      return true;
    }
    if(visited.has(stageId))return false;
    visiting.add(stageId);
    const stage=definition.stages[stageIndexById.get(stageId)!];
    let foundCycle=false;
    for(const dependencyId of stage.dependsOn)if(stageIds.has(dependencyId)&&visit(dependencyId,[...path,stageId]))foundCycle=true;
    visiting.delete(stageId);
    visited.add(stageId);
    return foundCycle;
  };
  for(const stageId of stageIds)visit(stageId,[]);
});
export type WorkflowDefinition=z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowStageExecutionSchema=z.object({
  stageId:WorkflowStageIdSchema,
  status:WorkflowStageStatusSchema,
  attempt:z.number().int().nonnegative(),
  attemptId:z.string().uuid().optional(),
  startedAt:z.string().datetime().optional(),
  completedAt:z.string().datetime().optional(),
  baseProjectRevision:z.number().int().nonnegative().optional(),
  inputDigest:z.string().min(1).optional(),
  outputDigest:z.string().min(1).optional(),
  jobIds:z.array(z.string().uuid()).default([]),
  operationIds:z.array(z.string().min(1)).default([]),
  artifactIds:z.array(WorkflowArtifactIdSchema).default([]),
  error:WorkflowErrorSchema.optional(),
});
export type WorkflowStageExecution=z.infer<typeof WorkflowStageExecutionSchema>;

export const WorkflowCheckpointSchema=z.object({
  id:WorkflowCheckpointIdSchema,
  stageId:WorkflowStageIdSchema,
  status:WorkflowCheckpointStatusSchema,
  createdAt:z.string().datetime(),
  resolvedAt:z.string().datetime().optional(),
  baseProjectRevision:z.number().int().nonnegative(),
  resolvedProjectRevision:z.number().int().nonnegative().optional(),
});
export type WorkflowCheckpoint=z.infer<typeof WorkflowCheckpointSchema>;

export const WorkflowArtifactReferenceSchema=z.object({
  id:WorkflowArtifactIdSchema,
  stageId:WorkflowStageIdSchema,
  kind:WorkflowArtifactKindSchema,
  createdAt:z.string().datetime(),
  projectRevision:z.number().int().nonnegative().optional(),
  jobId:z.string().uuid().optional(),
  logicalAssetId:z.string().min(1).optional(),
  relativePath:z.string().min(1).optional(),
  digest:z.string().min(1).optional(),
});
export type WorkflowArtifactReference=z.infer<typeof WorkflowArtifactReferenceSchema>;

export const WorkflowCanvasSnapshotSchema=z.object({
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  fps:z.number().int().positive(),
});
export type WorkflowCanvasSnapshot=z.infer<typeof WorkflowCanvasSnapshotSchema>;

export const WorkflowRunSchema=z.object({
  id:WorkflowRunIdSchema,
  definitionId:WorkflowDefinitionIdSchema,
  definitionVersion:WorkflowDefinitionVersionSchema,
  projectId:ProjectIdSchema,
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
  status:WorkflowRunStatusSchema,
  scenario:WorkflowScenarioSchema,
  currentStageId:WorkflowStageIdSchema.optional(),
  sourceAssetIds:z.array(z.string().min(1)).default([]),
  assetBaseUrl:z.string().url().optional(),
  canvasSnapshot:WorkflowCanvasSnapshotSchema,
  stageExecutions:z.array(WorkflowStageExecutionSchema).default([]),
  checkpoints:z.array(WorkflowCheckpointSchema).default([]),
  artifacts:z.array(WorkflowArtifactReferenceSchema).default([]),
  lastKnownProjectRevision:z.number().int().nonnegative(),
  error:WorkflowErrorSchema.optional(),
}).superRefine((run,ctx)=>{
  const stageIds=new Set<string>();
  for(const[index,execution]of run.stageExecutions.entries()){
    if(stageIds.has(execution.stageId))ctx.addIssue({code:"custom",path:["stageExecutions",index,"stageId"],message:`Duplicate stage execution ${execution.stageId}`});
    stageIds.add(execution.stageId);
  }
  if(run.currentStageId&&!stageIds.has(run.currentStageId))ctx.addIssue({code:"custom",path:["currentStageId"],message:`Current stage ${run.currentStageId} does not exist in stage executions`});

  const checkpointIds=new Set<string>();
  for(const[index,checkpoint]of run.checkpoints.entries()){
    if(checkpointIds.has(checkpoint.id))ctx.addIssue({code:"custom",path:["checkpoints",index,"id"],message:`Duplicate checkpoint id ${checkpoint.id}`});
    checkpointIds.add(checkpoint.id);
    if(!stageIds.has(checkpoint.stageId))ctx.addIssue({code:"custom",path:["checkpoints",index,"stageId"],message:`Checkpoint ${checkpoint.id} references missing stage execution ${checkpoint.stageId}`});
  }

  const artifactIds=new Set<string>();
  for(const[index,artifact]of run.artifacts.entries()){
    if(artifactIds.has(artifact.id))ctx.addIssue({code:"custom",path:["artifacts",index,"id"],message:`Duplicate workflow artifact id ${artifact.id}`});
    artifactIds.add(artifact.id);
    if(!stageIds.has(artifact.stageId))ctx.addIssue({code:"custom",path:["artifacts",index,"stageId"],message:`Artifact ${artifact.id} references missing stage execution ${artifact.stageId}`});
  }

  const sourceAssetIds=new Set<string>();
  for(const[index,assetId]of run.sourceAssetIds.entries()){
    if(sourceAssetIds.has(assetId))ctx.addIssue({code:"custom",path:["sourceAssetIds",index],message:`Duplicate source asset id ${assetId}`});
    sourceAssetIds.add(assetId);
  }
});
export type WorkflowRun=z.infer<typeof WorkflowRunSchema>;

export const isTerminalWorkflowRunStatus=(status:WorkflowRunStatus)=>status==="completed"||status==="cancelled";
