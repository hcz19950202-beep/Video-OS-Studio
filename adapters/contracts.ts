import type { Project } from "@/schemas/project";

export type MediaProbeResult = {
  durationSeconds: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
};

export interface FileSystemAdapter {
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  ensureDir(path: string): Promise<void>;
  writeTextAtomic(path: string, content: string, backupPath?: string): Promise<void>;
}

export interface FfmpegAdapter {
  probe(inputPath: string): Promise<MediaProbeResult>;
}

export interface RemotionRenderAdapter {
  render(input: {
    project: Project;
    outputPath: string;
    mode: "final" | "overlay";
  }): Promise<{ outputPath: string }>;
}

export interface HyperFramesAdapter {
  render(input: {
    effectId: string;
    props: Record<string, unknown>;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
    outputPath: string;
  }): Promise<{ outputPath: string }>;
}

export type TranscriptWord = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

export interface VideoUseAdapter {
  probe(inputPath: string): Promise<MediaProbeResult>;
  transcribe(inputPath: string): Promise<{ words: TranscriptWord[]; text: string }>;
  roughCut(input: {
    inputPath: string;
    transcript: TranscriptWord[];
  }): Promise<{ edl: Array<{ sourceStartSeconds: number; sourceEndSeconds: number }> }>;
  qa(inputPath: string): Promise<{ passed: boolean; notes: string[] }>;
}
