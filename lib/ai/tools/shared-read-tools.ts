import {z} from "zod";
import {AgentContextSnapshotSchema} from "@/lib/ai/context";
import {
  AssetIntelligenceQuerySchema,
  AssetIntelligenceSearchResultSchema,
} from "@/lib/assets/intelligence/schema";
import type {AgentAssetIntelligenceReader} from "@/lib/ai/tools/asset-intelligence-tools";
import type {AgentQAReportReader} from "@/lib/ai/tools/qa-tools";
import type {SharedAgentToolContract} from "@/lib/ai/tools/shared-contract";
import {
  SharedToolRegistry,
  SharedToolSafeError,
  type RegisteredSharedTool,
  type SharedToolExecutionContext,
} from "@/lib/ai/tools/shared-registry";
import {
  MissionAutonomyPolicySchema,
  ProductionMissionIdSchema,
  ProductionMissionStatusSchema,
  ProductionMissionTargetSchema,
  type ProductionMission,
} from "@/lib/production/mission/schema";
import {
  QAFindingSchema,
  QAReportIdSchema,
  QAReportStatusSchema,
  QATechnicalEvidenceSchema,
} from "@/lib/production/qa/schema";

export const C4_READ_TOOL_IDS={
  projectSummary:"read_project_summary",
  timeline:"read_timeline",
  transcript:"read_transcript",
  selection:"read_selection",
  listAssets:"list_assets",
  searchAssets:"search_assets",
  mission:"read_mission",
  qa:"read_qa",
} as const;

const EmptyInputSchema=z.object({}).strict();
const OptionalMissionInputSchema=z.object({missionId:ProductionMissionIdSchema.optional()}).strict();

const ProjectSummaryOutputSchema=z.object({
  projectId:z.string().min(1),
  revision:z.number().int().nonnegative(),
  name:z.string().min(1),
  canvas:AgentContextSnapshotSchema.shape.canvas,
  counts:z.object({
    scenes:z.number().int().nonnegative(),
    clips:z.number().int().nonnegative(),
    transcriptSegments:z.number().int().nonnegative(),
    assets:z.number().int().nonnegative(),
  }).strict(),
  truncated:AgentContextSnapshotSchema.shape.truncated,
}).strict();

const TimelineOutputSchema=z.object({
  projectId:z.string().min(1),
  revision:z.number().int().nonnegative(),
  scenes:AgentContextSnapshotSchema.shape.scenes,
  clips:AgentContextSnapshotSchema.shape.clips,
  truncated:z.object({scenes:z.boolean(),clips:z.boolean()}).strict(),
}).strict();

const TranscriptOutputSchema=z.object({
  projectId:z.string().min(1),
  revision:z.number().int().nonnegative(),
  segments:AgentContextSnapshotSchema.shape.scriptSegments,
  truncated:z.boolean(),
}).strict();

const SelectionOutputSchema=z.object({
  projectId:z.string().min(1),
  revision:z.number().int().nonnegative(),
  selection:AgentContextSnapshotSchema.shape.selection,
  selectedScene:AgentContextSnapshotSchema.shape.selectedScene,
  selectedClips:AgentContextSnapshotSchema.shape.selectedClips,
  selectedScriptWords:AgentContextSnapshotSchema.shape.selectedScriptWords,
  truncatedSelectedScriptWords:z.boolean(),
}).strict();

const AssetListOutputSchema=z.object({
  projectId:z.string().min(1),
  revision:z.number().int().nonnegative(),
  assets:AgentContextSnapshotSchema.shape.assets,
  truncated:z.boolean(),
}).strict();

const AssetSearchOutputSchema=z.object({
  projectId:z.string().min(1),
  results:z.array(AssetIntelligenceSearchResultSchema).max(20),
}).strict();

const MissionSummarySchema=z.object({
  id:ProductionMissionIdSchema,
  title:z.string().min(1).max(200),
  brief:z.string().min(1).max(10_000),
  target:ProductionMissionTargetSchema,
  autonomyPolicy:MissionAutonomyPolicySchema,
  baseProjectRevision:z.number().int().nonnegative(),
  status:ProductionMissionStatusSchema,
  planId:z.string().uuid().optional(),
  activeStepId:z.string().min(1).max(64).optional(),
  qaReportCount:z.number().int().nonnegative(),
  workflowRunCount:z.number().int().nonnegative(),
  jobCount:z.number().int().nonnegative(),
  createdAt:z.string().datetime(),
  updatedAt:z.string().datetime(),
}).strict();
const MissionReadOutputSchema=z.object({mission:MissionSummarySchema.nullable()}).strict();

