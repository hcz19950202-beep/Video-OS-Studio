import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {createOpenAIResponsesProviderFromProcessEnv} from "@/lib/ai/providers/openai-responses";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const live=process.env.RUN_LIVE_OPENAI==="1";
const suite=live?describe:describe.skip;

suite("A3 live OpenAI Responses acceptance",()=>{
  it("completes a real read-only turn and a real structured context tool call without Project mutation or key persistence",async()=>{
    const apiKey=process.env.OPENAI_API_KEY;
    const model=process.env.OPENAI_MODEL;
    expect(apiKey).toBeTruthy();
    expect(model).toMatch(/^gpt-5\.6(?:$|-)/);

    const now=new Date().toISOString();
    const project=createProject({id:"a3-live-openai",name:"A3 Live OpenAI",now,durationInFrames:300});
    project.project.revision=11;
    const projectTruth=ProjectSchema.parse(project);
    const before=JSON.stringify(projectTruth);
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a3-live");
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(projectTruth)});
    const tools=new AgentToolRegistry([createProjectContextReadTool()]);
    const provider=createOpenAIResponsesProviderFromProcessEnv({timeoutMs:60_000});
    const service=new AgentSessionService({provider,context,tools,sessions});

    const readSession=await service.create({projectId:projectTruth.project.id});
    const readResult=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:readSession.id,
      userContent:"This is a read-only provider acceptance check. Reply in one short sentence confirming the Project revision shown in your bounded context. Do not call a tool for this first turn.",
      budget:{maxProviderRoundTrips:4,maxToolCalls:4,maxWallClockMs:90_000},
    });
    expect(readResult.turns[0]?.status).toBe("completed");
    expect(readResult.messages.some(message=>message.role==="assistant"&&message.content.trim().length>0)).toBe(true);

    const toolSession=await service.create({projectId:projectTruth.project.id});
    const toolResult=await service.runTurn({
      projectId:projectTruth.project.id,
      sessionId:toolSession.id,
      userContent:"For this acceptance check, you must call the only available function, get_project_context, before answering. After the tool result, reply with the Project revision.",
      budget:{maxProviderRoundTrips:4,maxToolCalls:4,maxWallClockMs:90_000},
    });
    expect(toolResult.turns[0]?.status).toBe("completed");
    const executions=toolResult.turns[0]?.toolExecutions??[];
    expect(executions).toHaveLength(1);
    expect(executions[0]?.call.toolId).toBe("get_project_context");
    expect(executions[0]?.result.status).toBe("success");

    expect(JSON.stringify(projectTruth)).toBe(before);
    expect(projectTruth.project.revision).toBe(11);
    const persisted=JSON.stringify([...fs.files.values()]);
    expect(persisted).not.toContain(apiKey);
    expect(JSON.stringify(readResult)).not.toContain(apiKey);
    expect(JSON.stringify(toolResult)).not.toContain(apiKey);
  },120_000);
});
