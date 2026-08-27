import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {AIProviderAbortError} from "@/lib/ai/errors";
import type {AIProvider} from "@/lib/ai/provider";
import type {AIProviderRequest,AgentProviderEvent} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionSchema,AgentTurnSchema} from "@/lib/ai/session/schema";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema,type Project} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const now="2026-08-27T00:00:00.000Z";

class ScriptedProvider implements AIProvider{
  readonly id="scripted-provider";
  readonly apiKey="sk-test-must-never-persist";
  readonly requests:AIProviderRequest[]=[];
  private index=0;
  constructor(private readonly scripts:AgentProviderEvent[][]){}
  async *run(request:AIProviderRequest,signal?:AbortSignal):AsyncIterable<AgentProviderEvent>{
    this.requests.push(request);
    if(signal?.aborted)throw new AIProviderAbortError();
    const script=this.scripts[this.index++]??[];
    for(const event of script){
      if(signal?.aborted)throw new AIProviderAbortError();
      yield event;
    }
  }
}

const buildProject=():Project=>{
  const project=createProject({id:"agent-runtime-project",name:"Agent Runtime",now,durationInFrames:600});
  project.project.revision=1;
  return ProjectSchema.parse(project);
};

const planFor=(project:Project):VisualPlan=>({
  version:2,
  projectId:project.project.id,
  generatedAt:now,
  source:"rules",
  context:{intent:"Emphasize proof"},
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
});

const harness=(provider:ScriptedProvider,projectRef:{current:Project})=>{
  const fs=new InMemoryFileSystemAdapter();
  const sessions=new AgentSessionRepository(fs,"/runtime");
  const context=new AgentContextService({load:async projectId=>{
    expect(projectId).toBe(projectRef.current.project.id);
    return ProjectSchema.parse(projectRef.current);
  }});
  const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>planFor(projectRef.current)}});
  const service=new AgentSessionService({provider,context,tools,sessions,now:()=>now});
  return{fs,sessions,context,tools,service};
};

const completed=(text:string):AgentProviderEvent[]=>[
  {type:"text-delta",text},
  {type:"completed",usage:{inputTokens:10,outputTokens:4,totalTokens:14}},
];

const proposalRound:AgentProviderEvent[]=[
  {type:"tool-call",call:{id:"call_plan",toolId:"propose_visual_plan",arguments:{intent:"Emphasize proof"}}},
  {type:"completed"},
];

const readRound=(id:string):AgentProviderEvent[]=>[
  {type:"tool-call",call:{id,toolId:"get_project_context",arguments:{}}},
  {type:"completed"},
];

