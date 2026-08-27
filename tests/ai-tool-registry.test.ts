import {describe,expect,it} from "vitest";
import {buildAgentContextSnapshot} from "@/lib/ai/context";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {applyProjectCommand} from "@/lib/project/commands";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const now="2026-08-26T00:00:00.000Z";
const sessionId="00000000-0000-4000-8000-000000000010";
const proposalId="00000000-0000-4000-8000-000000000011";

let project=ProjectSchema.parse(createProject({id:"agent-tools-project",name:"Agent Tools",now,durationInFrames:600}));
project=applyProjectCommand(project,{type:"add-scene",scene:{id:"scene-proof",name:"Proof",semanticType:"proof",startFrame:0,endFrame:600,visualStrategy:{intensity:"high",preferredEngines:["remotion"]}}},{now});
project=applyProjectCommand(project,{type:"add-clip",trackId:"captions-main",clip:{id:"caption-proof",type:"caption",text:"15 days",preset:"primary",emphasis:"numbers",keywords:[],startFrame:120,durationInFrames:60,enabled:true,layer:100}},{now});
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
    const proposalTool=registry.getDefinition("propose_visual_plan");
    expect(proposalTool?.errorCodes).toContain("visual_plan_prerequisite_missing");
    expect(proposalTool?.errorCodes).toContain("no_actionable_visual_suggestions");
    expect(proposalTool?.inputJsonSchema).toMatchObject({required:["intent"],properties:{intent:expect.any(Object)},additionalProperties:false});
    expect((proposalTool?.inputJsonSchema.properties as Record<string,unknown>|undefined)?.selectedSuggestionIds).toBeUndefined();
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

  it("rejects malformed or model-side suggestion preselection arguments before calling the proposal dependency",async()=>{
    let calls=0;
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{calls+=1;return plan;}}});
    const missingIntent=await registry.execute({id:"call_bad_args",toolId:"propose_visual_plan",arguments:{}},executionContext);
    const modelPreselection=await registry.execute({id:"call_model_preselection",toolId:"propose_visual_plan",arguments:{intent:"Proof",selectedSuggestionIds:["suggestion-proof"]}},executionContext);
    expect(missingIntent.status).toBe("error");
    expect(missingIntent.error?.code).toBe("invalid_tool_arguments");
    expect(modelPreselection.status).toBe("error");
    expect(modelPreselection.error?.code).toBe("invalid_tool_arguments");
    expect(calls).toBe(0);
  });

  it("returns the bounded path-safe Project context through a read-only tool",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    const result=await registry.execute({id:"call_context",toolId:"get_project_context",arguments:{}},executionContext);
    expect(result.status).toBe("success");
    expect(result.output?.context).toEqual(context);
  });

  it("returns a bounded prerequisite error before calling Rules Director when Scenes or timed Captions are missing",async()=>{
    const blank=ProjectSchema.parse(createProject({id:"agent-tools-blank",name:"Blank",now,durationInFrames:600}));
    blank.project.revision=4;
    let calls=0;
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{calls+=1;return plan;}}});
    const result=await registry.execute({id:"call_missing_prerequisites",toolId:"propose_visual_plan",arguments:{intent:"Proof"}},{...executionContext,context:buildAgentContextSnapshot(blank)});
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("visual_plan_prerequisite_missing");
    expect(result.error?.message).toContain("Scenes");
    expect(result.error?.message).toContain("timed Caption clips");
    expect(result.error?.retryable).toBe(false);
    expect(calls).toBe(0);
  });

  it("passes the captured Project revision into Rules Director generation and returns all actionable suggestions for Review",async()=>{
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
    const proposal=result.output?.proposal as {id?:string;baseProjectRevision?:number;status?:string;operations?:Array<{kind?:string;payload?:{selectedIds?:string[]}}>}|undefined;
    expect(receivedProjectId).toBe(project.project.id);
    expect(receivedIntent).toBe("Emphasize the proof");
    expect(receivedExpectedRevision).toBe(4);
    expect(proposal?.id).toBe(proposalId);
    expect(proposal?.baseProjectRevision).toBe(4);
    expect(proposal?.status).toBe("draft");
    expect(proposal?.operations?.[0]?.kind).toBe("visual-plan");
    expect(proposal?.operations?.[0]?.payload?.selectedIds).toEqual(["suggestion-proof"]);
    expect(JSON.stringify(project)).toBe(before);
    expect(project.project.revision).toBe(4);
  });

  it("returns a safe no-actionable result instead of presenting a density-guarded suggestion as applyable",async()=>{
    const guardedPlan:VisualPlan={...plan,suggestions:plan.suggestions.map(suggestion=>({...suggestion,recommendation:{engine:"none" as const}}))};
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>guardedPlan}});
    const result=await registry.execute({id:"call_guarded_suggestion",toolId:"propose_visual_plan",arguments:{intent:"Keep it restrained"}},executionContext);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("no_actionable_visual_suggestions");
    expect(result.error?.message).toContain("no actionable visual suggestions");
    expect(result.error?.retryable).toBe(false);
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
