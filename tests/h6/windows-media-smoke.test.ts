import { access, mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeFfmpegAdapter } from "@/adapters/ffmpeg";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { NodeRemotionCliAdapter } from "@/adapters/remotion-cli";
import { createStreamingFileResponse } from "@/lib/http/streaming-file";
import { FileJobStore } from "@/lib/jobs/store";
import { MediaImportService } from "@/lib/media/import-service";
import { ProjectRepository } from "@/lib/project/repository";
import { nodeToolRunner } from "@/lib/process/tool-runner";
import { ProductionMissionRepository } from "@/lib/production/mission/repository";
import { ProductionMissionService } from "@/lib/production/mission/service";
import { QAReportRepository } from "@/lib/production/qa/repository";
import { ProductionQAService } from "@/lib/production/qa/service";

const roots: string[] = [];
const windowsMediaIt = process.env.H6_WINDOWS_MEDIA_SMOKE === "1" ? it : it.skip;
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7r8AAAAASUVORK5CYII=",
  "base64",
);

const runFfmpeg = async (args: string[]) =>
  nodeToolRunner.run({
    tool: "h6-fixture-ffmpeg",
    command: process.env.FFMPEG_PATH || "ffmpeg",
    args,
    stdoutMode: "discard",
    timeoutMs: 120_000,
  });

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("H6 Windows real-media smoke", () => {
  windowsMediaIt(
    "imports media, renders a real Final, and accepts that exact artifact through B4 Production QA",
    async () => {
      expect(process.platform).toBe("win32");
      const root = await mkdtemp(join(tmpdir(), "video-os-h6-windows-media-"));
      roots.push(root);
      const fixtures = join(root, "fixtures");
      const dataRoot = join(root, "data");
      await mkdir(fixtures, { recursive: true });

      const mp4Path = join(fixtures, "tiny.mp4");
      const movPath = join(fixtures, "tiny source.MOV");
      const imagePath = join(fixtures, "tiny image.png");
      const audioPath = join(fixtures, "tiny audio.flac");
      const subtitlePath = join(fixtures, "tiny captions.srt");

      await runFfmpeg([
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=320x180:r=30:d=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:duration=1",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        mp4Path,
      ]);
      await runFfmpeg([
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=green:s=320x180:r=30:d=1",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        movPath,
      ]);
      await runFfmpeg([
        "-y",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=1",
        "-c:a",
        "flac",
        audioPath,
      ]);
      await writeFile(imagePath, TINY_PNG);
      await writeFile(
        subtitlePath,
        "1\n00:00:00,000 --> 00:00:00,700\nH6 subtitle smoke\n\n2\n00:00:00,700 --> 00:00:01,000\nRange and render\n",
        "utf8",
      );

      const fs = new NodeFileSystemAdapter();
      const ffmpeg = new NodeFfmpegAdapter();
      const repository = new ProjectRepository(fs, dataRoot);
      const importer = new MediaImportService(fs, ffmpeg, repository);
      const projectId = "h6-windows-media";
      await repository.create({
        id: projectId,
        name: "H6 Windows Media",
        width: 320,
        height: 180,
        fps: 30,
        durationInFrames: 30,
      });

      const importFixture = async (
        sourcePath: string,
        fileName: string,
        mimeType: string,
        operationId: string,
      ) => {
        const current = await repository.load(projectId);
        const info = await stat(sourcePath);
        return importer.importWithReport({
          projectId,
          fileName,
          mimeType,
          sourcePath,
          sizeBytes: info.size,
          expectedRevision: current.project.revision,
          operationId,
        });
      };

      const mp4 = await importFixture(mp4Path, "tiny.mp4", "video/mp4", "h6-media-mp4");
      expect(mp4.import).toMatchObject({ kind: "video", normalized: false });
      const mp4Asset = mp4.project.assets.find((asset) => asset.id === mp4.import.assetId);
      expect(mp4Asset).toMatchObject({ kind: "video", width: 320, height: 180, hasAudio: true });

      const mov = await importFixture(
        movPath,
        "tiny source.MOV",
        "video/quicktime",
        "h6-media-mov",
      );
      expect(mov.import).toMatchObject({ kind: "video", normalized: true });
      expect(mov.import.originalRelativePath).toMatch(/^original\//);
      expect(mov.import.workingRelativePath).toMatch(/^input\/.+\.mp4$/);
      const movWorkingPath = repository.resolveProjectFile(
        projectId,
        mov.import.workingRelativePath,
      );
      const movProbe = await ffmpeg.probe(movWorkingPath);
      expect(movProbe).toMatchObject({ width: 320, height: 180 });
      expect(movProbe.durationSeconds).toBeGreaterThan(0);

      const image = await importFixture(imagePath, "tiny image.png", "image/png", "h6-media-image");
      expect(image.import).toMatchObject({ kind: "image", normalized: false });

      const audio = await importFixture(
        audioPath,
        "tiny audio.flac",
        "audio/flac",
        "h6-media-audio",
      );
      expect(audio.import).toMatchObject({ kind: "audio", normalized: true });
      expect(audio.import.workingRelativePath).toMatch(/^assets\/.+\.m4a$/);
      const audioProbe = await ffmpeg.probe(
        repository.resolveProjectFile(projectId, audio.import.workingRelativePath),
      );
      expect(audioProbe.hasAudio).toBe(true);
      expect(audioProbe.durationSeconds).toBeGreaterThan(0);

      const subtitle = await importFixture(
        subtitlePath,
        "tiny captions.srt",
        "application/x-subrip",
        "h6-media-subtitle",
      );
      expect(subtitle.import).toMatchObject({ kind: "subtitle", normalized: false });
      expect(
        subtitle.project.tracks
          .find((track) => track.id === "captions-main")
          ?.clips.filter((clip) => clip.type === "caption").length,
      ).toBe(2);

      const range = await createStreamingFileResponse(
        new Request("http://localhost/media", { headers: { Range: "bytes=0-31" } }),
        movWorkingPath,
        { mimeType: "video/mp4" },
      );
      expect(range.status).toBe(206);
      expect(range.headers.get("content-range")).toMatch(/^bytes 0-31\//);
      expect(range.headers.get("x-content-type-options")).toBe("nosniff");
      expect((await range.arrayBuffer()).byteLength).toBe(32);

      const renderProject = await repository.create({
        id: "h6-windows-render",
        name: "H6 Short Final",
        width: 320,
        height: 180,
        fps: 30,
        durationInFrames: 30,
      });
      renderProject.scenes = [
        { id: "h6-hook", name: "Hook", semanticType: "hook", startFrame: 0, endFrame: 10 },
        { id: "h6-proof", name: "Proof", semanticType: "proof", startFrame: 10, endFrame: 20 },
        { id: "h6-cta", name: "CTA", semanticType: "cta", startFrame: 20, endFrame: 30 },
      ];
      await repository.save(renderProject);

      const renderRelativePath = "render/final-b4-qa-smoke.mp4";
      const renderPath = repository.resolveProjectFile(
        renderProject.project.id,
        renderRelativePath,
      );
      await mkdir(dirname(renderPath), { recursive: true });
      await new NodeRemotionCliAdapter().render(
        {
          project: renderProject,
          outputPath: renderPath,
          mode: "final",
          assetBaseUrl: "http://127.0.0.1:3000",
          quality: "draft",
          includeAudio: false,
        },
        { timeoutMs: 180_000 },
      );
      const rendered = await ffmpeg.probe(renderPath);
      expect(rendered).toMatchObject({ width: 320, height: 180, hasAudio: false });
      expect(rendered.durationSeconds).toBeGreaterThan(0);
      await expect(access(`${renderPath}.props.json`)).rejects.toThrow();

      const missionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const renderJobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
      const qaReportId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
      const qaRepairId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const timestamp = "2026-08-28T12:00:00.000Z";

      const missionRepository = new ProductionMissionRepository(fs, dataRoot);
      const missionService = new ProductionMissionService(missionRepository, repository, {
        createId: () => missionId,
        now: () => timestamp,
      });
      const mission = await missionService.create({
        projectId: renderProject.project.id,
        title: "B4 exact artifact QA smoke",
        brief: "Validate the real short Final through the bounded B4 Production QA path.",
        target: { targetDurationSeconds: 1 },
        autonomyPolicy: { mode: "guided", finalReviewRequired: true },
      });

      const jobStore = new FileJobStore(dataRoot);
      await jobStore.ensure();
      await jobStore.create({
        id: renderJobId,
        type: "render-final",
        projectId: renderProject.project.id,
        status: "completed",
        stage: "completed",
        progress: 1,
        attempt: 1,
        input: {},
        output: {
          outputRelativePath: renderRelativePath,
          mode: "final",
          sourceProjectRevision: renderProject.project.revision,
          profile: {
            sizing: "project",
            width: 320,
            height: 180,
            fps: 30,
            container: "mp4",
            codec: "h264",
            audio: "none",
            quality: "draft",
          },
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        startedAt: timestamp,
        finishedAt: timestamp,
      });
      await jobStore.saveArtifacts(renderJobId, [
        {
          id: "render-output",
          kind: "render",
          label: "B4 real final",
          relativePath: renderRelativePath,
          mimeType: "video/mp4",
        },
      ]);

      const qaRepository = new QAReportRepository(fs, dataRoot);
      const qaService = new ProductionQAService(
        qaRepository,
        repository,
        jobStore,
        missionService,
        fs,
        ffmpeg,
        {
          now: () => timestamp,
          createReportId: () => qaReportId,
          createRepairId: () => qaRepairId,
        },
      );
      const report = await qaService.run(renderProject.project.id, {
        missionId: mission.id,
        renderJobId,
        expectations: { expectAudio: false, sceneCoverageMinRatio: 1 },
      });

      expect(report.status).toBe("pass");
      expect(report.repairProposal).toBeUndefined();
      expect(report.technicalEvidence).toMatchObject({
        renderArtifactId: "render-output",
        width: 320,
        height: 180,
        hasAudio: false,
      });
      for (const findingId of [
        "technical-render-artifact",
        "technical-output-exists",
        "technical-probe",
        "technical-duration",
        "technical-dimensions",
        "technical-fps",
        "technical-audio",
        "technical-project-revision",
        "content-hook",
        "content-cta",
        "content-evidence",
        "visual-scene-coverage",
        "goal-duration-target",
      ]) {
        expect(report.findings.find((finding) => finding.id === findingId)?.status).toBe("pass");
      }
      expect(
        (await missionService.require(renderProject.project.id, mission.id)).qaReportIds,
      ).toEqual([qaReportId]);
      expect(await qaRepository.load(renderProject.project.id, qaReportId)).toEqual(report);
      expect(JSON.stringify(report)).not.toContain(renderRelativePath);
      expect(JSON.stringify(report)).not.toContain(dataRoot);
    },
    240_000,
  );
});
