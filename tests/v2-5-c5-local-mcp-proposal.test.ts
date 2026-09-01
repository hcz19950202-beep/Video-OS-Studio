import {afterEach,describe,expect,it,vi} from "vitest";
import {z} from "zod";
import {AgentContextService} from "@/lib/ai/context";
import {AgentSessionAlreadyExistsError} from "@/lib/ai/session/repository";
import {AgentSessionSchema,type AgentSession} from "@/lib/ai/session/schema";
import {SharedAgentToolContractSchema} from "@/lib/ai/tools/shared-contract";
import {
  C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
  createC5SharedProposalTools,
} from "@/lib/ai/tools/shared-proposal-tools";
import {SharedToolRegistry,type RegisteredSharedTool} from "@/lib/ai/tools/shared-registry";
import {LOCAL_MCP_PROTOCOL_VERSION,LocalMcpBridgeController} from "@/lib/mcp/bridge-controller";
import {LocalMcpHttpServer} from "@/lib/mcp/local-http-server";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const NOW="2026-08-31T21:00:00.000Z";
const PROPOSAL_ID="55555555-5555-4555-8555-555555555555";
const project=ProjectSchema.parse(createProject({
  id:"c5-mcp-proposal-project",
  name:"C5 MCP Proposal Project",
  now:NOW,
  durationInFrames:300,
}));

const createSessions=()=>{
  const sessions=new Map<string,AgentSession>();
  return{
    store:{
      load:async(projectId:string,sessionId:string)=>sessions.get(`${projectId}:${sessionId}`)??null,
      create:async(input:AgentSession)=>{
        const parsed=AgentSessionSchema.parse(input);
        const key=`${parsed.projectId}:${parsed.id}`;
        if(sessions.has(key))throw new AgentSessionAlreadyExistsError(parsed.projectId,parsed.id);
        sessions.set(key,parsed);
        return structuredClone(parsed);
      },
      mutate:async(projectId:string,sessionId:string,mutation:(current:AgentSession)=>AgentSession|Promise<AgentSession>)=>{
        const key=`${projectId}:${sessionId}`;
        const current=sessions.get(key);
        if(!current)throw new Error("missing test session");
        const next=AgentSessionSchema.parse(await mutation(structuredClone(current)));
        sessions.set(key,next);
        return structuredClone(next);
      },
    },
    values:()=>[...sessions.values()].map(item=>structuredClone(item)),
  };
};

const directWriteHandler=vi.fn(()=>({ok:true}));
const DirectInput=z.object({}).strict();
const DirectOutput=z.object({ok:z.boolean()}).strict();
const directWriteTool:RegisteredSharedTool={
  contract:SharedAgentToolContractSchema.parse({
    toolId:"direct_project_write_forbidden",
    version:"1.0.0",
    description:"Test-only direct Project mutation capability that must never cross MCP boundary.",
    inputJsonSchema:{type:"object",properties:{},additionalProperties:false},
    outputJsonSchema:{type:"object",properties:{ok:{type:"boolean"}},required:["ok"],additionalProperties:false},
    riskClass:"R2",
    requiredScopes:["project:write"],
    approval:{defaultMode:"ask",allowSessionOverride:true},
    revisionPolicy:"expected-revision",
    idempotency:"stable-operation-id",
    timeoutMs:1_000,
    cancellation:"request-scoped",
    audit:{eventKind:"test.direct_project_write",recordArguments:false,sensitiveArgumentKeys:[],recordResultSummary:true},
  }),
  inputSchema:DirectInput,
  outputSchema:DirectOutput,
  handler:directWriteHandler,
};

const running:LocalMcpHttpServer[]=[];
afterEach(async()=>{
  directWriteHandler.mockClear();
  await Promise.all(running.splice(0).map(server=>server.isRunning()?server.stop():Promise.resolve()));
});

const createHarness=async()=>{
  const sessions=createSessions();
  const context=new AgentContextService({load:async projectId=>{
    if(projectId!==project.project.id)throw new Error("unknown project");
    return project;
  }});
  const controller=new LocalMcpBridgeController(context);
  controller.setActiveProject(project.project.id,{});
  const credential=controller.issueCredential({clientType:"test",clientLabel:"C5 proposal client"});
  const registry=new SharedToolRegistry([
    ...createC5SharedProposalTools({sessions:sessions.store,now:()=>NOW,makeId:()=>PROPOSAL_ID}),
    directWriteTool,
  ]);
  const server=new LocalMcpHttpServer(controller,registry);
  const started=await server.start();
  running.push(server);
  return{sessions,controller,credential,address:started.address};
};

