import {afterEach,describe,expect,it,vi} from "vitest";
import {createAgentSession,listAgentSessions,runAgentTurn} from "@/lib/client/agent";

afterEach(()=>vi.unstubAllGlobals());

describe("Agent client provider and Skill selection",()=>{
  it("sends provider and model only when creating a new session",async()=>{
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>new Response(JSON.stringify({session:{id:"session-1"}}),{status:201,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);

    await createAgentSession("project one",{
      providerId:"deepseek-chat",
      model:"deepseek-v4-pro",
      selection:{selectedClipIds:["clip-1"]},
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const[url,init]=fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("/api/projects/project%20one/agent/sessions");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      providerId:"deepseek-chat",
      model:"deepseek-v4-pro",
      selection:{selectedClipIds:["clip-1"]},
    });
  });

  it("hydrates provider and built-in Skill catalogs for Composer selection",async()=>{
    const payload={
      sessions:[],
      provider:{providerId:"openai-responses",label:"OpenAI Responses",model:"gpt-5.6",models:["gpt-5.6"],configured:true,selectable:true,isDefault:true},
      providers:[
        {providerId:"openai-responses",label:"OpenAI Responses",model:"gpt-5.6",models:["gpt-5.6"],configured:true,selectable:true,isDefault:true},
        {providerId:"deepseek-chat",label:"DeepSeek Chat",model:"deepseek-v4-flash",models:["deepseek-v4-flash","deepseek-v4-pro"],configured:true,selectable:true,isDefault:false},
      ],
      skills:[{
        id:"caption-emphasis",
        version:"1.0.0",
        title:"Caption emphasis",
        intendedUse:"Emphasize approved transcript phrases.",
        discoveryTerms:[],
        preconditions:[],
        requiredContext:["script","brand"],
        recipe:{steps:[{id:"plan",objective:"Plan approved emphasis.",service:"visual-plan-service"}]},
        allowedServices:["visual-plan-service"],
        allowedComponents:[],
        qaChecks:["Keep approved wording."],
        riskPolicy:{risk:"low",reviewRequired:false},
        fallback:{mode:"skip",message:"Keep existing captions."},
      }],
    };
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(payload),{status:200,headers:{"Content-Type":"application/json"}})));

    const result=await listAgentSessions("project-1");
    expect(result.provider.providerId).toBe("openai-responses");
    expect(result.providers.map(item=>item.providerId)).toEqual(["openai-responses","deepseek-chat"]);
    expect(result.providers[1]?.models).toEqual(["deepseek-v4-flash","deepseek-v4-pro"]);
    expect(result.skills.map(item=>`${item.id}@${item.version}`)).toEqual(["caption-emphasis@1.0.0"]);
  });

  it("sends an explicit Skill only with the Agent turn request",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(new Response("event: turn-finished\ndata: {\"status\":\"completed\"}\n\n",{status:200,headers:{"Content-Type":"text/event-stream"}}))
      .mockResolvedValueOnce(new Response(JSON.stringify({session:{id:"session-1"}}),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);

    await runAgentTurn({
      projectId:"project-1",
      sessionId:"session-1",
      userContent:"Emphasize the approved caption.",
      skill:{id:"caption-emphasis",version:"1.0.0"},
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const[url,init]=fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("/api/projects/project-1/agent/sessions/session-1/turns");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      userContent:"Emphasize the approved caption.",
      skill:{id:"caption-emphasis",version:"1.0.0"},
    });
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("providerId");
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("model");
  });
});
