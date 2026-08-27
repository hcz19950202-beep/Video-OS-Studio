import {describe,expect,it} from "vitest";
import {buildAgentContextSnapshot} from "@/lib/ai/context";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const now="2026-08-26T00:00:00.000Z";
const sessionId="00000000-0000-4000-8000-000000000010";
const proposalId="00000000-0000-4000-8000-000000000011";

const project=ProjectSchema.parse(createProject({id:"agent-tools-project",name:"Agent Tools",now,durationInFrames:600}));
project.project.revision=4;
const context=buildAgentContextSnapshot(project);

const plan:VisualPlan={
  version:2,
  projectId:project.project.id,
  generatedAt:now,
  source:"rules",
  context:{intent:"Emphasize the proof"},
  suggestions:[{
    id:"suggestion-proof",
    sceneId:"scene-proof",
    startFrame:120,
    endFrame:180,
    spokenText:"15 days",
    semanticType:"number",
    recommendation:{engine:"remotion",effectId:"big-number"},
    reason:"Concrete proof should be visible.",
    confidence:.9,
    alternatives:[],
  }],
  densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
};

const executionContext={sessionId,context,now:()=>now,makeId:()=>proposalId};

describe("V2.3 A1 Agent tool registry",()=>{
  it("exposes only the explicit A1 allow-list with full safety metadata",()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    expect(registry.listDefinitions().map(tool=>({id:tool.id,risk:tool.risk,revisionPolicy:tool.revisionPolicy,idempotency:tool.idempotency,requiresConfirmation:tool.requiresConfirmation}))).toEqual([
      {id:"get_project_context",risk:"read",revisionPolicy:"snapshot",idempotency:"read-only",requiresConfirmation:false},
      {id:"propose_visual_plan",risk:"proposal",revisionPolicy:"snapshot",idempotency:"proposal-only",requiresConfirmation:false},
    ]);
    for(const definition of registry.listDefinitions())expect(definition.errorCodes.length).toBeGreaterThan(0);
    expect(registry.getDefinition("shell")).toBeUndefined();
    expect(registry.getDefinition("filesystem")).toBeUndefined();
    expect(registry.getDefinition("git")).toBeUndefined();
  });

  it("rejects unknown tools without dispatching a handler",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    const result=await registry.execute({id:"call_unknown",toolId:"run_shell",arguments:{}},executionContext);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("unknown_tool");
  });

  it("rejects malformed or duplicate arguments before calling the proposal dependency",async()=>{
    let calls=0;
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{calls+=1;return plan;}}});
    const missingIntent=await registry.execute({id:"call_bad_args",toolId:"propose_visual_plan",arguments:{}},executionContext);
    const duplicateSelection=await registry.execute({id:"call_duplicate_args",toolId:"propose_visual_plan",arguments:{intent:"Proof",selectedSuggestionIds:["suggestion-proof","suggestion-proof"]}},executionContext);
    expect(missingIntent.status).toBe("error");
    expect(missingIntent.error?.code).toBe("invalid_tool_arguments");
    expect(duplicateSelection.status).toBe("error");
    expect(duplicateSelection.error?.code).toBe("invalid_tool_arguments");
    expect(calls).toBe(0);
  });

  it("returns the bounded path-safe Project context through a read-only tool",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    const result=await registry.execute({id:"call_context",toolId:"get_project_context",arguments:{}},executionContext);
    expect(result.status).toBe("success");
    expect(result.output?.context).toEqual(context);
  });

  it("passes the captured Project revision into Rules Director generation and returns the same revision on the proposal",async()=>{
    const before=JSON.stringify(project);
    let receivedProjectId="";
    let receivedIntent="";
    let receivedExpectedRevision:number|undefined;
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async(projectId,plannerContext,expectedRevision)=>{
      receivedProjectId=projectId;
      receivedIntent=plannerContext?.intent??"";
      receivedExpectedRevision=expectedRevision;
      return plan;
    }}});
    const result=await registry.execute({id:"call_plan",toolId:"propose_visual_plan",arguments:{intent:"Emphasize the proof"}},executionContext);
    expect(result.status).toBe("success");
    const proposal=result.output?.proposal as {id?:string;baseProjectRevision?:number;status?:string;operations?:Array<{kind?:string;payload?:unknown}>}|undefined;
    expect(receivedProjectId).toBe(project.project.id);
    expect(receivedIntent).toBe("Emphasize the proof");
    expect(receivedExpectedRevision).toBe(4);
    expect(proposal?.id).toBe(proposalId);
    expect(proposal?.baseProjectRevision).toBe(4);
    expect(proposal?.status).toBe("draft");
    expect(proposal?.operations?.[0]?.kind).toBe("visual-plan");
    expect(JSON.stringify(project)).toBe(before);
    expect(project.project.revision).toBe(4);
  });

  it("does not silently drop unknown requested visual suggestions",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    const result=await registry.execute({id:"call_unknown_suggestion",toolId:"propose_visual_plan",arguments:{intent:"Proof",selectedSuggestionIds:["missing-suggestion"]}},executionContext);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("tool_execution_failed");
  });

  it("does not expose density-guarded none suggestions as applyable proposal changes",async()=>{
    const guarded:VisualPlan={...plan,suggestions:[...plan.suggestions,{...plan.suggestions[0]!,id:"suggestion-none",recommendation:{engine:"none"},reason:"Density guard blocked this card."}]};
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>guarded}});
    const automatic=await registry.execute({id:"call_guarded_default",toolId:"propose_visual_plan",arguments:{intent:"Proof"}},executionContext);
    expect(automatic.status).toBe("success");
    const proposal=automatic.output?.proposal as {operations?:Array<{payload?:{selectedIds?:string[]}}>}|undefined;
    expect(proposal?.operations?.[0]?.payload?.selectedIds).toEqual(["suggestion-proof"]);

    const explicit=await registry.execute({id:"call_guarded_explicit",toolId:"propose_visual_plan",arguments:{intent:"Proof",selectedSuggestionIds:["suggestion-none"]}},executionContext);
    expect(explicit.status).toBe("error");
    expect(explicit.error?.code).toBe("tool_execution_failed");
  });

  it("does not expose internal runtime paths through handler failure messages",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{throw new Error("C:\\Users\\private\\project\\secret.txt");}}});
    const result=await registry.execute({id:"call_internal_error",toolId:"propose_visual_plan",arguments:{intent:"Proof"}},executionContext);
    const serialized=JSON.stringify(result);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("tool_execution_failed");
    expect(serialized).not.toContain("Users");
    expect(serialized).not.toContain("secret.txt");
  });
});
