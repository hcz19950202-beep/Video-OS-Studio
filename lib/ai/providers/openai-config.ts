import {z} from "zod";

export const OpenAIResponsesProviderConfigSchema=z.object({
  apiKey:z.string().trim().min(1,"OPENAI_API_KEY is required"),
  model:z.string().trim().min(1,"OPENAI_MODEL is required").max(256),
  endpoint:z.string().url().default("https://api.openai.com/v1/responses"),
  timeoutMs:z.number().int().positive().max(10*60_000).default(60_000),
}).strict();
export type OpenAIResponsesProviderConfig=z.infer<typeof OpenAIResponsesProviderConfigSchema>;

export type OpenAIProviderEnvironment=Readonly<Record<string,string|undefined>>;

export const loadOpenAIResponsesProviderConfig=(
  env:OpenAIProviderEnvironment,
  overrides:Partial<Pick<OpenAIResponsesProviderConfig,"endpoint"|"timeoutMs">>={},
):OpenAIResponsesProviderConfig=>OpenAIResponsesProviderConfigSchema.parse({
  apiKey:env.OPENAI_API_KEY,
  model:env.OPENAI_MODEL,
  ...overrides,
});

export const loadOpenAIResponsesProviderConfigFromProcessEnv=(
  overrides:Partial<Pick<OpenAIResponsesProviderConfig,"endpoint"|"timeoutMs">>={},
):OpenAIResponsesProviderConfig=>{
  if(typeof window!=="undefined")throw new Error("OpenAI provider environment config is server-only.");
  return loadOpenAIResponsesProviderConfig(process.env,overrides);
};
