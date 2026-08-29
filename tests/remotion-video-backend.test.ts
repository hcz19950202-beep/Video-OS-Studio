import { describe, expect, it } from "vitest";
import { videoRenderBackend } from "@/remotion/MasterComposition";

describe("Remotion video backend selection", () => {
  it("keeps ordinary user media off the OffthreadVideo frame-cache path", () => {
    expect(videoRenderBackend(false)).toBe("html5-video");
  });

  it("keeps transparent HyperFrames media on the alpha-capable offthread path", () => {
    expect(videoRenderBackend(true)).toBe("offthread-video");
  });
});
