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
  it("exposes only the explicit A1 allow-list with risk metadata",()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    expect(registry.listDefinitions().map(tool=>[tool.id,tool.risk])).toEqual([
      ["get_project_context","read"],
      ["propose_visual_plan","proposal"],
    ]);
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

  it("rejects malformed arguments before calling the proposal dependency",async()=>{
    let calls=0;
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>{calls+=1;return plan;}}});
    const result=await registry.execute({id:"call_bad_args",toolId:"propose_visual_plan",arguments:{}},executionContext);
    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("invalid_tool_arguments");
    expect(calls).toBe(0);
  });

  it("returns the bounded path-safe Project context through a read-only tool",async()=>{
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async()=>plan}});
    const result=await registry.execute({id:"call_context",toolId:"get_project_context",arguments:{}},executionContext);
    expect(result.status).toBe("success");
    expect(result.output?.context).toEqual(context);
  });

  it("wraps the existing Rules Director output as a revision-bound proposal without applying it",async()=>{
    const before=JSON.stringify(project);
    let receivedProjectId="";
    let receivedIntent="";
    const registry=createA1AgentToolRegistry({visualPlans:{generate:async(projectId,plannerContext)=>{
      receivedProjectId=projectId;
      receivedIntent=plannerContext?.intent??"";
      return plan;
    }}});
    const result=await registry.execute({id:"call_plan",toolId:"propose_visual_plan",arguments:{intent:"Emphasize the proof"}},executionContext);
    expect(result.status).toBe("success");
    const proposal=result.output?.proposal as {id?:string;baseProjectRevision?:number;status?:string;operations?:Array<{kind?:string;payload?:unknown}>}|undefined;
    expect(receivedProjectId).toBe(project.project.id);
    expect(receivedIntent).toBe("Emphasize the proof");
    expect(proposal?.id).toBe(proposalId);
    expect(proposal?.baseProjectRevision).toBe(4);
    expect(proposal?.status).toBe("draft");
    expect(proposal?.operations?.[0]?.kind).toBe("visual-plan");
    expect(JSON.stringify(project)).toBe(before);
    expect(project.project.revision).toBe(4);
  });
});