const QAReadOutputSchema=z.object({
  report:z.object({
    id:QAReportIdSchema,
    missionId:ProductionMissionIdSchema,
    projectRevision:z.number().int().nonnegative(),
    renderSourceProjectRevision:z.number().int().nonnegative().optional(),
    status:QAReportStatusSchema,
    technicalEvidence:QATechnicalEvidenceSchema,
    findings:z.array(QAFindingSchema).max(64),
    createdAt:z.string().datetime(),
  }).strict().nullable(),
}).strict();

export interface C4MissionReader{
  load(projectId:string,missionId:string):Promise<ProductionMission|null>;
  list(projectId:string):Promise<ProductionMission[]>;
}

export type C4SharedReadToolDependencies={
  assetIntelligence:AgentAssetIntelligenceReader;
  missions:C4MissionReader;
  qaReports:AgentQAReportReader;
};

const emptyJsonSchema={type:"object",properties:{},additionalProperties:false} as const;
const optionalMissionJsonSchema={
  type:"object",
  properties:{missionId:{type:"string",format:"uuid"}},
  additionalProperties:false,
} as const;

const readContract=(input:{
  toolId:string;
  description:string;
  scope:"project:read"|"asset:read"|"mission:read"|"qa:read";
  inputJsonSchema:Record<string,unknown>;
  outputJsonSchema:Record<string,unknown>;
}):SharedAgentToolContract=>({
  toolId:input.toolId,
  version:"1.0.0",
  description:input.description,
  inputJsonSchema:input.inputJsonSchema,
  outputJsonSchema:input.outputJsonSchema,
  riskClass:"R0",
  requiredScopes:[input.scope],
  approval:{defaultMode:"auto",allowSessionOverride:false},
  revisionPolicy:"none",
  idempotency:"read-only",
  timeoutMs:5_000,
  cancellation:"request-scoped",
  audit:{
    eventKind:`mcp.${input.toolId}`,
    recordArguments:false,
    sensitiveArgumentKeys:[],
    recordResultSummary:true,
  },
});

const requireProjectContext=(context:SharedToolExecutionContext)=>{
  const snapshot=context.projectContext;
  if(!snapshot||snapshot.projectId!==context.projectId){
    throw new SharedToolSafeError(
      "project_context_unavailable",
      "The authenticated Project context is unavailable for this read request.",
      true,
    );
  }
  return snapshot;
};

const summarizeMission=(mission:ProductionMission)=>MissionSummarySchema.parse({
  id:mission.id,
  title:mission.title,
  brief:mission.brief,
  target:mission.target,
  autonomyPolicy:mission.autonomyPolicy,
  baseProjectRevision:mission.baseProjectRevision,
  status:mission.status,
  ...(mission.planId?{planId:mission.planId}:{}),
  ...(mission.activeStepId?{activeStepId:mission.activeStepId}:{}),
  qaReportCount:mission.qaReportIds.length,
  workflowRunCount:mission.workflowRunIds.length,
  jobCount:mission.jobIds.length,
  createdAt:mission.createdAt,
  updatedAt:mission.updatedAt,
});

const tool=(input:RegisteredSharedTool):RegisteredSharedTool=>input;

