import {existsSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

const nodeMajor=Number(process.versions.node.split(".")[0]);
if(nodeMajor!==24){
  console.error(`A3 live validation requires Node 24.x; current runtime is ${process.version}.`);
  process.exit(1);
}

const envPath=join(process.cwd(),".env.local");
if(existsSync(envPath))process.loadEnvFile(envPath);

const missing=["DEEPSEEK_API_KEY","DEEPSEEK_MODEL"].filter(name=>!process.env[name]?.trim());
if(missing.length>0){
  console.error(`A3 DeepSeek live validation requires ${missing.join(" and ")} in the environment or .env.local.`);
  process.exit(1);
}

if(!/^deepseek-v4-(?:flash|pro)$/.test(process.env.DEEPSEEK_MODEL.trim())){
  console.error("A3 DeepSeek live validation requires DEEPSEEK_MODEL=deepseek-v4-pro or deepseek-v4-flash.");
  process.exit(1);
}

const vitestCli=join(process.cwd(),"node_modules","vitest","vitest.mjs");
if(!existsSync(vitestCli)){
  console.error("Vitest is not installed. Run npm ci before A3 live validation.");
  process.exit(1);
}

const child=spawnSync(
  process.execPath,
  [vitestCli,"run","tests/live/ai-deepseek-live.test.ts"],
  {
    cwd:process.cwd(),
    stdio:"inherit",
    env:{...process.env,RUN_LIVE_DEEPSEEK:"1"},
  },
);

if(child.error){
  console.error("Failed to start A3 DeepSeek live validation.");
  process.exit(1);
}
process.exit(child.status??1);
