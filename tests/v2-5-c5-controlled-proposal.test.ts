import {describe,expect,it} from "vitest";
import {AgentContextService} from "@/lib/ai/context";
import {AgentSessionAlreadyExistsError} from "@/lib/ai/session/repository";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import {SharedToolScopeSchema} from "@/lib/ai/tools/shared-contract";
import {
  C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
  createC5SharedProposalTools,
} from "@/lib/ai/tools/shared-proposal-tools";
import {SharedToolRegistry} from "@/lib/ai/tools/shared-registry";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const SESSION_ID="11111111-1111-4111-8111-111111111111";
const PROPOSAL_ID="22222222-2222-4222-8222-222222222222";
const NOW="2026-08-31T20:00:00.000Z";

const project=ProjectSchema.parse(createProject({
  id:"c5-proposal-project",
  name:"C5 Proposal Boundary",
  now:NOW,
  durationInFrames:300,
}));

const createSessions=()=>{
  let stored:AgentSession|null=null;
  return {
    store:{
      load:async(projectId:string,sessionId:string)=>
        stored&&stored.projectId===projectId&&stored.id===sessionId?structuredClone(stored):null,
      create:async(input:AgentSession)=>{
        if(stored)throw new AgentSessionAlreadyExistsError(input.projectId,input.id);
        stored=AgentSessionSchema.parse(structuredClone(input));
        return structuredClone(stored);
      },
      mutate:async(
        projectId:string,
        sessionId:string,
        mutation:(current:AgentSession)=>AgentSession|Promise<AgentSession>,
      )=>{
        if(!stored||stored.projectId!==projectId||stored.id!==sessionId)throw new Error("missing test session");
        stored=AgentSessionSchema.parse(await mutation(structuredClone(stored)));
        return structuredClone(stored);
      },
    },
    read:()=>stored?structuredClone(stored):null,
  };
};

const createHarness=async()=>{
  const sessions=createSessions();
  const contextService=new AgentContextService({load:async(projectId)=>{
    if(projectId!==project.project.id)throw new Error("Unknown Project");
    return project;
  }});
  const snapshot=await contextService.build(project.project.id,{});
  const registry=new SharedToolRegistry(createC5SharedProposalTools({
    sessions:sessions.store,
    now:()=>NOW,
    makeId:()=>PROPOSAL_ID,
  }));
  return{sessions,snapshot,registry};
};

const validInput={
  title:"Tighten opening caption",
  summary:"Review a bounded script edit before any Project mutation is allowed.",
  rationale:["The external Agent may propose the edit but cannot apply it."],
  operations:[{
    id:"script-edit-1",
    kind:"script-edit" as const,
    summary:"Replace the opening caption copy.",
    payload:{text:"New opening caption"},
  }],
  warnings:[],
};

describe("V2.5 C5 controlled Proposal boundary",()=>{
  it("adds a proposal-only authority scope distinct from Project write",()=>{
    expect(SharedToolScopeSchema.parse("project:propose")).toBe("project:propose");
    expect(SharedToolScopeSchema.parse("project:write")).toBe("project:write");
  });

  it("exposes create_edit_proposal as R1 snapshot/proposal-only authority with no Project write scope",()=>{
    const tool=createC5SharedProposalTools({sessions:createSessions().store})[0];
    expect(tool?.contract).toMatchObject({
      toolId:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
      riskClass:"R1",
      requiredScopes:["project:read","project:propose"],
      approval:{defaultMode:"auto",allowSessionOverride:false},
      revisionPolicy:"snapshot",
      idempotency:"proposal-only",
    });
    expect(tool?.contract.requiredScopes).not.toContain("project:write");
  });

  it("persists a draft Proposal and MCP audit entry at the authenticated snapshot revision without changing Project data",async()=>{
    const before=JSON.stringify(project);
    const {registry,sessions,snapshot}=await createHarness();
    const result=await registry.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID,validInput,{
      transport:"mcp",
      projectId:project.project.id,
      requestId:"c5-create-1",
      sessionId:SESSION_ID,
      projectContext:snapshot,
    });

    expect(result).toMatchObject({
      status:"success",
      output:{proposal:{
        id:PROPOSAL_ID,
        sessionId:SESSION_ID,
        projectId:project.project.id,
        baseProjectRevision:snapshot.baseProjectRevision,
        status:"draft",
      }},
    });
    const persisted=sessions.read();
    expect(persisted?.providerId).toBe("local-mcp");
    expect(persisted?.proposals).toHaveLength(1);
    expect(persisted?.proposals[0]?.baseProjectRevision).toBe(snapshot.baseProjectRevision);
    expect(persisted?.operationAudit).toEqual([{
      id:`proposal-create:${PROPOSAL_ID}`,
      source:"local-mcp",
      action:"proposal-created",
      outcome:"success",
      proposalId:PROPOSAL_ID,
      toolId:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
      requestId:"c5-create-1",
      providerId:"local-mcp",
      createdAt:NOW,
    }]);
    expect(JSON.stringify(project)).toBe(before);
  });

  it("attributes the same durable Proposal audit contract to the built-in Agent surface",async()=>{
    const before=JSON.stringify(project);
    const {registry,sessions,snapshot}=await createHarness();
    const result=await registry.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID,validInput,{
      transport:"agent",
      projectId:project.project.id,
      requestId:"c5-agent-create-1",
      sessionId:SESSION_ID,
      projectContext:snapshot,
    });

    expect(result.status).toBe("success");
    expect(sessions.read()).toMatchObject({
      providerId:"builtin-agent",
      operationAudit:[{
        id:`proposal-create:${PROPOSAL_ID}`,
        source:"builtin-agent",
        action:"proposal-created",
        outcome:"success",
        proposalId:PROPOSAL_ID,
        toolId:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
        requestId:"c5-agent-create-1",
        providerId:"builtin-agent",
        createdAt:NOW,
      }],
    });
    expect(JSON.stringify(project)).toBe(before);
  });

  it("rejects Project authority fields instead of allowing the caller to choose revision or approval",async()=>{
    const {registry,sessions,snapshot}=await createHarness();
    const result=await registry.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID,{
      ...validInput,
      baseProjectRevision:snapshot.baseProjectRevision+100,
      approved:true,
    },{
      transport:"mcp",
      projectId:project.project.id,
      requestId:"c5-smuggle-1",
      sessionId:SESSION_ID,
      projectContext:snapshot,
    });

    expect(result).toMatchObject({status:"error",error:{code:"invalid_tool_arguments"}});
    expect(sessions.read()).toBeNull();
  });

  it("fails closed when the durable session or authenticated Project snapshot is absent",async()=>{
    const sessions=createSessions();
    const registry=new SharedToolRegistry(createC5SharedProposalTools({sessions:sessions.store}));
    await expect(registry.execute(C5_CREATE_EDIT_PROPOSAL_TOOL_ID,validInput,{
      transport:"mcp",
      projectId:project.project.id,
      requestId:"c5-no-session",
    })).resolves.toMatchObject({status:"error",error:{code:"proposal_session_unavailable"}});
    expect(sessions.read()).toBeNull();
  });
});
