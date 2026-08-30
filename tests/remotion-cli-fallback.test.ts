import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeRemotionCliAdapter } from "@/adapters/remotion-cli";
import {
  ToolRunError,
  type ToolRunInput,
  type ToolRunResult,
  type ToolRunner,
} from "@/lib/process/tool-runner";
import { ProjectSchema } from "@/schemas/project";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const project = () =>
  ProjectSchema.parse({
    version: "2.0.0",
    project: {
      id: "remotion-fallback-test",
      name: "Remotion fallback test",
      revision: 0,
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
    },
    canvas: { width: 640, height: 360, fps: 30, durationInFrames: 90 },
  });

const okResult = (input: ToolRunInput): ToolRunResult => ({
  tool: input.tool,
  command: input.command,
  args: [...input.args],
  pid: 123,
  exitCode: 0,
  exitSignal: null,
  stdout: "",
  stdoutBytes: new Uint8Array(),
  stderr: "",
  durationMs: 1,
});

const failedRender = (input: ToolRunInput, stderrTail: string) =>
  new ToolRunError(
    "remotion-render exited with code 1.",
    input.tool,
    input.command,
    input.args,
    123,
    1,
    null,
    "",
    stderrTail,
  );

const backendFrom = async (input: ToolRunInput) => {
  const propsIndex = input.args.indexOf("--props");
  expect(propsIndex).toBeGreaterThanOrEqual(0);
  const propsPath = input.args[propsIndex + 1];
  expect(propsPath).toBeTruthy();
  const props = JSON.parse(await readFile(propsPath!, "utf8")) as {
    ordinaryVideoBackend?: string;
  };
  return props.ordinaryVideoBackend;
};

const makePaths = async () => {
  const root = await mkdtemp(join(tmpdir(), "video-os-remotion-fallback-"));
  roots.push(root);
  return {
    outputPath: join(root, "render", "final.mp4"),
    entryPoint: join(root, "entry.ts"),
  };
};

describe("NodeRemotionCliAdapter compatibility fallback", () => {
  it("retries the same render exactly once with HTML5 after the known Offthread missing-frame failure", async () => {
    const { outputPath, entryPoint } = await makePaths();
    const backends: Array<string | undefined> = [];
    const logs: string[] = [];
    let calls = 0;
    const runner: ToolRunner = {
      run: async (input) => {
        calls += 1;
        backends.push(await backendFrom(input));
        if (calls === 1) {
          throw failedRender(
            input,
            "Could not extract frame from compositor: No frame found at position 3635200 for source",
          );
        }
        return okResult(input);
      },
    };

    const adapter = new NodeRemotionCliAdapter(entryPoint, runner);
    await expect(
      adapter.render(
        {
          project: project(),
          outputPath,
          mode: "final",
          assetBaseUrl: "http://127.0.0.1:3000",
        },
        { onLog: (event) => logs.push(event.chunk) },
      ),
    ).resolves.toEqual({
      outputPath,
      backend: "html5-video",
      fallbackUsed: true,
      fallbackReason: "offthread-frame-extraction",
    });

    expect(calls).toBe(2);
    expect(backends).toEqual(["offthread-video", "html5-video"]);
    expect(logs.join("\n")).toContain(
      "REMOTION_VIDEO_BACKEND_FALLBACK=html5-video reason=offthread-frame-extraction",
    );
    await expect(access(`${outputPath}.props.json`)).rejects.toThrow();
  });

  it("does not retry unrelated Remotion failures", async () => {
    const { outputPath, entryPoint } = await makePaths();
    let calls = 0;
    const runner: ToolRunner = {
      run: async (input) => {
        calls += 1;
        throw failedRender(
          input,
          "Chrome renderer crashed while evaluating the composition.",
        );
      },
    };

    const adapter = new NodeRemotionCliAdapter(entryPoint, runner);
    await expect(
      adapter.render({
        project: project(),
        outputPath,
        mode: "final",
        assetBaseUrl: "http://127.0.0.1:3000",
      }),
    ).rejects.toBeInstanceOf(ToolRunError);

    expect(calls).toBe(1);
    await expect(access(`${outputPath}.props.json`)).rejects.toThrow();
  });

  it("never performs a third render when the compatibility retry also fails", async () => {
    const { outputPath, entryPoint } = await makePaths();
    const backends: Array<string | undefined> = [];
    let calls = 0;
    const runner: ToolRunner = {
      run: async (input) => {
        calls += 1;
        backends.push(await backendFrom(input));
        if (calls === 1) {
          throw failedRender(
            input,
            "Could not extract frame from compositor: No frame found at position 3635200 for source",
          );
        }
        throw failedRender(input, "Compatibility render also failed.");
      },
    };

    const adapter = new NodeRemotionCliAdapter(entryPoint, runner);
    await expect(
      adapter.render({
        project: project(),
        outputPath,
        mode: "final",
        assetBaseUrl: "http://127.0.0.1:3000",
      }),
    ).rejects.toBeInstanceOf(ToolRunError);

    expect(calls).toBe(2);
    expect(backends).toEqual(["offthread-video", "html5-video"]);
    await expect(access(`${outputPath}.props.json`)).rejects.toThrow();
  });
});
