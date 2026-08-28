import {describe,expect,it,vi} from "vitest";
import type {AgentContextSnapshot} from "@/lib/ai/context";
import {createAssetIntelligenceReadTool,SEARCH_ASSET_INTELLIGENCE_TOOL_ID,type AgentAssetIntelligenceReader} from "@/lib/ai/tools/asset-intelligence-tools";
import {AgentToolRegistry} from "@/lib/ai/tools/registry";

const resultFixture=()=>({
  assetId:"asset-proof",
  kind:"image" as const,
  label:"Factory proof",
  score:0.9,
  summary:"Factory construction proof image.",
  tags:["image","proof","factory"],
  usableRanges:[],
  analyzer:{id:"deterministic-media-metadata",version:"1",mode:"deterministic" as const},
  generatedAt:"2026-08-28T12:00:00.000Z",
});

const executionContext=()=>({
  sessionId:"session-1",
  context:{projectId:"project-1"} as AgentContextSnapshot,
});

describe("search_asset_intelligence Agent tool",()=>{
  it("is read-only and scopes retrieval to the current Agent Project",async()=>{
    const calls:Array<{projectId:string;query:unknown}>=[];
    const reader:AgentAssetIntelligenceReader={search:async(projectId,query)=>{calls.push({projectId,query});return[resultFixture()];}};
    const registry=new AgentToolRegistry([createAssetIntelligenceReadTool(reader)]);
    expect(registry.getDefinition(SEARCH_ASSET_INTELLIGENCE_TOOL_ID)).toMatchObject({risk:"read",revisionPolicy:"none",idempotency:"read-only",requiresConfirmation:false});

    const response=await registry.execute({id:"call-1",toolId:SEARCH_ASSET_INTELLIGENCE_TOOL_ID,arguments:{query:"factory proof",maxResults:2}},executionContext());
    expect(response.status).toBe("success");
    expect(response.output).toEqual({results:[resultFixture()]});
    expect(calls).toEqual([{projectId:"project-1",query:{query:"factory proof",requiredTags:[],preferredKinds:[],maxResults:2}}]);
  });

  it("rejects invalid arguments before invoking the reader",async()=>{
    let calls=0;
    const reader:AgentAssetIntelligenceReader={search:async()=>{calls+=1;return[];}};
    const registry=new AgentToolRegistry([createAssetIntelligenceReadTool(reader)]);
    const response=await registry.execute({id:"call-2",toolId:SEARCH_ASSET_INTELLIGENCE_TOOL_ID,arguments:{maxResults:200}},executionContext());
    expect(response).toMatchObject({status:"error",error:{code:"invalid_tool_arguments"}});
    expect(calls).toBe(0);
  });

  it("does not expose internal paths from unexpected retrieval failures",async()=>{
    const consoleSpy=vi.spyOn(console,"error").mockImplementation(()=>undefined);
    try{
      const reader:AgentAssetIntelligenceReader={search:async()=>{throw new Error("failed at E:\\Video-OS-Studio\\private\\asset.json");}};
      const registry=new AgentToolRegistry([createAssetIntelligenceReadTool(reader)]);
      const response=await registry.execute({id:"call-3",toolId:SEARCH_ASSET_INTELLIGENCE_TOOL_ID,arguments:{query:"proof"}},executionContext());
      expect(response).toMatchObject({status:"error",error:{code:"tool_execution_failed",retryable:false}});
      expect(JSON.stringify(response)).not.toContain("E:\\Video-OS-Studio");
    }finally{consoleSpy.mockRestore();}
  });
});
