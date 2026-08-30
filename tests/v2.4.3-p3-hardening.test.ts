import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import type {AIProvider} from "@/lib/ai/provider";
import {AIProviderRequestSchema,type AgentProviderEvent} from "@/lib/ai/schema";
import {loadOpenAIResponsesProviderConfig} from "@/lib/ai/providers/openai-config";
import {OpenAIResponsesProvider,type OpenAIResponsesFetch} from "@/lib/ai/providers/openai-responses";
import {loadDeepSeekChatProviderConfig} from "@/lib/ai/providers/deepseek-config";
import {DeepSeekChatProvider,type DeepSeekChatFetch} from "@/lib/ai/providers/deepseek-chat";
import {loadVolcengineAgentPlanProviderConfig} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {VolcengineAgentPlanProvider,type VolcengineAgentPlanFetch} from "@/lib/ai/providers/volcengine-agent-plan";
import {createProject} from "@/lib/project/factory";
import {WorkflowDefinitionRegistry,WorkflowStageRegistry} from "@/lib/workflows/registry";
import {WorkflowRunner} from "@/lib/workflows/runner";
import {WorkflowDefinitionSchema} from "@/lib/workflows/schema";
import {WorkflowService} from "@/lib/workflows/service";
import {FileWorkflowStore} from "@/lib/workflows/store";

const now="2026-08-31T00:00:00.000Z";
const roots:string[]=[];
const encoder=new TextEncoder();

afterEach(async()=>{
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));
});

const providerRequest=()=>AIProviderRequestSchema.parse({
  system:"Return a bounded response.",
  messages:[{id:"msg-user-p3",role:"user",content:"hello",createdAt:now}],
  tools:[],
  maxOutputTokens:64,
});

const collect=async(provider:AIProvider)=>{
  const events:AgentProviderEvent[]=[];
  for await(const event of provider.run(providerRequest()))events.push(event);
  return events;
};

const openSseResponse=(payload:string,onCancel:()=>void)=>new Response(
  new ReadableStream<Uint8Array>({
    start(controller){controller.enqueue(encoder.encode(payload));},
    cancel(){onCancel();},
  }),
  {status:200,headers:{"Content-Type":"text/event-stream"}},
);

describe("V2.4.3 P3 provider stream cleanup",()=>{
  it("cancels unread OpenAI response bytes after response.completed without changing events",async()=>{
    let cancels=0;
    const fetchImpl=(async()=>openSseResponse(
      `data: ${JSON.stringify({type:"response.completed",response:{usage:{input_tokens:2,output_tokens:1,total_tokens:3}}})}\n\n`,
      ()=>{cancels+=1;},
    )) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({
      config:loadOpenAIResponsesProviderConfig({OPENAI_API_KEY:"sk-p3-test",OPENAI_MODEL:"gpt-5.6"},{endpoint:"https://example.test/v1/responses",timeoutMs:2_000}),
      fetchImpl,
    });

    expect(await collect(provider)).toEqual([{type:"completed",usage:{inputTokens:2,outputTokens:1,totalTokens:3}}]);
    expect(cancels).toBe(1);
  });

  it("cancels unread DeepSeek response bytes after [DONE] without changing events",async()=>{
    let cancels=0;
    const payload=[
      `data: ${JSON.stringify({choices:[{index:0,delta:{content:"ok"},finish_reason:"stop"}],usage:null})}\n\n`,
      "data: [DONE]\n\n",
    ].join("");
    const fetchImpl=(async()=>openSseResponse(payload,()=>{cancels+=1;})) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({
      config:loadDeepSeekChatProviderConfig({DEEPSEEK_API_KEY:"ds-p3-test",DEEPSEEK_MODEL:"deepseek-v4-pro"},{endpoint:"https://example.test/chat/completions",timeoutMs:2_000}),
      fetchImpl,
    });

    expect(await collect(provider)).toEqual([{type:"text-delta",text:"ok"},{type:"completed"}]);
    expect(cancels).toBe(1);
  });

  it("cancels unread Volcengine response bytes after [DONE] without changing events",async()=>{
    let cancels=0;
    const payload=[
      `data: ${JSON.stringify({choices:[{index:0,delta:{content:"ok"},finish_reason:"stop"}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}})}\n\n`,
      "data: [DONE]\n\n",
    ].join("");
    const fetchImpl=(async()=>openSseResponse(payload,()=>{cancels+=1;})) as VolcengineAgentPlanFetch;
    const provider=new VolcengineAgentPlanProvider({
      config:loadVolcengineAgentPlanProviderConfig({VOLCENGINE_AGENT_API_KEY:"volc-p3-test",VOLCENGINE_AGENT_MODEL:"ark-code-latest"},{endpoint:"https://example.test/api/plan/v3/chat/completions",timeoutMs:2_000}),
      fetchImpl,
    });

    expect(await collect(provider)).toEqual([{type:"text-delta",text:"ok"},{type:"completed",usage:{inputTokens:2,outputTokens:1,totalTokens:3}}]);
    expect(cancels).toBe(1);
  });
});

describe("V2.4.3 P3 Workflow error preservation",()=>{
  it("preserves the operational failure and the secondary durable save failure without claiming failed state persisted",async()=>{
    const root=await mkdtemp(join(tmpdir(),"video-os-p3-hardening-"));
    roots.push(root);
    const store=new FileWorkflowStore(root);
    const definitions=new WorkflowDefinitionRegistry();
    const flow=WorkflowDefinitionSchema.parse({
      id:"p3-hardening-flow",
      version:"1",
      name:"P3 hardening flow",
      scenario:"talking-head",
      entryStageIds:["analysis"],
      stages:[{
        id:"analysis",
        kind:"analysis",
        dependsOn:[],
        optional:false,
        retryable:true,
        reviewRequired:false,
        invalidates:[],
        executorKey:"executor-analysis",
      }],
    });
    definitions.register(flow);
    const stages=new WorkflowStageRegistry();
    const runner=new WorkflowRunner(store,definitions,stages,undefined,{jobPollIntervalMs:2});
    const project=createProject({id:"p3-project",name:"P3 Project",now,width:1920,height:1080,fps:30,durationInFrames:120});
    const service=new WorkflowService({load:async()=>project},store,definitions,runner);
    const run=await service.create({projectId:"p3-project",definitionId:flow.id,definitionVersion:flow.version,sourceAssetIds:[],expectedProjectRevision:0});

    const operationalError=Object.assign(new Error("primary execution failure"),{code:"P3_PRIMARY",retryable:true});
    const persistenceError=new Error("secondary durable save failure");
    const realSave=store.save.bind(store);
    vi.spyOn(store,"save").mockImplementation(async candidate=>{
      if(candidate.status==="failed")throw persistenceError;
      return realSave(candidate);
    });
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    stages.register("executor-analysis",{start:async()=>{await gate;throw operationalError;}});

    await service.start(run.id);
    const idle=runner.waitForIdle(run.id);
    release();

    let thrown:unknown;
    try{await idle;}catch(error){thrown=error;}
    expect(thrown).toBeInstanceOf(AggregateError);
    const aggregate=thrown as AggregateError;
    expect(aggregate.errors).toEqual([operationalError,persistenceError]);
    expect(aggregate.message).not.toContain(persistenceError.message);

    const persisted=await store.get(run.id);
    expect(persisted?.status).toBe("running");
    expect(persisted?.stageExecutions[0]?.status).toBe("running");
    expect(persisted?.error).toBeUndefined();
  });
});
