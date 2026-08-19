import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FfmpegAdapter, MediaProbeResult } from "@/adapters/contracts";

const execFileAsync = promisify(execFile);

type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

type FfprobePayload = {
  streams?: FfprobeStream[];
  format?: { duration?: string | number };
};

const parseFraction = (value?: string): number | undefined => {
  if (!value || value === "0/0") return undefined;
  const [numeratorText, denominatorText] = value.split("/");
  const numerator = Number(numeratorText);
  const denominator = denominatorText === undefined ? 1 : Number(denominatorText);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return undefined;
  const result = numerator / denominator;
  return Number.isFinite(result) && result > 0 ? result : undefined;
};

export const parseFfprobeJson = (payload: FfprobePayload): MediaProbeResult => {
  const streams = payload.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(payload.format?.duration ?? 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("ffprobe did not return a valid positive media duration");
  }
  return {
    durationSeconds,
    width: video?.width,
    height: video?.height,
    fps: parseFraction(video?.avg_frame_rate) ?? parseFraction(video?.r_frame_rate),
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
  };
};

export class NodeFfmpegAdapter implements FfmpegAdapter {
  constructor(private readonly ffprobePath = process.env.FFPROBE_PATH || "ffprobe") {}

  async probe(inputPath: string): Promise<MediaProbeResult> {
    const { stdout } = await execFileAsync(
      this.ffprobePath,
      ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", inputPath],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    );
    return parseFfprobeJson(JSON.parse(stdout) as FfprobePayload);
  }
}
