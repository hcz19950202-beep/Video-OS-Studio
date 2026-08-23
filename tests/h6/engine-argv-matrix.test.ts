import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildNormalizeAudioArgs, buildNormalizeVideoArgs } from "@/adapters/ffmpeg";
import {
  buildHyperFramesCheckArgs,
  buildHyperFramesLintArgs,
  buildHyperFramesRenderArgs,
} from "@/adapters/hyperframes";
import { buildRemotionRenderArgs } from "@/adapters/remotion-cli";
import { createProject } from "@/lib/project/factory";
import { resolveProjectNodeBin } from "@/lib/process/project-bin";
import { projectForExportProfile } from "@/lib/render/profile";

const roots: string[] = [];

afterEach(async () => {
  delete process.env.REMOTION_RENDER_CONCURRENCY;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("H6 engine argv matrix", () => {
  it("builds Final Remotion argv from the resolved custom export Project", () => {
    const source = createProject({
      id: "h6-export",
      name: "H6 export",
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 300,
    });
    const prepared = projectForExportProfile(source, {
      sizing: "custom",
      width: 1280,
      height: 720,
      fps: 24,
      quality: "draft",
      audio: "none",
    });
    process.env.REMOTION_RENDER_CONCURRENCY = "3";

    const args = buildRemotionRenderArgs(
      {
        project: prepared.project,
        outputPath: "E:/Video OS/output file.mp4",
        mode: "final",
        assetBaseUrl: "http://127.0.0.1:3000",
        quality: prepared.profile.quality,
        includeAudio: prepared.profile.audio !== "none",
      },
      "E:/Video OS/remotion/index.ts",
      "E:/Video OS/output file.mp4.props.json",
    );

    expect(args).toContain("--codec=h264");
    expect(args).toContain("--crf=28");
    expect(args).toContain("--muted");
    expect(args.slice(args.indexOf("--width"), args.indexOf("--width") + 2)).toEqual([
      "--width",
      "1280",
    ]);
    expect(args.slice(args.indexOf("--height"), args.indexOf("--height") + 2)).toEqual([
      "--height",
      "720",
    ]);
    expect(args.slice(args.indexOf("--fps"), args.indexOf("--fps") + 2)).toEqual(["--fps", "24"]);
    expect(args.slice(args.indexOf("--duration"), args.indexOf("--duration") + 2)).toEqual([
      "--duration",
      "240",
    ]);
    expect(args.slice(args.indexOf("--concurrency"), args.indexOf("--concurrency") + 2)).toEqual([
      "--concurrency",
      "3",
    ]);
  });

  it("builds standard Final audio argv without muting", () => {
    const project = createProject({ id: "h6-final", name: "Final" });
    const args = buildRemotionRenderArgs(
      {
        project,
        outputPath: "/tmp/final.mp4",
        mode: "final",
        assetBaseUrl: "http://127.0.0.1:3000",
        quality: "standard",
        includeAudio: true,
      },
      "/repo/remotion/index.ts",
      "/tmp/final.props.json",
    );

    expect(args).toContain("--codec=h264");
    expect(args).toContain("--crf=23");
    expect(args).not.toContain("--muted");
  });

  it("builds transparent Overlay Remotion argv", () => {
    const project = createProject({ id: "h6-overlay", name: "Overlay", width: 720, height: 1280 });
    const args = buildRemotionRenderArgs(
      {
        project,
        outputPath: "/tmp/overlay.webm",
        mode: "overlay",
        assetBaseUrl: "http://127.0.0.1:3000",
      },
      "/repo/remotion/index.ts",
      "/tmp/overlay.props.json",
    );

    expect(args).toContain("--image-format=png");
    expect(args).toContain("--pixel-format=yuva420p");
    expect(args).toContain("--codec=vp9");
    expect(args).toContain("--muted");
    expect(args).not.toContain("--codec=h264");
  });

  it("keeps HyperFrames lint/check/render as literal argv arrays", () => {
    expect(buildHyperFramesLintArgs()).toEqual(["lint", "--json"]);
    expect(buildHyperFramesCheckArgs()).toEqual(["check", "--json"]);
    expect(buildHyperFramesRenderArgs("E:/输出 Folder/overlay file.webm", 60)).toEqual([
      "render",
      "--output",
      "E:/输出 Folder/overlay file.webm",
      "--format",
      "webm",
      "--fps",
      "60",
      "--quality",
      "standard",
      "--strict",
    ]);
  });

  it("keeps FFmpeg normalization paths as literal argv elements", () => {
    const input = "E:/媒体 Folder/source clip.MOV";
    const videoOutput = "E:/输出 Folder/working clip.mp4";
    const audioOutput = "E:/输出 Folder/working audio.m4a";

    const video = buildNormalizeVideoArgs(input, videoOutput);
    expect(video[video.indexOf("-i") + 1]).toBe(input);
    expect(video.at(-1)).toBe(videoOutput);
    expect(video).toContain("libx264");
    expect(video).toContain("aac");

    const audio = buildNormalizeAudioArgs(input, audioOutput);
    expect(audio[audio.indexOf("-i") + 1]).toBe(input);
    expect(audio.at(-1)).toBe(audioOutput);
    expect(audio).toContain("-vn");
    expect(audio).toContain("aac");
  });

  it("launches installed npm CLIs through Node JS entries instead of Windows cmd wrappers", async () => {
    const root = await mkdtemp(join(tmpdir(), "video-os-h6-bin-"));
    roots.push(root);
    const packageRoot = join(root, "node_modules", "@remotion", "cli");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({
        name: "@remotion/cli",
        version: "4.0.513",
        bin: { remotion: "remotion-cli.js" },
      }),
      "utf8",
    );
    await writeFile(join(packageRoot, "remotion-cli.js"), "console.log('fixture');\n", "utf8");

    const resolved = await resolveProjectNodeBin("@remotion/cli", "remotion", "4.0.513", root);
    expect(resolved.command).toBe(process.execPath);
    expect(resolved.argsPrefix).toEqual([join(packageRoot, "remotion-cli.js")]);
    expect(resolved.argsPrefix[0]).not.toMatch(/\.cmd$/iu);
  });
});
