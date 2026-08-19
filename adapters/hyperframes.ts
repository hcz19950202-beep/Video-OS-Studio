import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { HyperFramesAdapter } from "@/adapters/contracts";

const execFileAsync = promisify(execFile);
const launcher = () => process.env.HYPERFRAMES_NPX_PATH || (process.platform === "win32" ? "npx.cmd" : "npx");

export class NodeHyperFramesAdapter implements HyperFramesAdapter {
  async render(input: Parameters<HyperFramesAdapter["render"]>[0]): Promise<{ outputPath: string }> {
    if (!/^[a-z0-9-]+$/.test(input.effectId)) throw new Error("Invalid HyperFrames effect ID");
    const durationSeconds = input.durationInFrames / input.fps;
    const templatePath = join(process.cwd(), "shared", "hyperframes", input.effectId, "index.template.html");
    const workDir = `${input.outputPath}.hf-work`;
    await rm(workDir, { recursive: true, force: true });
    await mkdir(workDir, { recursive: true });
    await mkdir(dirname(input.outputPath), { recursive: true });
    const [template, design] = await Promise.all([readFile(templatePath, "utf8"), readFile(join(process.cwd(), "DESIGN.md"), "utf8")]);
    const propsB64 = Buffer.from(JSON.stringify(input.props), "utf8").toString("base64");
    const html = template
      .replaceAll("__WIDTH__", String(input.width))
      .replaceAll("__HEIGHT__", String(input.height))
      .replaceAll("__DURATION__", String(durationSeconds))
      .replaceAll("__PROPS_B64__", propsB64);
    await Promise.all([writeFile(join(workDir, "index.html"), html, "utf8"), writeFile(join(workDir, "DESIGN.md"), design, "utf8")]);
    const run = async (args: string[]) => execFileAsync(launcher(), ["hyperframes", ...args], { cwd: workDir, windowsHide: true, shell: process.platform === "win32", maxBuffer: 20 * 1024 * 1024 });
    try {
      await run(["lint", "--json"]);
      await run(["inspect", "--json"]);
      await run(["render", "--output", input.outputPath, "--format", "webm", "--fps", String(input.fps), "--quality", "standard", "--strict"]);
    } catch (error) {
      throw new Error(`HyperFrames render failed: ${error instanceof Error ? error.message : String(error)}. Run npx hyperframes doctor, then lint and inspect the generated workspace before retrying.`);
    }
    return { outputPath: input.outputPath };
  }
}
