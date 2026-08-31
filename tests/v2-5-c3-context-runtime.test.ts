import {describe,expect,it} from "vitest";
import {z} from "zod";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {ContextReferenceService,ContextReferenceValidationError} from "@/lib/ai/context-reference-service";
import type {ContextReference} from "@/lib/ai/context-reference";
import type {AIProvider} from "@/lib/ai/provider";
import type {AIProviderRequest,AgentProviderEvent} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import type {AgentToolExecutionContext,RegisteredAgentTool} from "@/lib/ai/tools/schema";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-31T00:00:00.000Z";

class ScriptedProvider implements AIProvider{
  readonly id="v25-c3-provider";
  readonly requests:AIProviderRequest[]=[];
  private index=0;
  constructor(private readonly scripts:AgentProviderEvent[][]){}
  async *run(request:AIProviderRequest):AsyncIterable<AgentProviderEvent>{
    this.requests.push(request);
    for(const event of this.scripts[this.index++]??[])yield event;
  }
}

const answer=(text:string):AgentProviderEvent[]=>[{type:"text-delta",text},{type:"completed"}];
const reference=(input:Pick<ContextReference,"id"|"kind"|"target">&Partial<Pick<ContextReference,"baseProjectRevision"|"label">>):ContextReference=>({
  id:input.id,
  projectId:"v25-c3-project",
  baseProjectRevision:input.baseProjectRevision??0,
  label:input.label??input.id,
  createdAt:now,
  kind:input.kind,
  target:input.target,
} as ContextReference);

const buildService=(provider:ScriptedProvider,tools=new AgentToolRegistry([]))=>{
  const project=ProjectSchema.parse(createProject({id:"v25-c3-project",name:"C3 context runtime",now,durationInFrames:90}));
  const sessions=new AgentSessionRepository(new InMemoryFileSystemAdapter(),"/v25-c3");
  const context=new AgentContextService({load:async()=>project});
  const contextReferences=new ContextReferenceService({projects:{load:async()=>project}});
  return{
    project,
    sessions,
    service:new AgentSessionService({provider,context,contextReferences,tools,sessions,now:()=>now}),
  };
};

const inspectContextTool=(observe:(context:AgentToolExecutionContext)=>void):RegisteredAgentTool=>({
  definition:{
    id:"inspect_context",
    description:"Test-only read tool for bounded context inspection.",
    risk:"read",
    inputJsonSchema:{type:"object",additionalProperties:false},
    revisionPolicy:"none",
    idempotency:"safe-repeat",
    requiresConfirmation:false,
    errorCodes:["tool_execution_failed"],
  },
  inputSchema:z.object({}).strict(),
  outputSchema:z.object({seen:z.boolean()}).strict(),
  handler:async(_input,context)=>{observe(context);return{seen:true};},
});

describe("V2.5 C3 ContextReference Agent runtime",()=>{
  it("round-trips exact references durably while provider and tools receive bounded context only",async()=>{
    let toolContext:AgentToolExecutionContext|undefined;
    const provider=new ScriptedProvider([
      [{type:"tool-call",call:{id:"call-context",toolId:"inspect_context",arguments:{}}},{type:"completed"}],
      answer("Context received."),
    ]);
    const tools=new AgentToolRegistry([inspectContextTool(context=>{toolContext=context;})]);
    const{project,service}=buildService(provider,tools);
    const session=await service.create({projectId:project.project.id});
    const references:ContextReference[]=[
      reference({id:"ctx-project",kind:"project",target:{},label:"C:\\Users\\private\\project.json"}),
      reference({id:"ctx-track",kind:"track",target:{trackId:"video-main"},label:"Private display label"}),
      reference({id:"ctx-time",kind:"timeline-point",target:{frame:24},label:"Timeline display label"}),
    ];

    const result=await service.runTurn({
      projectId:project.project.id,
      sessionId:session.id,
      userContent:"Use only the attached logical context.",
      executionMode:"plan-only",
      contextReferences:references,
    });

    expect(result.turns[0]?.contextReferences).toEqual(references);
    expect(result.lastContext?.references).toEqual(references);
    expect(result.messages[0]?.content).toBe("Use only the attached logical context.");
    expect(provider.requests).toHaveLength(2);
    expect(provider.requests[0]?.system).toContain('"referenceId":"ctx-project"');
    expect(provider.requests[0]?.system).toContain('"trackId":"video-main"');
    expect(provider.requests[0]?.system).not.toContain("Private display label");
    expect(provider.requests[0]?.system).not.toContain("Timeline display label");
    expect(provider.requests[0]?.system).not.toContain("C:\\Users\\private");
    expect(provider.requests[0]?.system).not.toContain('"createdAt"');
    expect(toolContext?.contextReferences).toEqual([
      {referenceId:"ctx-project",kind:"project",target:{},baseProjectRevision:0,currentProjectRevision:0,status:"resolved"},
      {referenceId:"ctx-track",kind:"track",target:{trackId:"video-main"},baseProjectRevision:0,currentProjectRevision:0,status:"resolved"},
      {referenceId:"ctx-time",kind:"timeline-point",target:{frame:24},baseProjectRevision:0,currentProjectRevision:0,status:"resolved"},
    ]);
    expect(JSON.stringify(toolContext?.contextReferences)).not.toContain("label");
    expect(JSON.stringify(toolContext?.contextReferences)).not.toContain("createdAt");
  });

  it("rejects stale attached context before provider or tool execution and leaves the session unchanged",async()=>{
    let toolExecuted=false;
    const provider=new ScriptedProvider([answer("must not run")]);
    const tools=new AgentToolRegistry([inspectContextTool(()=>{toolExecuted=true;})]);
    const{project,service,sessions}=buildService(provider,tools);
    const session=await service.create({projectId:project.project.id});
    const stale=reference({id:"ctx-stale",kind:"track",target:{trackId:"video-main"},baseProjectRevision:1});

    await expect(service.runTurn({
      projectId:project.project.id,
      sessionId:session.id,
      userContent:"Do not silently retarget this.",
      contextReferences:[stale],
    })).rejects.toBeInstanceOf(ContextReferenceValidationError);

    expect(provider.requests).toHaveLength(0);
    expect(toolExecuted).toBe(false);
    const durable=await sessions.require(project.project.id,session.id);
    expect(durable.turns).toHaveLength(0);
    expect(durable.messages).toHaveLength(0);
    expect(durable.lastContext?.references).toEqual([]);
  });

  it("rejects a deleted logical target instead of substituting another object",async()=>{
    const provider=new ScriptedProvider([answer("must not run")]);
    const{project,service}=buildService(provider);
    const session=await service.create({projectId:project.project.id});
    const missing=reference({id:"ctx-deleted",kind:"clip",target:{clipId:"deleted-clip"},label:"video-main"});

    await expect(service.runTurn({
      projectId:project.project.id,
      sessionId:session.id,
      userContent:"Use the deleted clip.",
      contextReferences:[missing],
    })).rejects.toMatchObject({code:"context_reference_unresolved",message:expect.stringContaining("Clip")});
    expect(provider.requests).toHaveLength(0);
  });
});
