import { describe, expect, it } from "vitest";
import { applyProjectCommand } from "@/lib/project/commands";
import { createProject } from "@/lib/project/factory";

const now = "2026-08-19T00:00:00.000Z";

describe("applyProjectCommand", () => {
  it("applies validated mutations and increments revision", () => {
    const project = createProject({ id: "p1", name: "Original", now });
    const renamed = applyProjectCommand(
      project,
      { type: "rename-project", name: "Renamed" },
      { now: "2026-08-19T00:01:00.000Z" },
    );

    expect(renamed.project.name).toBe("Renamed");
    expect(renamed.project.revision).toBe(1);
    expect(project.project.name).toBe("Original");
  });

  it("rejects a clip added to the wrong track", () => {
    const project = createProject({ id: "p1", name: "Original", now });
    expect(() =>
      applyProjectCommand(project, {
        type: "add-clip",
        trackId: "captions-main",
        clip: {
          id: "v1",
          type: "video",
          assetId: "a1",
          sourceStartFrame: 0,
          volume: 1,
          startFrame: 0,
          durationInFrames: 30,
          enabled: true,
          layer: 0,
        },
      }),
    ).toThrow(/cannot be added/);
  });

  it("updates clip timing using frames", () => {
    let project = createProject({ id: "p1", name: "Original", now });
    project = applyProjectCommand(project, {
      type: "add-clip",
      trackId: "motion-main",
      clip: {
        id: "m1",
        type: "motion",
        engine: "remotion",
        effectId: "big-number",
        props: {},
        startFrame: 15,
        durationInFrames: 60,
        enabled: true,
        layer: 10,
      },
    });
    project = applyProjectCommand(project, {
      type: "update-clip-timing",
      clipId: "m1",
      startFrame: 30,
      durationInFrames: 45,
    });

    const clip = project.tracks.find((track) => track.id === "motion-main")!.clips[0]!;
    expect(clip.startFrame).toBe(30);
    expect(clip.durationInFrames).toBe(45);
  });
});
