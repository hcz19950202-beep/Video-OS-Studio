import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {OpenAIResponsesProvider,type OpenAIResponsesFetch} from "@/lib/ai/providers/openai-responses";
import {loadOpenAIResponsesProviderConfig} from "@/lib/ai/providers/openai-config";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const now="2026-08-27T00:00:00.000Z";

const sse=(events:unknown[])=>new Response(
  events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join(""),
  {status:200,headers:{"Content-Type":"text/event-stream"}},
);

describe("OpenAI Responses provider through A2 AgentRunner",()=>{
  it("completes a read-only structured tool loop without mutating Project truth",async()=>{
    const project=createProject({id:"openai-agent-project",name:"OpenAI Agent",now,durationInFrames:300});
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
          {type:"response.output_item.done",output_index:0,item:{type:"function_call",id:"fc_context",call_id:"call_context_live",name:"get_project_context",arguments:"{}"}},
          {type:"response.completed",response:{usage:{input_tokens:12,output_tokens:3,total_tokens:15}}},
        ]);
      }
      return sse([
        {type:"response.output_text.delta",delta:"Project context loaded safely."},
        {type:"response.completed",response:{usage:{input_tokens:18,output_tokens:5,total_tokens:23}}},
      ]);
    }) as OpenAIResponsesFetch;
    const provider=new OpenAIResponsesProvider({
      config:loadOpenAIResponsesProviderConfig(
        {OPENAI_API_KEY:"sk-cloud-fixture",OPENAI_MODEL:"gpt-5.6"},
        {endpoint:"https://example.test/v1/responses",timeoutMs:2_000},
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
      model:"gpt-5.6",
      store:false,
      reasoning:{effort:"none"},
    });
    const secondInput=requestBodies[1]?.input as Array<Record<string,unknown>>;
    expect(secondInput).toEqual(expect.arrayContaining([
      {type:"function_call",call_id:"call_context_live",name:"get_project_context",arguments:"{}"},
      expect.objectContaining({type:"function_call_output",call_id:"call_context_live"}),
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
    expect(JSON.stringify([...fs.files.values()])).not.toContain("sk-cloud-fixture");
  });
});
