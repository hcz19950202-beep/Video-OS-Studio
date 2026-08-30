import { access, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeFfmpegAdapter } from "@/adapters/ffmpeg";
import { NodeHyperFramesAdapter } from "@/adapters/hyperframes";

const roots: string[] = [];
const windowsHyperFramesIt = process.env.H0_WINDOWS_HYPERFRAMES_SMOKE === "1" ? it : it.skip;

const streamToolLog = (event: { stream: "stdout" | "stderr"; chunk: string }) => {
  const target = event.stream === "stderr" ? process.stderr : process.stdout;
  target.write(`[hyperframes:${event.stream}] ${event.chunk}`);
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("V2.3.1 H0 Windows real HyperFrames smoke", () => {
  windowsHyperFramesIt(
    "renders a real effect offline, probes it, and removes the transient .hf-work directory",
    async () => {
      expect(process.platform).toBe("win32");
      const root = await mkdtemp(join(tmpdir(), "video-os-h0-hyperframes-"));
      roots.push(root);
      const outputPath = join(root, "process-flow.webm");

      await new NodeHyperFramesAdapter().render(
        {
          effectId: "process-flow",
          props: {
            title: "FLOW",
            steps: ["A", "B"],
            accentColor: "#FFC400",
          },
          outputPath,
          width: 320,
          height: 180,
          fps: 30,
          durationInFrames: 30,
        },
        { timeoutMs: 180_000, onLog: streamToolLog },
      );

      const output = await stat(outputPath);
      expect(output.size).toBeGreaterThan(0);
      const probe = await new NodeFfmpegAdapter().probe(outputPath);
      expect(probe.width).toBe(320);
      expect(probe.height).toBe(180);
      expect(probe.fps).toBeCloseTo(30, 3);
      expect(probe.durationSeconds).toBeGreaterThanOrEqual(0.9);
      expect(probe.durationSeconds).toBeLessThanOrEqual(1.2);
      expect(probe.hasAudio).toBe(false);
      await expect(access(`${outputPath}.hf-work`)).rejects.toThrow();
    },
    240_000,
  );
});
