import {AgentToolDefinitionSchema} from "@/lib/ai/schema";
import type {AssetIntelligenceQuery,AssetIntelligenceSearchResult} from "@/lib/assets/intelligence/schema";
import {AssetIntelligenceSearchToolOutputSchema,SearchAssetIntelligenceInputSchema,type RegisteredAgentTool} from "@/lib/ai/tools/schema";

export const SEARCH_ASSET_INTELLIGENCE_TOOL_ID="search_asset_intelligence" as const;

export interface AgentAssetIntelligenceReader{
  search(projectId:string,query:AssetIntelligenceQuery):Promise<AssetIntelligenceSearchResult[]>;
}

export function createAssetIntelligenceReadTool(reader:AgentAssetIntelligenceReader):RegisteredAgentTool{
  return{
    definition:AgentToolDefinitionSchema.parse({
      id:SEARCH_ASSET_INTELLIGENCE_TOOL_ID,
      description:"Search fresh, path-safe derived intelligence for assets in the current Project. Returns logical Asset IDs and bounded semantic metadata only.",
      risk:"read",
      inputJsonSchema:{
        type:"object",
        properties:{
          query:{type:"string"},
          requiredTags:{type:"array",items:{type:"string"}},
          preferredKinds:{type:"array",items:{type:"string",enum:["video","audio","image","overlay","subtitle"]}},
          sceneSemanticType:{type:"string"},
          maxResults:{type:"integer",minimum:1,maximum:20},
        },
        additionalProperties:false,
      },
      revisionPolicy:"none",
      idempotency:"read-only",
      requiresConfirmation:false,
      errorCodes:["invalid_tool_arguments","invalid_tool_output","tool_execution_failed"],
    }),
    inputSchema:SearchAssetIntelligenceInputSchema,
    outputSchema:AssetIntelligenceSearchToolOutputSchema,
    handler:async(input,context)=>({results:await reader.search(context.context.projectId,SearchAssetIntelligenceInputSchema.parse(input))}),
  };
}