const rpcBody=(method:string,params:Record<string,unknown>={})=>JSON.stringify({
  jsonrpc:"2.0",
  id:1,
  method,
  params:{
    ...params,
    _meta:{"io.modelcontextprotocol/protocolVersion":LOCAL_MCP_PROTOCOL_VERSION},
  },
});

const post=(harness:Awaited<ReturnType<typeof createHarness>>,method:string,params:Record<string,unknown>={},name?:string)=>
  fetch(harness.address,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "MCP-Protocol-Version":LOCAL_MCP_PROTOCOL_VERSION,
      "Mcp-Method":method,
      ...(name?{"Mcp-Name":name}:{}),
      Authorization:`Bearer ${harness.credential.token}`,
    },
    body:rpcBody(method,params),
  });

const proposalInput={
  title:"Review opening edit",
  summary:"Create a reviewable edit without mutating the Project.",
  operations:[{
    id:"script-edit-http-1",
    kind:"script-edit",
    summary:"Review opening copy.",
    payload:{text:"New opening"},
  }],
};

describe("V2.5 C5 Local MCP Proposal boundary",()=>{
  it("lists and calls proposal-only R1 while hiding and refusing direct Project write",async()=>{
    const before=JSON.stringify(project);
    const harness=await createHarness();

    const listed=await post(harness,"tools/list");
    expect(listed.status).toBe(200);
    const catalog=await listed.json() as {result:{tools:Array<{name:string;annotations:{readOnlyHint:boolean};_meta:Record<string,unknown>}>}};
    expect(catalog.result.tools.map(tool=>tool.name)).toEqual([C5_CREATE_EDIT_PROPOSAL_TOOL_ID]);
    expect(catalog.result.tools[0]?.annotations.readOnlyHint).toBe(false);
    expect(catalog.result.tools[0]?._meta["video-os/riskClass"]).toBe("R1");

    const created=await post(harness,"tools/call",{name:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,arguments:proposalInput},C5_CREATE_EDIT_PROPOSAL_TOOL_ID);
    expect(created.status).toBe(200);
    const createdPayload=await created.json() as {result:{isError:boolean;structuredContent:{proposal:{baseProjectRevision:number;status:string}}}};
    expect(createdPayload.result.isError).toBe(false);
    expect(createdPayload.result.structuredContent.proposal).toMatchObject({
      baseProjectRevision:project.project.revision,
      status:"draft",
    });
    expect(harness.sessions.values()).toHaveLength(1);
    expect(harness.sessions.values()[0]?.proposals).toHaveLength(1);
    expect(harness.sessions.values()[0]?.operationAudit).toEqual([expect.objectContaining({
      source:"local-mcp",
      action:"proposal-created",
      outcome:"success",
      toolId:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,
    })]);
    expect(JSON.stringify(project)).toBe(before);

    const direct=await post(harness,"tools/call",{name:"direct_project_write_forbidden",arguments:{}},"direct_project_write_forbidden");
    expect(direct.status).toBe(400);
    expect(directWriteHandler).not.toHaveBeenCalled();
    expect(JSON.stringify(project)).toBe(before);
  });

  it("keeps a warmed synchronous Proposal invocation below the C5 250ms control-plane budget",async()=>{
    const before=JSON.stringify(project);
    const harness=await createHarness();
    expect((await post(harness,"tools/list")).status).toBe(200);

    const startedAt=performance.now();
    const created=await post(harness,"tools/call",{name:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,arguments:proposalInput},C5_CREATE_EDIT_PROPOSAL_TOOL_ID);
    const elapsedMs=performance.now()-startedAt;

    expect(created.status).toBe(200);
    expect(elapsedMs).toBeLessThan(250);
    expect(JSON.stringify(project)).toBe(before);
  });

  it("rejects caller-controlled revision or approval fields before Proposal handler execution",async()=>{
    const harness=await createHarness();
    for(const injected of [
      {...proposalInput,expectedRevision:999},
      {...proposalInput,baseProjectRevision:999},
      {...proposalInput,approved:true},
      {...proposalInput,apply:true},
    ]){
      const response=await post(harness,"tools/call",{name:C5_CREATE_EDIT_PROPOSAL_TOOL_ID,arguments:injected},C5_CREATE_EDIT_PROPOSAL_TOOL_ID);
      expect(response.status).toBe(400);
    }
    expect(harness.sessions.values()).toHaveLength(0);
  });
});
