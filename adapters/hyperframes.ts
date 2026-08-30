import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HyperFramesAdapter, ToolExecutionOptions } from "@/adapters/contracts";
import { withErrorPreservingCleanup } from "@/lib/fs/error-preserving-cleanup";
import { nodeToolRunner, parseToolTimeout, type ToolRunner } from "@/lib/process/tool-runner";
import { resolveProjectNodeBin } from "@/lib/process/project-bin";

const DEFAULT_HYPERFRAMES_TIMEOUT_MS = 15 * 60 * 1000;
export const buildHyperFramesBrowserEnsureArgs = () => ["browser", "ensure"];
export const buildHyperFramesLintArgs = () => ["lint", "--json"];
export const buildHyperFramesCheckArgs = () => ["check", "--json"];
export const buildHyperFramesRenderArgs = (outputPath: string, fps: number) => [
  "render",
  "--output",
  outputPath,
  "--format",
  "webm",
  "--fps",
  String(fps),
  "--quality",
  "standard",
  "--strict",
];

export class NodeHyperFramesAdapter implements HyperFramesAdapter {
  constructor(private readonly runner: ToolRunner = nodeToolRunner) {}

  async render(
    input: Parameters<HyperFramesAdapter["render"]>[0],
    options: ToolExecutionOptions = {},
  ): Promise<{ outputPath: string }> {
    if (!/^[a-z0-9-]+$/.test(input.effectId)) throw new Error("Invalid HyperFrames effect ID");
    const durationSeconds = input.durationInFrames / input.fps;
    const templatePath = join(
      process.cwd(),
      "shared",
      "hyperframes",
      input.effectId,
      "index.template.html",
    );
    const workDir = `${input.outputPath}.hf-work`;
    await rm(workDir, { recursive: true, force: true });

    return withErrorPreservingCleanup(async () => {
      await mkdir(workDir, { recursive: true });
      await mkdir(dirname(input.outputPath), { recursive: true });
      const [template, design] = await Promise.all([
        readFile(templatePath, "utf8"),
        readFile(join(process.cwd(), "DESIGN.md"), "utf8"),
      ]);
      const propsB64 = Buffer.from(JSON.stringify(input.props), "utf8").toString("base64");
      const html = template
        .replaceAll("__WIDTH__", String(input.width))
        .replaceAll("__HEIGHT__", String(input.height))
        .replaceAll("__DURATION__", String(durationSeconds))
        .replaceAll("__PROPS_B64__", propsB64);
      await Promise.all([
        writeFile(join(workDir, "index.html"), html, "utf8"),
        writeFile(join(workDir, "DESIGN.md"), design, "utf8"),
      ]);

      const cli = await resolveProjectNodeBin("hyperframes", "hyperframes");
      const timeoutMs =
        options.timeoutMs ??
        parseToolTimeout(process.env.HYPERFRAMES_TIMEOUT_MS, DEFAULT_HYPERFRAMES_TIMEOUT_MS);
      const run = (tool: string, args: string[]) =>
        this.runner.run({
          tool,
          command: cli.command,
          args: [...cli.argsPrefix, ...args],
          cwd: workDir,
          timeoutMs,
          signal: options.signal,
          onLog: options.onLog,
          env: {
            HYPERFRAMES_NO_UPDATE_CHECK: "1",
            HYPERFRAMES_NO_TELEMETRY: "1",
            CI: process.env.CI || "1",
          },
        });

      await run("hyperframes-browser", buildHyperFramesBrowserEnsureArgs());
      await run("hyperframes-lint", buildHyperFramesLintArgs());
      await run("hyperframes-check", buildHyperFramesCheckArgs());
      await run("hyperframes-render", buildHyperFramesRenderArgs(input.outputPath, input.fps));
      return { outputPath: input.outputPath };
    }, () => rm(workDir, { recursive: true, force: true }), "HyperFrames render failed and temporary work-directory cleanup did not complete.");
  }
}
