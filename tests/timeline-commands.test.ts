import { describe, expect, it } from "vitest";
import { applyProjectCommand } from "@/lib/project/commands";
import { createProject } from "@/lib/project/factory";

describe("Phase 2 timeline commands", () => {
  it("duplicates a clip on the same track with a new frame position", () => {
    let project = createProject({ id: "demo", name: "Demo", durationInFrames: 300 });
    project = applyProjectCommand(project, {
      type: "add-clip",
      trackId: "captions-main",
      clip: { id: "c1", type: "caption", text: "Hello", startFrame: 10, durationInFrames: 30, enabled: true, layer: 0 },
    });
    project = applyProjectCommand(project, { type: "duplicate-clip", clipId: "c1", newClipId: "c2", startFrame: 50 });
    const captions = project.tracks.find((track) => track.id === "captions-main")!;
    expect(captions.clips).toHaveLength(2);
    expect(captions.clips[1]).toMatchObject({ id: "c2", startFrame: 50, durationInFrames: 30 });
  });

  it("locks and hides tracks through validated commands", () => {
    const project = createProject({ id: "demo", name: "Demo" });
    const next = applyProjectCommand(project, { type: "set-track-state", trackId: "video-main", locked: true, hidden: true });
    expect(next.tracks.find((track) => track.id === "video-main")).toMatchObject({ locked: true, hidden: true });
  });
});
