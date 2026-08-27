import {z} from "zod";

export const DeepSeekA3ModelSchema=z.enum(["deepseek-v4-flash","deepseek-v4-pro"]);

export const DeepSeekChatProviderConfigSchema=z.object({
  apiKey:z.string().trim().min(1,"DEEPSEEK_API_KEY is required"),
  model:DeepSeekA3ModelSchema,
  endpoint:z.string().url().default("https://api.deepseek.com/chat/completions"),
  timeoutMs:z.number().int().positive().max(10*60_000).default(60_000),
}).strict();
export type DeepSeekChatProviderConfig=z.infer<typeof DeepSeekChatProviderConfigSchema>;

export type DeepSeekProviderEnvironment=Readonly<Record<string,string|undefined>>;

export const loadDeepSeekChatProviderConfig=(
  env:DeepSeekProviderEnvironment,
  overrides:Partial<Pick<DeepSeekChatProviderConfig,"endpoint"|"timeoutMs">>={},
):DeepSeekChatProviderConfig=>DeepSeekChatProviderConfigSchema.parse({
  apiKey:env.DEEPSEEK_API_KEY,
  model:env.DEEPSEEK_MODEL,
  ...overrides,
});

export const loadDeepSeekChatProviderConfigFromProcessEnv=(
  overrides:Partial<Pick<DeepSeekChatProviderConfig,"endpoint"|"timeoutMs">>={},
):DeepSeekChatProviderConfig=>{
  if(typeof window!=="undefined")throw new Error("DeepSeek provider environment config is server-only.");
  return loadDeepSeekChatProviderConfig(process.env,overrides);
};
