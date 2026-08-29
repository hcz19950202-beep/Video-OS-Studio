import { describe, expect, it } from "vitest";
import { isRemotionOffthreadFrameExtractionError } from "@/adapters/remotion-cli";
import {
  ToolAbortedError,
  ToolRunError,
  ToolTimeoutError,
} from "@/lib/process/tool-runner";
import { videoRenderBackend } from "@/remotion/MasterComposition";

const runError = (stderrTail: string) =>
  new ToolRunError(
    "remotion-render exited with code 1.",
    "remotion-render",
    "remotion",
    [],
    123,
    1,
    null,
    "",
    stderrTail,
  );

describe("Remotion video backend selection", () => {
  it("keeps ordinary user media frame-perfect by default", () => {
    expect(videoRenderBackend(false)).toBe("offthread-video");
  });

  it("allows the explicit HTML5 compatibility backend for ordinary media", () => {
    expect(videoRenderBackend(false, "html5-video")).toBe("html5-video");
  });

  it("keeps transparent HyperFrames media on the alpha-capable offthread path", () => {
    expect(videoRenderBackend(true, "html5-video")).toBe("offthread-video");
  });
});

describe("Remotion Offthread frame extraction fallback", () => {
  it("recognizes the exact missing-frame signature", () => {
    expect(
      isRemotionOffthreadFrameExtractionError(
        runError(
          "Could not extract frame from compositor: No frame found at position 3635200 for source",
        ),
      ),
    ).toBe(true);
  });

  it("does not reinterpret unrelated render failures", () => {
    expect(
      isRemotionOffthreadFrameExtractionError(
        runError("Chrome renderer crashed while evaluating the composition."),
      ),
    ).toBe(false);
  });

  it("does not reinterpret timeout or cancellation as media compatibility", () => {
    expect(
      isRemotionOffthreadFrameExtractionError(
        new ToolTimeoutError("remotion-render", "remotion", [], 123, 1000, "", ""),
      ),
    ).toBe(false);
    expect(
      isRemotionOffthreadFrameExtractionError(
        new ToolAbortedError("remotion-render", "remotion", [], 123, "", ""),
      ),
    ).toBe(false);
  });
});
