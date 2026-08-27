import {z} from "zod";

export const VolcengineAgentPlanModelSchema=z.literal("ark-code-latest");

export const VolcengineAgentPlanProviderConfigSchema=z.object({
  apiKey:z.string().trim().min(1,"VOLCENGINE_AGENT_API_KEY is required"),
  model:VolcengineAgentPlanModelSchema,
  endpoint:z.string().url().default("https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions"),
  timeoutMs:z.number().int().positive().max(10*60_000).default(60_000),
}).strict();
export type VolcengineAgentPlanProviderConfig=z.infer<typeof VolcengineAgentPlanProviderConfigSchema>;

export type VolcengineAgentPlanEnvironment=Readonly<Record<string,string|undefined>>;

export const loadVolcengineAgentPlanProviderConfig=(
  env:VolcengineAgentPlanEnvironment,
  overrides:Partial<Pick<VolcengineAgentPlanProviderConfig,"endpoint"|"timeoutMs">>={},
):VolcengineAgentPlanProviderConfig=>VolcengineAgentPlanProviderConfigSchema.parse({
  apiKey:env.VOLCENGINE_AGENT_API_KEY,
  model:env.VOLCENGINE_AGENT_MODEL,
  ...overrides,
});

export const loadVolcengineAgentPlanProviderConfigFromProcessEnv=(
  overrides:Partial<Pick<VolcengineAgentPlanProviderConfig,"endpoint"|"timeoutMs">>={},
):VolcengineAgentPlanProviderConfig=>{
  if(typeof window!=="undefined")throw new Error("Volcengine Agent Plan provider environment config is server-only.");
  return loadVolcengineAgentPlanProviderConfig(process.env,overrides);
};
