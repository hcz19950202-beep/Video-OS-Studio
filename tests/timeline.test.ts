import { describe, expect, it } from "vitest";
import {
  clampFrame,
  clipEndFrame,
  framesToSeconds,
  rangesOverlap,
  secondsToFrames,
} from "@/lib/timeline/frames";

describe("frame timeline helpers", () => {
  it("converts seconds only at adapter boundaries", () => {
    expect(secondsToFrames(1.5, 30)).toBe(45);
    expect(framesToSeconds(45, 30)).toBe(1.5);
  });

  it("calculates clip boundaries and overlap", () => {
    expect(clipEndFrame(30, 60)).toBe(90);
    expect(rangesOverlap(0, 30, 29, 10)).toBe(true);
    expect(rangesOverlap(0, 30, 30, 10)).toBe(false);
  });

  it("clamps playhead frames into a project", () => {
    expect(clampFrame(-4, 300)).toBe(0);
    expect(clampFrame(400, 300)).toBe(299);
  });
});
