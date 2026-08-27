import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {DeepSeekChatProvider,type DeepSeekChatFetch} from "@/lib/ai/providers/deepseek-chat";
import {loadDeepSeekChatProviderConfig} from "@/lib/ai/providers/deepseek-config";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const now="2026-08-27T00:00:00.000Z";

const sse=(events:unknown[])=>new Response(
  `${events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`,
  {status:200,headers:{"Content-Type":"text/event-stream"}},
);

describe("DeepSeek Chat provider through A2 AgentRunner",()=>{
  it("completes a read-only structured tool loop without mutating Project truth",async()=>{
    const project=createProject({id:"deepseek-agent-project",name:"DeepSeek Agent",now,durationInFrames:300});
    project.project.revision=7;
    const projectTruth=ProjectSchema.parse(project);
    const before=JSON.stringify(projectTruth);
    const requestBodies:Record<string,unknown>[]=[];
    let requestIndex=0;
    const fetchImpl=(async(_input:URL|RequestInfo,init?:RequestInit)=>{
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string,unknown>);
      requestIndex+=1;
      if(requestIndex===1){
        return sse([
          {choices:[{index:0,delta:{tool_calls:[{index:0,id:"call_context_live",type:"function",function:{name:"get_project_context",arguments:"{}"}}]},finish_reason:"tool_calls"}],usage:null},
          {choices:[],usage:{prompt_tokens:12,completion_tokens:3,total_tokens:15}},
        ]);
      }
      return sse([
        {choices:[{index:0,delta:{content:"Project context loaded safely."},finish_reason:"stop"}],usage:null},
        {choices:[],usage:{prompt_tokens:18,completion_tokens:5,total_tokens:23}},
      ]);
    }) as DeepSeekChatFetch;
    const provider=new DeepSeekChatProvider({
      config:loadDeepSeekChatProviderConfig(
        {DEEPSEEK_API_KEY:"ds-cloud-fixture",DEEPSEEK_MODEL:"deepseek-v4-pro"},
        {endpoint:"https://example.test/chat/completions",timeoutMs:2_000},
      ),
      fetchImpl,
    });
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/runtime");
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(projectTruth)});
    const unusedPlan:VisualPlan={
      version:2,
      projectId:projectTruth.project.id,
      generatedAt:now,
      source:"rules",
      context:{intent:"unused"},
      suggestions:[],
      densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
    };
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>unusedPlan}});
    const service=new AgentSessionService({provider,context,tools,sessions,now:()=>now});
    const session=await service.create({projectId:projectTruth.project.id});

    const completed=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:session.id,
      userContent:"Read the current Project context, then summarize it.",
    });

    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0]).toMatchObject({
      model:"deepseek-v4-pro",
      thinking:{type:"disabled"},
      stream:true,
    });
    const secondMessages=requestBodies[1]?.messages as Array<Record<string,unknown>>;
    expect(secondMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({role:"assistant",tool_calls:[{id:"call_context_live",type:"function",function:{name:"get_project_context",arguments:"{}"}}]}),
      expect.objectContaining({role:"tool",tool_call_id:"call_context_live"}),
    ]));
    expect(completed.turns).toHaveLength(1);
    expect(completed.turns[0]?.status).toBe("completed");
    expect(completed.turns[0]?.providerRoundTrips).toBe(2);
    expect(completed.turns[0]?.toolExecutions).toHaveLength(1);
    expect(completed.turns[0]?.toolExecutions[0]?.call.toolId).toBe("get_project_context");
    expect(completed.messages.at(-1)?.content).toBe("Project context loaded safely.");
    expect(completed.usage).toEqual({inputTokens:30,outputTokens:8,totalTokens:38});
    expect(JSON.stringify(projectTruth)).toBe(before);
    expect(projectTruth.project.revision).toBe(7);
    expect(JSON.stringify([...fs.files.values()])).not.toContain("ds-cloud-fixture");
  });
});
