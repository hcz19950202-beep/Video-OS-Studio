import {z} from "zod";
import {AgentToolDefinitionSchema} from "@/lib/ai/schema";
import type {RegisteredAgentTool} from "@/lib/ai/tools/schema";
import {ProductionMissionIdSchema} from "@/lib/production/mission/schema";
import {QAReportSchema,type QAReport} from "@/lib/production/qa/schema";

export const INSPECT_LATEST_QA_REPORT_TOOL_ID="inspect_latest_qa_report" as const;
const InspectLatestQAReportInputSchema=z.object({missionId:ProductionMissionIdSchema.optional()}).strict();
const InspectLatestQAReportOutputSchema=z.object({report:QAReportSchema.nullable()}).strict();

export interface AgentQAReportReader{
  latest(projectId:string,missionId?:string):Promise<QAReport|null>;
}

export function createQAReportReadTool(reader:AgentQAReportReader):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:INSPECT_LATEST_QA_REPORT_TOOL_ID,
      description:"Inspect the latest structured QA report for the current Project, optionally scoped to a Production Mission. Returns bounded evidence and repair proposals; it never applies repairs.",
      risk:"read",
      inputJsonSchema:{
        type:"object",
        properties:{missionId:{type:"string",format:"uuid"}},
        additionalProperties:false,
      },
      revisionPolicy:"none",
      idempotency:"read-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
    }),
    inputSchema:InspectLatestQAReportInputSchema,
    outputSchema:InspectLatestQAReportOutputSchema,
    handler:async(input,context)=>{
      const parsed=InspectLatestQAReportInputSchema.parse(input);
      return{report:await reader.latest(context.context.projectId,parsed.missionId)};
    },
  };
}
