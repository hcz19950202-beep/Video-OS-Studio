import {z} from "zod";
import {AgentContextSnapshotSchema,type AgentContextSnapshot} from "@/lib/ai/context";
import type {BoundedResolvedContextReference} from "@/lib/ai/context-reference-service";
import {AgentProposalSchema,type AgentToolDefinition} from "@/lib/ai/schema";
import {AssetIntelligenceQuerySchema,AssetIntelligenceSearchResultSchema} from "@/lib/assets/intelligence/schema";
import {VideoSkillIdSchema,VideoSkillSearchQuerySchema,VideoSkillSearchResultSchema,VideoSkillSelectionIntentSchema,VideoSkillSelectionRequestSchema,VideoSkillVersionSchema} from "@/lib/production/skills/schema";
import {WorkflowArtifactKindSchema,WorkflowCheckpointStatusSchema,WorkflowRunIdSchema,WorkflowRunStatusSchema,WorkflowScenarioSchema,WorkflowStageIdSchema,WorkflowStageStatusSchema} from "@/lib/workflows/schema";

export type AgentToolExecutionContext={
  sessionId:string;
  context:AgentContextSnapshot;
  contextReferences?:ReadonlyArray<BoundedResolvedContextReference>;
  now?:()=>string;
  makeId?:()=>string;
};

export type RegisteredAgentTool={
  definition:AgentToolDefinition;
  inputSchema:z.ZodType<unknown>;
  outputSchema:z.ZodType<unknown>;
  handler:(input:unknown,context:AgentToolExecutionContext)=>Promise<unknown>|unknown;
};

export const GetProjectContextInputSchema=z.object({}).strict();
export const SearchAssetIntelligenceInputSchema=AssetIntelligenceQuerySchema;
export const SearchVideoSkillsInputSchema=VideoSkillSearchQuerySchema;
export const SelectVideoSkillInputSchema=z.object({skillId:VideoSkillIdSchema,version:VideoSkillVersionSchema.optional(),intent:VideoSkillSelectionIntentSchema}).strict();

export const ProposeVisualPlanInputSchema=z.object({
  intent:z.string().min(1).max(2_000),
}).strict();

export const GetWorkflowStatusInputSchema=z.object({
  workflowId:WorkflowRunIdSchema.optional(),
}).strict();

const WorkflowSourceAssetIdsSchema=z.array(z.string().min(1)).min(1).max(64).refine(ids=>new Set(ids).size===ids.length,"sourceAssetIds must not contain duplicates");
export const RequestWorkflowActionInputSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("create_first_draft"),scenario:WorkflowScenarioSchema,sourceAssetIds:WorkflowSourceAssetIdsSchema}).strict(),
  z.object({action:z.literal("resume"),workflowId:WorkflowRunIdSchema}).strict(),
  z.object({action:z.literal("retry"),workflowId:WorkflowRunIdSchema,stageId:WorkflowStageIdSchema}).strict(),
  z.object({action:z.literal("final_render"),workflowId:WorkflowRunIdSchema}).strict(),
]);

export const WorkflowActionProposalPayloadSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("create_first_draft"),scenario:WorkflowScenarioSchema,sourceAssetIds:WorkflowSourceAssetIdsSchema}).strict(),
  z.object({action:z.literal("resume"),workflowId:WorkflowRunIdSchema,expectedWorkflowUpdatedAt:z.string().datetime(),expectedWorkflowStatus:z.literal("paused")}).strict(),
  z.object({action:z.literal("retry"),workflowId:WorkflowRunIdSchema,stageId:WorkflowStageIdSchema,expectedWorkflowUpdatedAt:z.string().datetime(),expectedWorkflowStatus:z.enum(["failed","interrupted"])}).strict(),
  z.object({action:z.literal("final_render"),workflowId:WorkflowRunIdSchema,checkpointId:z.string().min(1).max(128),expectedWorkflowUpdatedAt:z.string().datetime(),expectedWorkflowStatus:z.literal("waiting_review")}).strict(),
]);
export type WorkflowActionProposalPayload=z.infer<typeof WorkflowActionProposalPayloadSchema>;

const WorkflowStageSummarySchema=z.object({
  stageId:WorkflowStageIdSchema,
  status:WorkflowStageStatusSchema,
  attempt:z.number().int().nonnegative(),
  error:z.object({code:z.string().min(1).max(128),message:z.string().max(1_000),retryable:z.boolean()}).strict().optional(),
}).strict();
const WorkflowCheckpointSummarySchema=z.object({
  id:z.string().min(1).max(128),
  stageId:WorkflowStageIdSchema,
  status:WorkflowCheckpointStatusSchema,
  baseProjectRevision:z.number().int().nonnegative(),
}).strict();
const WorkflowArtifactSummarySchema=z.object({
  id:z.string().min(1).max(128),
  stageId:WorkflowStageIdSchema,
  kind:WorkflowArtifactKindSchema,
  projectRevision:z.number().int().nonnegative().optional(),
  logicalAssetId:z.string().min(1).optional(),
}).strict();
export const WorkflowSummarySchema=z.object({
  id:WorkflowRunIdSchema,
  scenario:WorkflowScenarioSchema,
  status:WorkflowRunStatusSchema,
  currentStageId:WorkflowStageIdSchema.optional(),
  updatedAt:z.string().datetime(),
  lastKnownProjectRevision:z.number().int().nonnegative(),
  stages:z.array(WorkflowStageSummarySchema).max(32),
  checkpoints:z.array(WorkflowCheckpointSummarySchema).max(16),
  artifacts:z.array(WorkflowArtifactSummarySchema).max(32),
}).strict();

export const ProjectContextToolOutputSchema=z.object({context:AgentContextSnapshotSchema}).strict();
export const AssetIntelligenceSearchToolOutputSchema=z.object({results:z.array(AssetIntelligenceSearchResultSchema).max(20)}).strict();
export const VideoSkillSearchToolOutputSchema=z.object({results:z.array(VideoSkillSearchResultSchema).max(20)}).strict();
export const VideoSkillSelectionToolOutputSchema=z.object({request:VideoSkillSelectionRequestSchema}).strict();
export const VisualPlanProposalToolOutputSchema=z.object({proposal:AgentProposalSchema}).strict();
export const WorkflowStatusToolOutputSchema=z.object({workflows:z.array(WorkflowSummarySchema).max(8)}).strict();
export const WorkflowActionProposalToolOutputSchema=z.object({proposal:AgentProposalSchema}).strict();
