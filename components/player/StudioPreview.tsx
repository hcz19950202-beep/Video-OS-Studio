"use client";

import { Player } from "@remotion/player";
import { createProject } from "@/lib/project/factory";
import { MasterComposition } from "@/remotion/MasterComposition";

const sampleProject = createProject({
  id: "sample-project",
  name: "Foundation Preview",
  now: "2026-08-19T00:00:00.000Z",
  durationInFrames: 300,
});

export const StudioPreview = () => (
  <div className="player-shell">
    <Player
      component={MasterComposition}
      inputProps={{ project: sampleProject }}
      durationInFrames={sampleProject.canvas.durationInFrames}
      compositionWidth={sampleProject.canvas.width}
      compositionHeight={sampleProject.canvas.height}
      fps={sampleProject.canvas.fps}
      controls
      style={{ width: "100%", maxHeight: "72vh", aspectRatio: "9 / 16" }}
    />
  </div>
);
