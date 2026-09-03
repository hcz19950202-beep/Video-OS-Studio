import {AIProviderRequestSchema,type AgentToolDefinition,type AIProviderRequest} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {PROPOSE_VISUAL_PLAN_TOOL_ID} from "@/lib/ai/tools/proposal-tools";
import {SEARCH_VIDEO_SKILLS_TOOL_ID,SELECT_VIDEO_SKILL_TOOL_ID} from "@/lib/ai/tools/skill-tools";
import {C5_CREATE_EDIT_PROPOSAL_TOOL_ID} from "@/lib/ai/tools/shared-proposal-tools";
import {REQUEST_WORKFLOW_ACTION_TOOL_ID} from "@/lib/ai/tools/workflow-tools";
import type {VideoSkill} from "@/lib/production/skills/schema";

const SKILL_ORCHESTRATION_TOOL_IDS=new Set<string>([
  SEARCH_VIDEO_SKILLS_TOOL_ID,
  SELECT_VIDEO_SKILL_TOOL_ID,
]);

const PROPOSAL_TOOL_SERVICE:Readonly<Record<string,VideoSkill["allowedServices"][number]>>={
  [PROPOSE_VISUAL_PLAN_TOOL_ID]:"visual-plan-service",
  [C5_CREATE_EDIT_PROPOSAL_TOOL_ID]:"project-mutation-service",
  [REQUEST_WORKFLOW_ACTION_TOOL_ID]:"workflow-service",
};

export const scopeAgentToolDefinitionsForVideoSkill=(
  definitions:readonly AgentToolDefinition[],
  skill:VideoSkill,
):AgentToolDefinition[]=>{
  const allowedServices=new Set(skill.allowedServices);
  return definitions.filter(definition=>{
    if(SKILL_ORCHESTRATION_TOOL_IDS.has(definition.id))return false;
    if(definition.risk==="read")return true;
    if(definition.risk!=="proposal")return false;
    const requiredService=PROPOSAL_TOOL_SERVICE[definition.id];
    return requiredService!==undefined&&allowedServices.has(requiredService);
  }).map(definition=>structuredClone(definition));
};

export const describeBoundVideoSkill=(skill:VideoSkill)=>[
  `The user explicitly selected Video Skill ${skill.id}@${skill.version} for this turn.`,
  "Treat this Skill as a bounded workflow preset: follow its intended use, recipe, allowed services/components, QA checks and fallback behavior.",
  "Do not replace the selected Skill by calling Skill discovery/selection tools. Only the application may change the bound Skill for a later turn.",
  "The Skill can only narrow available tools and workflow behavior. Its risk policy never grants authorization and never weakens execution-mode, application approval, revision, idempotency, or mutation safeguards.",
  skill.riskPolicy.reviewRequired
    ?"This Skill requires review. Any Project-changing proposal produced in this turn must remain reviewable and must not be auto-applied solely because the execution mode would otherwise permit a safe edit."
    :"This Skill does not add an extra review requirement, but all existing application approval rules still apply unchanged.",
  "Bound Video Skill follows as JSON:",
  JSON.stringify(skill),
].join("\n");

export const applyVideoSkillToProviderRequest=(request:AIProviderRequest,skill:VideoSkill):AIProviderRequest=>AIProviderRequestSchema.parse({
  ...request,
  system:`${request.system}\n${describeBoundVideoSkill(skill)}`,
  tools:scopeAgentToolDefinitionsForVideoSkill(request.tools,skill),
});

export const bindVideoSkillToProvider=(provider:AIProvider,skill:VideoSkill):AIProvider=>({
  id:provider.id,
  async *run(request,signal){
    yield* provider.run(applyVideoSkillToProviderRequest(request,skill),signal);
  },
});
