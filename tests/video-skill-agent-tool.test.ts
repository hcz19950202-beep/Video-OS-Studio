import {describe,expect,it} from "vitest";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createVideoSkillAgentTools,SEARCH_VIDEO_SKILLS_TOOL_ID,SELECT_VIDEO_SKILL_TOOL_ID} from "@/lib/ai/tools/skill-tools";
import {builtInVideoSkillRegistry} from "@/lib/production/skills";
import type {VideoSkillSearchResult} from "@/lib/production/skills/schema";

const executionContext=(options:{assets?:boolean;revision?:number}={})=>({
  sessionId:"session-1",
  context:{
    projectId:"project-current",
    baseProjectRevision:options.revision??9,
    scriptSegments:[{}],
    selectedScriptWords:[],
    scenes:[],
    selectedScene:null,
    assets:options.assets?[{}]:[],
    linkedStyles:[],
    selection:{selectedClipIds:[],selectedSceneId:null,selectedScriptRange:null},
  } as unknown as AgentContextSnapshot,
});

describe("V2.4 B3 Video Skill Agent tools",()=>{
  it("registers discovery as read-only and selection as proposal-only",()=>{
    const registry=new AgentToolRegistry(createVideoSkillAgentTools(builtInVideoSkillRegistry));
    expect(registry.getDefinition(SEARCH_VIDEO_SKILLS_TOOL_ID)).toMatchObject({risk:"read",revisionPolicy:"none",idempotency:"read-only",requiresConfirmation:false});
    expect(registry.getDefinition(SELECT_VIDEO_SKILL_TOOL_ID)).toMatchObject({risk:"proposal",revisionPolicy:"snapshot",idempotency:"proposal-only",requiresConfirmation:false});
  });

  it("discovers allow-listed Skills without mutating Project state",async()=>{
    const registry=new AgentToolRegistry(createVideoSkillAgentTools(builtInVideoSkillRegistry));
    const response=await registry.execute({id:"call-search",toolId:SEARCH_VIDEO_SKILLS_TOOL_ID,arguments:{query:"caption emphasis",maxResults:2}},executionContext());
    expect(response.status).toBe("success");
    const results=(response.output as {results:VideoSkillSearchResult[]}).results;
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({skill:{id:"caption-emphasis",version:"1.0.0"},missingContext:[],score:1});
    expect(results[1]).toMatchObject({skill:{id:"numeric-evidence-emphasis",version:"1.0.0"}});
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("forces Project scope and revision from the current Agent context",async()=>{
    const registry=new AgentToolRegistry(createVideoSkillAgentTools(builtInVideoSkillRegistry));
    const invalid=await registry.execute({id:"call-invalid",toolId:SELECT_VIDEO_SKILL_TOOL_ID,arguments:{projectId:"project-other",skillId:"caption-emphasis",intent:"Emphasize the approved key phrase."}},executionContext({revision:11}));
    expect(invalid).toMatchObject({status:"error",error:{code:"invalid_tool_arguments"}});

    const response=await registry.execute({id:"call-select",toolId:SELECT_VIDEO_SKILL_TOOL_ID,arguments:{skillId:"caption-emphasis",version:"1.0.0",intent:"Emphasize the approved key phrase."}},executionContext({revision:11}));
    expect(response).toMatchObject({status:"success",output:{request:{projectId:"project-current",baseProjectRevision:11,skill:{id:"caption-emphasis",version:"1.0.0"},mode:"create"}}});
  });

  it("fails closed when required approved context is missing",async()=>{
    const registry=new AgentToolRegistry(createVideoSkillAgentTools(builtInVideoSkillRegistry));
    const response=await registry.execute({id:"call-missing",toolId:SELECT_VIDEO_SKILL_TOOL_ID,arguments:{skillId:"b2b-proof-card",intent:"Build a proof card."}},executionContext({assets:false}));
    expect(response).toMatchObject({status:"error",error:{code:"skill_context_missing",retryable:false}});
    expect(JSON.stringify(response)).not.toContain("E:\\Video-OS-Studio");
  });

  it("does not allow unknown Skill IDs to become executable requests",async()=>{
    const registry=new AgentToolRegistry(createVideoSkillAgentTools(builtInVideoSkillRegistry));
    const response=await registry.execute({id:"call-unknown",toolId:SELECT_VIDEO_SKILL_TOOL_ID,arguments:{skillId:"provider-generated-shell-skill",intent:"Run it."}},executionContext());
    expect(response).toMatchObject({status:"error",error:{code:"skill_not_found",retryable:false}});
  });
});
