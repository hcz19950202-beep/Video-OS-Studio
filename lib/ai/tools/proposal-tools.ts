import {randomUUID} from "node:crypto";
import {AgentProposalSchema,AgentToolDefinitionSchema} from "@/lib/ai/schema";
import {AgentToolSafeError} from "@/lib/ai/tools/registry";
import {ProposeVisualPlanInputSchema,VisualPlanProposalToolOutputSchema,type RegisteredAgentTool} from "@/lib/ai/tools/schema";
import type {VisualPlanService} from "@/lib/visual-planner/service";

export const PROPOSE_VISUAL_PLAN_TOOL_ID="propose_visual_plan" as const;
export type VisualPlanGenerator=Pick<VisualPlanService,"generate">;

export function createVisualPlanProposalTool(visualPlans:VisualPlanGenerator):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:PROPOSE_VISUAL_PLAN_TOOL_ID,
      description:"Use the existing deterministic Rules Director to create a reviewable visual-plan proposal. This tool never applies Project mutations. It requires at least one Scene and one timed Caption clip; if those prerequisites are missing, explain what the user needs instead of retrying the same call.",
      risk:"proposal",
      inputJsonSchema:{
        type:"object",
        required:["intent"],
        properties:{
          intent:{type:"string",minLength:1,maxLength:2000},
          selectedSuggestionIds:{type:"array",items:{type:"string"},maxItems:128,uniqueItems:true},
        },
        additionalProperties:false,
      },
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","visual_plan_prerequisite_missing","no_actionable_visual_suggestions","tool_execution_failed"],
    }),
    inputSchema:ProposeVisualPlanInputSchema,
    outputSchema:VisualPlanProposalToolOutputSchema,
    handler:async(inputValue,context)=>{
      const input=ProposeVisualPlanInputSchema.parse(inputValue);
      const hasScenes=context.context.scenes.length>0;
      const hasTimedCaption=context.context.clips.some(clip=>clip.type==="caption");
      const missing=[!hasScenes?"Scenes":null:!hasTimedCaption&&!context.context.truncated.clips?"timed Caption clips":null].filter((item):item is string=>Boolean(item));
      if(missing.length>0)throw new AgentToolSafeError("visual_plan_prerequisite_missing",`Visual proposal requires ${missing.join(" and ")}. Create or import those Project structures first, then ask the Agent to plan visuals again.`);

      const plan=await visualPlans.generate(context.context.projectId,{intent:input.intent},context.context.baseProjectRevision);
      if(plan.projectId!==context.context.projectId)throw new Error("Visual planner returned a plan for a different Project.");
      const allowedIds=new Set(plan.suggestions.map(suggestion=>suggestion.id));
      const actionableIds=new Set(plan.suggestions.filter(suggestion=>suggestion.recommendation.engine!=="none").map(suggestion=>suggestion.id));
      const selectedIds=input.selectedSuggestionIds??[...actionableIds];
      const unknownIds=selectedIds.filter(id=>!allowedIds.has(id));
      if(unknownIds.length>0)throw new Error("Visual proposal selection references unknown suggestions.");
      const nonActionableIds=selectedIds.filter(id=>!actionableIds.has(id));
      if(nonActionableIds.length>0)throw new AgentToolSafeError("no_actionable_visual_suggestions","The requested visual suggestions are currently non-actionable because the Rules Director density/content guard chose no added visual. Explain this result or ask for a different editing intent instead of retrying the same selection.");
      if(selectedIds.length===0)throw new AgentToolSafeError("no_actionable_visual_suggestions","Rules Director found no actionable visual suggestions for the current Project and editing intent. Explain that result or ask for a different intent instead of retrying the same call.");
      const proposalId=context.makeId?.()??randomUUID();
      const createdAt=context.now?.()??new Date().toISOString();
      const proposal=AgentProposalSchema.parse({
        id:proposalId,
        sessionId:context.sessionId,
        projectId:context.context.projectId,
        baseProjectRevision:context.context.baseProjectRevision,
        title:"Visual plan proposal",
        summary:`Review ${selectedIds.length} Rules Director suggestion${selectedIds.length===1?"":"s"} before applying.`,
        rationale:["Generated through the existing deterministic VisualPlanService at the captured Project revision; no Project mutation has been applied."],
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