describe("V2.3 A2 Agent session runtime",()=>{
  it("continues normalized conversation context across multiple user turns",async()=>{
    const projectRef={current:buildProject()};
    const provider=new ScriptedProvider([completed("First answer"),completed("Second answer")]);
    const {service}=harness(provider,projectRef);
    const session=await service.create({projectId:projectRef.current.project.id});

    await service.runTurn({projectId:projectRef.current.project.id,sessionId:session.id,userContent:"First request"});
    const result=await service.runTurn({projectId:projectRef.current.project.id,sessionId:session.id,userContent:"Second request"});

    expect(result.turns.map(turn=>turn.status)).toEqual(["completed","completed"]);
    expect(result.messages.map(message=>[message.role,message.content])).toEqual([
      ["user","First request"],
      ["assistant","First answer"],
      ["user","Second request"],
      ["assistant","Second answer"],
    ]);
    expect(provider.requests[1]?.messages.map(message=>message.content)).toContain("First answer");
    expect(provider.requests[1]?.system).toContain('"baseProjectRevision":1');
  });

  it("reopens a persisted session from a fresh repository/service instance without persisting provider secrets",async()=>{
    const projectRef={current:buildProject()};
    const provider=new ScriptedProvider([completed("Persisted answer")]);
    const {fs,sessions,context,tools,service}=harness(provider,projectRef);
    const created=await service.create({projectId:projectRef.current.project.id,model:"test-model"});
    await service.runTurn({projectId:projectRef.current.project.id,sessionId:created.id,userContent:"Persist me"});

    const reopenedRepository=new AgentSessionRepository(fs,"/runtime");
    const reopenedService=new AgentSessionService({provider,context,tools,sessions:reopenedRepository,now:()=>now});
    const reopened=await reopenedService.open(projectRef.current.project.id,created.id);

    expect(reopened.messages.at(-1)?.content).toBe("Persisted answer");
    expect(reopened.model).toBe("test-model");
    expect(JSON.stringify([...fs.files.values()])).not.toContain(provider.apiKey);
    expect(await sessions.list(projectRef.current.project.id)).toHaveLength(1);
  });

  it("keeps Project truth unchanged when the provider fails",async()=>{
    const projectRef={current:buildProject()};
    const before=JSON.stringify(projectRef.current);
    const provider=new ScriptedProvider([[
      {type:"error",error:{code:"network",message:"Provider unavailable.",retryable:true}},
    ]]);
    const {service}=harness(provider,projectRef);
    const session=await service.create({projectId:projectRef.current.project.id});

    const failed=await service.runTurn({projectId:projectRef.current.project.id,sessionId:session.id,userContent:"Do not mutate"});

    expect(failed.turns[0]?.status).toBe("failed");
    expect(failed.turns[0]?.error?.code).toBe("network");
    expect(JSON.stringify(projectRef.current)).toBe(before);
    expect(projectRef.current.project.revision).toBe(1);
  });

  it("terminates recoverably when provider-round or tool-call budgets are exceeded",async()=>{
    const projectRef={current:buildProject()};
    const providerRounds=new ScriptedProvider([readRound("call_read_1")]);
    const first=harness(providerRounds,projectRef);
    const firstSession=await first.service.create({projectId:projectRef.current.project.id});
    const exhaustedRounds=await first.service.runTurn({
      projectId:projectRef.current.project.id,
      sessionId:firstSession.id,
      userContent:"Keep reading",
      budget:{maxProviderRoundTrips:1},
    });
    expect(exhaustedRounds.turns[0]?.status).toBe("budget-exhausted");
    expect(exhaustedRounds.turns[0]?.error?.code).toBe("provider_round_trips");
    expect(exhaustedRounds.turns[0]?.toolExecutions).toHaveLength(1);

    const toolCalls=new ScriptedProvider([[
      {type:"tool-call",call:{id:"call_read_a",toolId:"get_project_context",arguments:{}}},
      {type:"tool-call",call:{id:"call_read_b",toolId:"get_project_context",arguments:{}}},
      {type:"completed"},
    ]]);
    const second=harness(toolCalls,projectRef);
    const secondSession=await second.service.create({projectId:projectRef.current.project.id});
    const exhaustedTools=await second.service.runTurn({
      projectId:projectRef.current.project.id,
      sessionId:secondSession.id,
      userContent:"Read twice",
      budget:{maxToolCalls:1},
    });
    expect(exhaustedTools.turns[0]?.status).toBe("budget-exhausted");
    expect(exhaustedTools.turns[0]?.error?.code).toBe("tool_calls");
    expect(exhaustedTools.turns[0]?.toolExecutions).toHaveLength(0);
  });

  it("persists cancellation as a terminal cancelled turn",async()=>{
    const projectRef={current:buildProject()};
    const provider=new ScriptedProvider([completed("Should not run")]);
    const {service}=harness(provider,projectRef);
    const session=await service.create({projectId:projectRef.current.project.id});
    const controller=new AbortController();
    controller.abort();

    const cancelled=await service.runTurn({
      projectId:projectRef.current.project.id,
      sessionId:session.id,
      userContent:"Cancel this",
      signal:controller.signal,
    });

    expect(cancelled.turns[0]?.status).toBe("cancelled");
    expect(cancelled.turns[0]?.completedAt).toBe(now);
    expect(cancelled.turns[0]?.error?.category).toBe("cancelled");
  });

  it("recovers an incomplete persisted turn into a retryable terminal state",async()=>{
    const projectRef={current:buildProject()};
    const provider=new ScriptedProvider([]);
    const {sessions,service}=harness(provider,projectRef);
    const created=await service.create({projectId:projectRef.current.project.id});
    const userMessageId=randomUUID();
    const runningTurn=AgentTurnSchema.parse({
      id:randomUUID(),
      baseProjectRevision:1,
      userMessageId,
      startedAt:now,
      status:"running",
      providerRoundTrips:1,
      toolExecutions:[],
      proposalIds:[],
    });
    await sessions.save(AgentSessionSchema.parse({
      ...created,
      messages:[...created.messages,{id:userMessageId,role:"user",content:"Interrupted request",createdAt:now}],
      turns:[runningTurn],
    }));

    const recovered=await service.open(projectRef.current.project.id,created.id);

    expect(recovered.turns[0]?.status).toBe("interrupted");
    expect(recovered.turns[0]?.error).toMatchObject({category:"recovery",code:"incomplete_turn",retryable:true});
    expect(recovered.turns[0]?.completedAt).toBe(now);
  });

  it("marks revision-N proposals stale at N+1 and deduplicates the same approved operation ID",async()=>{
    const projectRef={current:buildProject()};
    const provider=new ScriptedProvider([proposalRound,completed("Proposal ready")]);
    const {service}=harness(provider,projectRef);
    const created=await service.create({projectId:projectRef.current.project.id});
    const proposed=await service.runTurn({projectId:projectRef.current.project.id,sessionId:created.id,userContent:"Make proof stronger"});
    const proposal=proposed.proposals[0];
    expect(proposal?.baseProjectRevision).toBe(1);
    expect(proposal?.status).toBe("draft");

    const once=await service.recordApprovedOperation({projectId:projectRef.current.project.id,sessionId:created.id,proposalId:proposal!.id,operationId:"apply-proof-1"});
    const twice=await service.recordApprovedOperation({projectId:projectRef.current.project.id,sessionId:created.id,proposalId:proposal!.id,operationId:"apply-proof-1"});
    expect(once.approvedOperations).toHaveLength(1);
    expect(twice.approvedOperations).toHaveLength(1);

    projectRef.current=ProjectSchema.parse({...projectRef.current,project:{...projectRef.current.project,revision:2,updatedAt:now}});
    const reopened=await service.open(projectRef.current.project.id,created.id);
    expect(reopened.proposals[0]?.status).toBe("stale");
    await expect(service.recordApprovedOperation({projectId:projectRef.current.project.id,sessionId:created.id,proposalId:proposal!.id,operationId:"apply-proof-2"})).rejects.toThrow(/stale/i);
  });
});