export const createC4SharedReadTools=(dependencies:C4SharedReadToolDependencies):RegisteredSharedTool[]=>[
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.projectSummary,
      description:"Read a bounded summary of the authenticated open Project without filesystem paths or provider secrets.",
      scope:"project:read",
      inputJsonSchema:emptyJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:EmptyInputSchema,
    outputSchema:ProjectSummaryOutputSchema,
    handler:(_input,context)=>{
      const snapshot=requireProjectContext(context);
      return {
        projectId:snapshot.projectId,
        revision:snapshot.baseProjectRevision,
        name:snapshot.projectName,
        canvas:snapshot.canvas,
        counts:{
          scenes:snapshot.scenes.length,
          clips:snapshot.clips.length,
          transcriptSegments:snapshot.scriptSegments.length,
          assets:snapshot.assets.length,
        },
        truncated:snapshot.truncated,
      };
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.timeline,
      description:"Read the bounded safe Scene and Clip timeline for the authenticated open Project.",
      scope:"project:read",
      inputJsonSchema:emptyJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:EmptyInputSchema,
    outputSchema:TimelineOutputSchema,
    handler:(_input,context)=>{
      const snapshot=requireProjectContext(context);
      return {
        projectId:snapshot.projectId,
        revision:snapshot.baseProjectRevision,
        scenes:snapshot.scenes,
        clips:snapshot.clips,
        truncated:{scenes:snapshot.truncated.scenes,clips:snapshot.truncated.clips},
      };
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.transcript,
      description:"Read the bounded path-safe transcript segments for the authenticated open Project.",
      scope:"project:read",
      inputJsonSchema:emptyJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:EmptyInputSchema,
    outputSchema:TranscriptOutputSchema,
    handler:(_input,context)=>{
      const snapshot=requireProjectContext(context);
      return {
        projectId:snapshot.projectId,
        revision:snapshot.baseProjectRevision,
        segments:snapshot.scriptSegments,
        truncated:snapshot.truncated.scriptSegments,
      };
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.selection,
      description:"Read the current bounded UI selection for the authenticated open Project. Selection is context only, never authorization.",
      scope:"project:read",
      inputJsonSchema:emptyJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:EmptyInputSchema,
    outputSchema:SelectionOutputSchema,
    handler:(_input,context)=>{
      const snapshot=requireProjectContext(context);
      return {
        projectId:snapshot.projectId,
        revision:snapshot.baseProjectRevision,
        selection:snapshot.selection,
        selectedScene:snapshot.selectedScene,
        selectedClips:snapshot.selectedClips,
        selectedScriptWords:snapshot.selectedScriptWords,
        truncatedSelectedScriptWords:snapshot.truncated.selectedScriptWords,
      };
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.listAssets,
      description:"List bounded logical Asset metadata for the authenticated open Project without raw filesystem paths.",
      scope:"asset:read",
      inputJsonSchema:emptyJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:EmptyInputSchema,
    outputSchema:AssetListOutputSchema,
    handler:(_input,context)=>{
      const snapshot=requireProjectContext(context);
      return {
        projectId:snapshot.projectId,
        revision:snapshot.baseProjectRevision,
        assets:snapshot.assets,
        truncated:snapshot.truncated.assets,
      };
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.searchAssets,
      description:"Search path-safe derived Asset Intelligence in the authenticated open Project. Project identity cannot be supplied by tool arguments.",
      scope:"asset:read",
      inputJsonSchema:{
        type:"object",
        properties:{
          query:{type:"string"},
          requiredTags:{type:"array",items:{type:"string"}},
          preferredKinds:{type:"array",items:{type:"string",enum:["video","audio","image","overlay","subtitle"]}},
          sceneSemanticType:{type:"string"},
          maxResults:{type:"integer",minimum:1,maximum:20},
        },
        additionalProperties:false,
      },
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:AssetIntelligenceQuerySchema,
    outputSchema:AssetSearchOutputSchema,
    handler:async(input,context)=>({
      projectId:context.projectId,
      results:await dependencies.assetIntelligence.search(
        context.projectId,
        AssetIntelligenceQuerySchema.parse(input),
      ),
    }),
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.mission,
      description:"Read a bounded Production Mission summary for the authenticated open Project, or the latest Mission when no ID is supplied.",
      scope:"mission:read",
      inputJsonSchema:optionalMissionJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:OptionalMissionInputSchema,
    outputSchema:MissionReadOutputSchema,
    handler:async(input,context)=>{
      const parsed=OptionalMissionInputSchema.parse(input);
      const mission=parsed.missionId
        ?await dependencies.missions.load(context.projectId,parsed.missionId)
        :(await dependencies.missions.list(context.projectId))[0]??null;
      return {mission:mission?summarizeMission(mission):null};
    },
  }),
  tool({
    contract:readContract({
      toolId:C4_READ_TOOL_IDS.qa,
      description:"Read the latest bounded QA findings for the authenticated open Project, optionally scoped to a Production Mission. No repair action is applied.",
      scope:"qa:read",
      inputJsonSchema:optionalMissionJsonSchema,
      outputJsonSchema:{type:"object"},
    }),
    inputSchema:OptionalMissionInputSchema,
    outputSchema:QAReadOutputSchema,
    handler:async(input,context)=>{
      const parsed=OptionalMissionInputSchema.parse(input);
      const report=await dependencies.qaReports.latest(context.projectId,parsed.missionId);
      return {report:report?{
        id:report.id,
        missionId:report.missionId,
        projectRevision:report.projectRevision,
        ...(report.renderSourceProjectRevision!==undefined?{renderSourceProjectRevision:report.renderSourceProjectRevision}:{}),
        status:report.status,
        technicalEvidence:report.technicalEvidence,
        findings:report.findings,
        createdAt:report.createdAt,
      }:null};
    },
  }),
];

export const createC4SharedReadRegistry=(dependencies:C4SharedReadToolDependencies)=>
  new SharedToolRegistry(createC4SharedReadTools(dependencies));
