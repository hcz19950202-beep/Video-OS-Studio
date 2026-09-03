import {describe,expect,it} from "vitest";
import {AgentToolDefinitionSchema,AIProviderRequestSchema,type AIProviderRequest,type AgentProviderEvent} from "@/lib/ai/schema";
import type {AIProvider} from "@/lib/ai/provider";
import {applyVideoSkillToProviderRequest,bindVideoSkillToProvider,scopeAgentToolDefinitionsForVideoSkill} from "@/lib/ai/skill-runtime";
import {BUILTIN_VIDEO_SKILLS} from "@/lib/production/skills/builtin";

const definition=(id:string,risk:"read"|"proposal"|"mutating-request")=>AgentToolDefinitionSchema.parse({
  id,
  description:`${id} test tool`,
  risk,
  inputJsonSchema:{type:"object"},
  revisionPolicy:risk==="read"?"none":risk==="proposal"?"snapshot":"expected-revision",
  idempotency:risk==="read"?"read-only":risk==="proposal"?"proposal-only":"stable-operation-id",
  requiresConfirmation:risk==="mutating-request",
  errorCodes:["test_error"],
});

const request=(tools:AIProviderRequest["tools"]):AIProviderRequest=>AIProviderRequestSchema.parse({
  system:"base system",
  messages:[],
  tools,
});

const skill=(id:string)=>{
  const found=BUILTIN_VIDEO_SKILLS.find(item=>item.id===id);
  if(!found)throw new Error(`Missing built-in Skill ${id}`);
  return found;
};

describe("Agent Video Skill runtime binding",()=>{
  it("keeps read grounding while intersecting proposal tools with Skill services",()=>{
    const scoped=scopeAgentToolDefinitionsForVideoSkill([
      definition("read_project_context","read"),
      definition("search_video_skills","read"),
      definition("select_video_skill","proposal"),
      definition("propose_visual_plan","proposal"),
      definition("create_edit_proposal","proposal"),
      definition("request_workflow_action","proposal"),
      definition("direct_mutation","mutating-request"),
      definition("unknown_proposal","proposal"),
    ],skill("caption-emphasis"));

    expect(scoped.map(item=>item.id)).toEqual([
      "read_project_context",
      "propose_visual_plan",
      "create_edit_proposal",
    ]);
  });

  it("does not let a Skill with narrower services expose unrelated proposal authority",()=>{
    const scoped=scopeAgentToolDefinitionsForVideoSkill([
      definition("read_project_context","read"),
      definition("propose_visual_plan","proposal"),
      definition("create_edit_proposal","proposal"),
      definition("request_workflow_action","proposal"),
    ],skill("clean-broll-insert"));
    expect(scoped.map(item=>item.id)).toEqual(["read_project_context","propose_visual_plan"]);
  });

  it("injects the selected Skill and preserves a review-required constraint",()=>{
    const next=applyVideoSkillToProviderRequest(request([definition("propose_visual_plan","proposal")]),skill("b2b-proof-card"));
    expect(next.system).toContain("b2b-proof-card@1.0.0");
    expect(next.system).toContain("This Skill requires review.");
    expect(next.system).toContain("never weakens execution-mode, application approval, revision, idempotency, or mutation safeguards");
  });

  it("wraps a provider without changing its durable provider identity",async()=>{
    let captured:AIProviderRequest|undefined;
    const provider:AIProvider={
      id:"test-provider",
      async *run(input):AsyncIterable<AgentProviderEvent>{
        captured=input;
        yield{type:"completed"};
      },
    };
    const bound=bindVideoSkillToProvider(provider,skill("caption-emphasis"));
    expect(bound.id).toBe(provider.id);
    for await(const _event of bound.run(request([
      definition("read_project_context","read"),
      definition("request_workflow_action","proposal"),
      definition("propose_visual_plan","proposal"),
    ]))){/* consume */}
    expect(captured?.tools.map(item=>item.id)).toEqual(["read_project_context","propose_visual_plan"]);
    expect(captured?.system).toContain("caption-emphasis@1.0.0");
  });
});
