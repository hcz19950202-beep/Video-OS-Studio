import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {VolcengineAgentPlanProvider,type VolcengineAgentPlanFetch} from "@/lib/ai/providers/volcengine-agent-plan";
import {loadVolcengineAgentPlanProviderConfig} from "@/lib/ai/providers/volcengine-agent-plan-config";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const now="2026-08-27T00:00:00.000Z";

describe("Volcengine Agent Plan provider through A2 AgentRunner",()=>{
  it("completes a two-round read-only tool loop without mutating Project truth",async()=>{
    const project=createProject({id:"volc-agent-project",name:"Volcengine Agent",now,durationInFrames:300});
    project.project.revision=7;
    const projectTruth=ProjectSchema.parse(project);
    const before=JSON.stringify(projectTruth);
    const requestBodies:Record<string,unknown>[]=[];
    let requestIndex=0;
    const fetchImpl=(async(_input:URL|RequestInfo,init?:RequestInit)=>{
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string,unknown>);
      requestIndex+=1;
      if(requestIndex===1){
        return new Response(JSON.stringify({
          choices:[{
            index:0,
            finish_reason:"tool_calls",
            message:{role:"assistant",content:null,tool_calls:[{id:"call_context_live",type:"function",function:{name:"get_project_context",arguments:"{}"}}]},
          }],
          usage:{prompt_tokens:12,completion_tokens:3,total_tokens:15},
        }),{status:200,headers:{"Content-Type":"application/json"}});
      }
      return new Response(JSON.stringify({
        choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:"Project context loaded safely."}}],
        usage:{prompt_tokens:18,completion_tokens:5,total_tokens:23},
      }),{status:200,headers:{"Content-Type":"application/json"}});
    }) as VolcengineAgentPlanFetch;
    const provider=new VolcengineAgentPlanProvider({
      config:loadVolcengineAgentPlanProviderConfig(
        {VOLCENGINE_AGENT_API_KEY:"volc-cloud-fixture",VOLCENGINE_AGENT_MODEL:"ark-code-latest"},
        {endpoint:"https://example.test/api/plan/v3/chat/completions",timeoutMs:2_000},
      ),
      fetchImpl,
    });
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/runtime");
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(projectTruth)});
    const tools=new AgentToolRegistry([createProjectContextReadTool()]);
    const service=new AgentSessionService({provider,context,tools,sessions,now:()=>now});
    const session=await service.create({projectId:projectTruth.project.id});

    const completed=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:session.id,
      userContent:"Call get_project_context, then summarize the current Project revision.",
    });

    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0]).toMatchObject({model:"ark-code-latest",stream:false,tool_choice:"auto"});
    const secondMessages=requestBodies[1]?.messages as Array<Record<string,unknown>>;
    expect(secondMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({role:"assistant",tool_calls:expect.any(Array)}),
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
    expect(JSON.stringify([...fs.files.values()])).not.toContain("volc-cloud-fixture");
  });
});
