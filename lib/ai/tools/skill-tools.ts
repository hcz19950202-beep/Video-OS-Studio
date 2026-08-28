import {AgentToolDefinitionSchema} from "@/lib/ai/schema";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {AgentToolSafeError} from "@/lib/ai/tools/registry";
import {SearchVideoSkillsInputSchema,SelectVideoSkillInputSchema,VideoSkillSearchToolOutputSchema,VideoSkillSelectionToolOutputSchema,type RegisteredAgentTool} from "@/lib/ai/tools/schema";
import {VideoSkillContextError,type VideoSkillRegistry} from "@/lib/production/skills/registry";
import type {VideoSkillContextKey} from "@/lib/production/skills/schema";

export const SEARCH_VIDEO_SKILLS_TOOL_ID="search_video_skills" as const;
export const SELECT_VIDEO_SKILL_TOOL_ID="select_video_skill" as const;

export const availableVideoSkillContext=(context:AgentContextSnapshot):VideoSkillContextKey[]=>{
  const keys=new Set<VideoSkillContextKey>(["brand","canvas"]);
  if(context.scriptSegments.length||context.selectedScriptWords.length)keys.add("script");
  if(context.scenes.length||context.selectedScene)keys.add("scene");
  if(context.assets.length)keys.add("assets");
  if(context.linkedStyles.length)keys.add("linked-styles");
  if(context.selection.selectedClipIds.length||context.selection.selectedSceneId||context.selection.selectedScriptRange)keys.add("selection");
  return [...keys].sort();
};

export function createVideoSkillAgentTools(registry:VideoSkillRegistry):RegisteredAgentTool[]{
  return[
    {
      definition:AgentToolDefinitionSchema.parse({
        id:SEARCH_VIDEO_SKILLS_TOOL_ID,
        description:"Discover allow-listed, declarative Video Skills relevant to the current production context. Returns Skill IDs/versions and missing context only; it never mutates the Project.",
        risk:"read",
        inputJsonSchema:{type:"object",properties:{query:{type:"string"},maxResults:{type:"integer",minimum:1,maximum:20}},additionalProperties:false},
        revisionPolicy:"none",
        idempotency:"read-only",
        requiresConfirmation:false,
        errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
      }),
      inputSchema:SearchVideoSkillsInputSchema,
      outputSchema:VideoSkillSearchToolOutputSchema,
      handler:(input,context)=>({results:registry.search(SearchVideoSkillsInputSchema.parse(input),availableVideoSkillContext(context.context))}),
    },
    {
      definition:AgentToolDefinitionSchema.parse({
        id:SELECT_VIDEO_SKILL_TOOL_ID,
        description:"Select one allow-listed Video Skill for the current Project snapshot and return a bounded application request. Selection is proposal-only and does not mutate Project truth.",
        risk:"proposal",
        inputJsonSchema:{type:"object",properties:{skillId:{type:"string"},version:{type:"string"},intent:{type:"string"}},required:["skillId","intent"],additionalProperties:false},
        revisionPolicy:"snapshot",
        idempotency:"proposal-only",
        requiresConfirmation:false,
        errorCodes:["skill_not_found","skill_context_missing","invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
      }),
      inputSchema:SelectVideoSkillInputSchema,
      outputSchema:VideoSkillSelectionToolOutputSchema,
      handler:(input,context)=>{
        const parsed=SelectVideoSkillInputSchema.parse(input);const skill=registry.get(parsed.skillId,parsed.version);
        if(!skill)throw new AgentToolSafeError("skill_not_found","Requested Video Skill is not available in the allow-listed registry.");
        try{
          return{request:registry.buildSelectionRequest({projectId:context.context.projectId,baseProjectRevision:context.context.baseProjectRevision,skill:{id:skill.id,version:skill.version},intent:parsed.intent,availableContext:availableVideoSkillContext(context.context)})};
        }catch(error){
          if(error instanceof VideoSkillContextError)throw new AgentToolSafeError("skill_context_missing",`Video Skill requires additional approved context: ${error.missingContext.join(", ")}.`);
          throw error;
        }
      },
    },
  ];
}
