import {randomUUID} from "node:crypto";
import {AgentProposalSchema,AgentToolDefinitionSchema} from "@/lib/ai/schema";
import {ProposeVisualPlanInputSchema,VisualPlanProposalToolOutputSchema,type RegisteredAgentTool} from "@/lib/ai/tools/schema";
import type {VisualPlanService} from "@/lib/visual-planner/service";

export const PROPOSE_VISUAL_PLAN_TOOL_ID="propose_visual_plan" as const;
export type VisualPlanGenerator=Pick<VisualPlanService,"generate">;

export function createVisualPlanProposalTool(visualPlans:VisualPlanGenerator):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:PROPOSE_VISUAL_PLAN_TOOL_ID,
      description:"Use the existing deterministic Rules Director to create a reviewable visual-plan proposal. This tool never applies Project mutations.",
      risk:"proposal",
      inputJsonSchema:{
        type:"object",
        required:["intent"],
        properties:{
          intent:{type:"string",minLength:1,maxLength:2000},
          selectedSuggestionIds:{type:"array",items:{type:"string"},maxItems:128},
        },
        additionalProperties:false,
      },
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
    }),
    inputSchema:ProposeVisualPlanInputSchema,
    outputSchema:VisualPlanProposalToolOutputSchema,
    handler:async(inputValue,context)=>{
      const input=ProposeVisualPlanInputSchema.parse(inputValue);
      const plan=await visualPlans.generate(context.context.projectId,{intent:input.intent});
      if(plan.projectId!==context.context.projectId)throw new Error("Visual planner returned a plan for a different Project.");
      const allowedIds=new Set(plan.suggestions.map(suggestion=>suggestion.id));
      const selectedIds=(input.selectedSuggestionIds??plan.suggestions.map(suggestion=>suggestion.id)).filter(id=>allowedIds.has(id));
      if(selectedIds.length===0)throw new Error("Visual planner produced no selected actionable suggestions.");
      const proposalId=context.makeId?.()??randomUUID();
      const createdAt=context.now?.()??new Date().toISOString();
      const proposal=AgentProposalSchema.parse({
        id:proposalId,
        sessionId:context.sessionId,
        projectId:context.context.projectId,
        baseProjectRevision:context.context.baseProjectRevision,
        title:"Visual plan proposal",
        summary:`Review ${selectedIds.length} Rules Director suggestion${selectedIds.length===1?"":"s"} before applying.`,
        rationale:["Generated through the existing deterministic VisualPlanService; no Project mutation has been applied."],
        operations:[{
          id:`visual-plan-${proposalId}`,
          kind:"visual-plan",
          summary:`Apply ${selectedIds.length} selected visual suggestion${selectedIds.length===1?"":"s"}.`,
          payload:{plan,selectedIds},
        }],
        warnings:[],
        createdAt,
        status:"draft",
      });
      return{proposal};
    },
  };
}
