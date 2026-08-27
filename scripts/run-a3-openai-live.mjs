import {existsSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

const envPath=join(process.cwd(),".env.local");
if(existsSync(envPath))process.loadEnvFile(envPath);

const missing=["OPENAI_API_KEY","OPENAI_MODEL"].filter(name=>!process.env[name]?.trim());
if(missing.length>0){
  console.error(`A3 live validation requires ${missing.join(" and ")} in the environment or .env.local.`);
  process.exit(1);
}

const vitestCli=join(process.cwd(),"node_modules","vitest","vitest.mjs");
if(!existsSync(vitestCli)){
  console.error("Vitest is not installed. Run npm ci before A3 live validation.");
  process.exit(1);
}

const child=spawnSync(
  process.execPath,
  [vitestCli,"run","tests/live/ai-openai-live.test.ts"],
  {
    cwd:process.cwd(),
    stdio:"inherit",
    env:{...process.env,RUN_LIVE_OPENAI:"1"},
  },
);

if(child.error){
  console.error("Failed to start A3 live validation.");
  process.exit(1);
}
process.exit(child.status??1);
