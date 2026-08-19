import { describe, expect, it } from "vitest";
import { parseFfprobeJson } from "@/adapters/ffmpeg";

describe("ffprobe parsing", () => {
  it("extracts duration, video metadata and audio presence", () => {
    expect(
      parseFfprobeJson({
        format: { duration: "2.5" },
        streams: [
          { codec_type: "video", width: 1920, height: 1080, avg_frame_rate: "30000/1001" },
          { codec_type: "audio" },
        ],
      }),
    ).toEqual({
      durationSeconds: 2.5,
      width: 1920,
      height: 1080,
      fps: 30000 / 1001,
      hasAudio: true,
    });
  });

  it("rejects media without a positive duration", () => {
    expect(() => parseFfprobeJson({ format: { duration: "0" }, streams: [] })).toThrow(/duration/);
  });
});
