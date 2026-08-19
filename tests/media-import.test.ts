import { describe, expect, it } from "vitest";
import type { FfmpegAdapter } from "@/adapters/contracts";
import { InMemoryFileSystemAdapter } from "@/adapters/filesystem";
import { MediaImportService } from "@/lib/media/import-service";
import { ProjectRepository } from "@/lib/project/repository";

const ffmpeg: FfmpegAdapter = {
  probe: async () => ({
    durationSeconds: 4,
    width: 1080,
    height: 1920,
    fps: 30,
    hasAudio: true,
  }),
};

describe("MediaImportService", () => {
  it("imports an MP4 using relative project paths and creates the primary video clip", async () => {
    const fs = new InMemoryFileSystemAdapter();
    const repository = new ProjectRepository(fs, "/data");
    await repository.create({ id: "demo", name: "Demo", durationInFrames: 30 });
    const service = new MediaImportService(fs, ffmpeg, repository, () => "fixed-id");

    const project = await service.importFile({
      projectId: "demo",
      fileName: "talking head.mp4",
      mimeType: "video/mp4",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(project.canvas.durationInFrames).toBe(120);
    expect(project.assets[0].relativePath).toBe("input/media-fixed-id-talking-head.mp4");
    expect(project.assets[0].relativePath).not.toMatch(/^[A-Za-z]:|^\//);
    const videoTrack = project.tracks.find((track) => track.id === "video-main");
    expect(videoTrack?.clips).toHaveLength(1);
    expect(videoTrack?.clips[0]).toMatchObject({ type: "video", assetId: "media-fixed-id", durationInFrames: 120 });
    await expect(fs.readBinary("/data/projects/demo/input/media-fixed-id-talking-head.mp4")).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("imports SRT without pretending captions are parsed in Phase 1", async () => {
    const fs = new InMemoryFileSystemAdapter();
    const repository = new ProjectRepository(fs, "/data");
    await repository.create({ id: "demo", name: "Demo" });
    const service = new MediaImportService(fs, ffmpeg, repository, () => "subtitle-id");

    const project = await service.importFile({
      projectId: "demo",
      fileName: "captions.srt",
      bytes: new TextEncoder().encode("1\n00:00:00,000 --> 00:00:01,000\nHello"),
    });

    expect(project.assets[0]).toMatchObject({ kind: "subtitle", relativePath: "captions/media-subtitle-id-captions.srt" });
    expect(project.tracks.find((track) => track.id === "captions-main")?.clips).toHaveLength(0);
  });
});
