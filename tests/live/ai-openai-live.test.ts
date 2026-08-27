import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {createOpenAIResponsesProviderFromProcessEnv} from "@/lib/ai/providers/openai-responses";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {createA1AgentToolRegistry} from "@/lib/ai/tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";
import type {VisualPlan} from "@/lib/visual-planner/schema";

const live=process.env.RUN_LIVE_OPENAI==="1";
const suite=live?describe:describe.skip;

suite("A3 live OpenAI Responses acceptance",()=>{
  it("completes a real read-only turn and a real structured context tool call without Project mutation or key persistence",async()=>{
    const apiKey=process.env.OPENAI_API_KEY;
    const model=process.env.OPENAI_MODEL;
    expect(apiKey).toBeTruthy();
    expect(model).toBeTruthy();

    const now=new Date().toISOString();
    const project=createProject({id:"a3-live-openai",name:"A3 Live OpenAI",now,durationInFrames:300});
    project.project.revision=11;
    const projectTruth=ProjectSchema.parse(project);
    const before=JSON.stringify(projectTruth);
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a3-live");
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(projectTruth)});
    const unusedPlan:VisualPlan={
      version:2,
      projectId:projectTruth.project.id,
      generatedAt:now,
      source:"rules",
      context:{intent:"unused live validation fallback"},
      suggestions:[],
      densityBefore:{motionCards:0,cardsPerMinute:0,peakConcurrency:0,averageGapFrames:null,minimumGapFrames:null},
    };
    const tools=createA1AgentToolRegistry({visualPlans:{generate:async()=>unusedPlan}});
    const provider=createOpenAIResponsesProviderFromProcessEnv({timeoutMs:60_000});
    const service=new AgentSessionService({provider,context,tools,sessions});

    const readSession=await service.create({projectId:projectTruth.project.id});
    const readResult=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:readSession.id,
      userContent:"This is a read-only provider acceptance check. Reply in one short sentence confirming the Project revision shown in your bounded context. Do not request any edit or mutation.",
      budget:{maxProviderRoundTrips:4,maxToolCalls:4,maxWallClockMs:90_000},
    });
    expect(readResult.turns[0]?.status).toBe("completed");
    expect(readResult.messages.some(message=>message.role==="assistant"&&message.content.trim().length>0)).toBe(true);

    const toolSession=await service.create({projectId:projectTruth.project.id});
    const toolResult=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:toolSession.id,
      userContent:"For this acceptance check, call the allow-listed get_project_context function before answering. After the tool result, reply with the Project revision. Do not call proposal tools and do not request any mutation.",
      budget:{maxProviderRoundTrips:4,maxToolCalls:4,maxWallClockMs:90_000},
    });
    expect(toolResult.turns[0]?.status).toBe("completed");
    const executions=toolResult.turns[0]?.toolExecutions??[];
    expect(executions.some(execution=>execution.call.toolId==="get_project_context"&&execution.result.status==="success")).toBe(true);

    expect(JSON.stringify(projectTruth)).toBe(before);
    expect(projectTruth.project.revision).toBe(11);
    const persisted=JSON.stringify([...fs.files.values()]);
    expect(persisted).not.toContain(apiKey);
    expect(JSON.stringify(readResult)).not.toContain(apiKey);
    expect(JSON.stringify(toolResult)).not.toContain(apiKey);
  },120_000);
});
