import {describe,expect,it} from "vitest";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {AgentContextService} from "@/lib/ai/context";
import {createVolcengineAgentPlanProviderFromProcessEnv} from "@/lib/ai/providers/volcengine-agent-plan";
import {AgentSessionRepository} from "@/lib/ai/session/repository";
import {AgentSessionService} from "@/lib/ai/service";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";
import {createProjectContextReadTool} from "@/lib/ai/tools/read-tools";
import {createProject} from "@/lib/project/factory";
import {ProjectSchema} from "@/schemas/project";

const live=process.env.RUN_LIVE_VOLCENGINE_AGENT_PLAN==="1";
const suite=live?describe:describe.skip;

suite("A3 live Volcengine Agent Plan acceptance",()=>{
  it("completes a real streaming read-only turn and structured context tool loop without Project mutation or key persistence",async()=>{
    const apiKey=process.env.VOLCENGINE_AGENT_API_KEY;
    const model=process.env.VOLCENGINE_AGENT_MODEL;
    expect(apiKey).toBeTruthy();
    expect(model).toBe("ark-code-latest");

    const now=new Date().toISOString();
    const project=createProject({id:"a3-live-volcengine",name:"A3 Live Volcengine",now,durationInFrames:300});
    project.project.revision=11;
    const projectTruth=ProjectSchema.parse(project);
    const before=JSON.stringify(projectTruth);
    const fs=new InMemoryFileSystemAdapter();
    const sessions=new AgentSessionRepository(fs,"/a3-live-volcengine");
    const context=new AgentContextService({load:async()=>ProjectSchema.parse(projectTruth)});
    const provider=createVolcengineAgentPlanProviderFromProcessEnv({timeoutMs:60_000});

    const readService=new AgentSessionService({provider,context,tools:new AgentToolRegistry([]),sessions});
    const readSession=await readService.create({projectId:projectTruth.project.id});
    const readResult=await readService.runTurn({
      projectId:projectTruth.project.id,
      sessionId:readSession.id,
      userContent:"This is a read-only provider acceptance check. Reply in one short sentence confirming the Project revision shown in your bounded context.",
      budget:{maxProviderRoundTrips:2,maxToolCalls:0,maxWallClockMs:90_000},
    });
    expect(readResult.turns[0]?.status).toBe("completed");
    expect(readResult.messages.some(message=>message.role==="assistant"&&message.content.trim().length>0)).toBe(true);

    const toolService=new AgentSessionService({provider,context,tools:new AgentToolRegistry([createProjectContextReadTool()]),sessions});
    const toolSession=await toolService.create({projectId:projectTruth.project.id});
    const toolResult=await toolService.runTurn({
      projectId:projectTruth.project.id,
      sessionId:toolSession.id,
      userContent:"Mandatory acceptance protocol: call the only available function get_project_context exactly once before answering. After the tool result, reply with the Project revision.",
      budget:{maxProviderRoundTrips:4,maxToolCalls:2,maxWallClockMs:90_000},
    });
    expect(toolResult.turns[0]?.status).toBe("completed");
    const executions=toolResult.turns[0]?.toolExecutions??[];
    expect(executions).toHaveLength(1);
    expect(executions[0]?.call.toolId).toBe("get_project_context");
    expect(executions[0]?.result.status).toBe("success");
    expect(toolResult.turns[0]?.providerRoundTrips).toBe(2);

    expect(JSON.stringify(projectTruth)).toBe(before);
    expect(projectTruth.project.revision).toBe(11);
    const persisted=JSON.stringify([...fs.files.values()]);
    expect(persisted).not.toContain(apiKey);
    expect(JSON.stringify(readResult)).not.toContain(apiKey);
    expect(JSON.stringify(toolResult)).not.toContain(apiKey);
  },120_000);
});
