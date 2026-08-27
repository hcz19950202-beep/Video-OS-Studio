import { access, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeHyperFramesAdapter } from "@/adapters/hyperframes";

const roots: string[] = [];
const windowsHyperFramesIt = process.env.H0_WINDOWS_HYPERFRAMES_SMOKE === "1" ? it : it.skip;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("V2.3.1 H0 Windows real HyperFrames smoke", () => {
  windowsHyperFramesIt(
    "renders a real effect and removes the transient .hf-work directory",
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
        { timeoutMs: 180_000 },
      );

      expect((await stat(outputPath)).size).toBeGreaterThan(0);
      await expect(access(`${outputPath}.hf-work`)).rejects.toThrow();
    },
    240_000,
  );
});
