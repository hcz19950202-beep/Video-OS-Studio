import {describe,expect,it} from "vitest";
import {z} from "zod";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import type {AIProvider} from "@/lib/ai/provider";
import type {AIProviderRequest,AgentProviderEvent} from "@/lib/ai/schema";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import type {RegisteredAgentTool} from "@/lib/ai/tools/schema";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-31T00:00:00.000Z";

class ScriptedProvider implements AIProvider{
  readonly id="v25-c2-provider";
  readonly requests:AIProviderRequest[]=[];
  private index=0;
  constructor(private readonly scripts:AgentProviderEvent[][]){}
  async *run(request:AIProviderRequest):AsyncIterable<AgentProviderEvent>{
    this.requests.push(request);
    for(const event of this.scripts[this.index++]??[])yield event;
  }
}

const buildService=(provider:ScriptedProvider,tools=new AgentToolRegistry([]))=>{
  const project=ProjectSchema.parse(createProject({id:"v25-c2-project",name:"C2 execution mode",now,durationInFrames:90}));
  const sessions=new AgentSessionRepository(new InMemoryFileSystemAdapter(),"/v25-c2");
  const context=new AgentContextService({load:async()=>project});
  return{project,service:new AgentSessionService({provider,context,tools,sessions,now:()=>now})};
};

const answer=(text:string):AgentProviderEvent[]=>[{type:"text-delta",text},{type:"completed"}];
const mutatingRequestTool=(onExecute:()=>void):RegisteredAgentTool=>({
  definition:{
    id:"test_mutating_request",
    description:"Test-only mutating request that requires application approval.",
    risk:"mutating-request",
    inputJsonSchema:{type:"object",additionalProperties:false},
    revisionPolicy:"expected-revision",
    idempotency:"stable-operation-id",
    requiresConfirmation:true,
    errorCodes:["execution_mode_blocked","approval_required","tool_execution_failed"],
  },
  inputSchema:z.object({}).strict(),
  outputSchema:z.object({executed:z.boolean()}).strict(),
  handler:async()=>{onExecute();return{executed:true};},
});

const mutatingScripts=():AgentProviderEvent[][]=>[
  [{type:"tool-call",call:{id:"call_mutation",toolId:"test_mutating_request",arguments:{}}},{type:"completed"}],
  answer("Mutation request was not executed directly."),
];

describe("V2.5 C2 execution mode runtime",()=>{
  it("defaults legacy runTurn calls to Review First without polluting durable user content",async()=>{
    const provider=new ScriptedProvider([answer("Done")]);
    const{project,service}=buildService(provider);
    const session=await service.create({projectId:project.project.id});
    const result=await service.runTurn({projectId:project.project.id,sessionId:session.id,userContent:"Keep my exact prompt"});

    expect(provider.requests[0]?.system).toContain("Execution policy intent: REVIEW FIRST.");
    expect(result.messages[0]?.content).toBe("Keep my exact prompt");
    expect(result.messages[0]?.content).not.toContain("Execution policy intent");
  });

  it("passes Plan Only to provider policy and blocks a mutating-request tool before its handler",async()=>{
    let executed=false;
    const provider=new ScriptedProvider(mutatingScripts());
    const tools=new AgentToolRegistry([mutatingRequestTool(()=>{executed=true;})]);
    const{project,service}=buildService(provider,tools);
    const session=await service.create({projectId:project.project.id});
    const result=await service.runTurn({projectId:project.project.id,sessionId:session.id,userContent:"Only plan this",executionMode:"plan-only"});

    expect(provider.requests[0]?.system).toContain("Execution policy intent: PLAN ONLY.");
    expect(executed).toBe(false);
    expect(result.turns[0]?.toolExecutions[0]?.result).toMatchObject({status:"error",error:{code:"execution_mode_blocked"}});
    expect(result.turns[0]?.status).toBe("completed");
  });

  it("fails closed on legacy confirmation-required mutation tools in Review First and Apply Safe Edits",async()=>{
    for(const executionMode of ["review-first","apply-safe-edits"] as const){
      let executed=false;
      const provider=new ScriptedProvider(mutatingScripts());
      const tools=new AgentToolRegistry([mutatingRequestTool(()=>{executed=true;})]);
      const{project,service}=buildService(provider,tools);
      const session=await service.create({projectId:project.project.id});
      const result=await service.runTurn({projectId:project.project.id,sessionId:session.id,userContent:"Try mutation",executionMode});

      expect(executed).toBe(false);
      expect(result.turns[0]?.toolExecutions[0]?.result).toMatchObject({status:"error",error:{code:"approval_required"}});
    }
  });

  it("keeps Apply Safe Edits conditional on application-owned R2 session eligibility",async()=>{
    const provider=new ScriptedProvider([answer("Proposal path only")]);
    const{project,service}=buildService(provider);
    const session=await service.create({projectId:project.project.id});
    await service.runTurn({projectId:project.project.id,sessionId:session.id,userContent:"Make a safe edit",executionMode:"apply-safe-edits"});

    expect(provider.requests[0]?.system).toContain("Execution policy intent: APPLY SAFE EDITS.");
    expect(provider.requests[0]?.system).toContain("R0/R1");
    expect(provider.requests[0]?.system).toContain("R2 reversible Project mutation");
    expect(provider.requests[0]?.system).toContain("application-owned policy explicitly allows a session override");
    expect(provider.requests[0]?.system).toContain("R3/R4 remain approval-bound");
  });
});
