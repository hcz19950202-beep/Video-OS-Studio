import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";
import type { Project } from "@/schemas/project";

export type MasterCompositionProps = {
  project: Project;
  assetUrls?: Record<string, string>;
};

export const MasterComposition: React.FC<MasterCompositionProps> = ({ project, assetUrls = {} }) => {
  const frame = useCurrentFrame();
  const videoClips = project.tracks
    .flatMap((track) => track.clips)
    .filter((clip) => clip.type === "video" && clip.enabled);

  return (
    <AbsoluteFill style={{ backgroundColor: "#080b0f", color: "#f5f7fa", fontFamily: "Arial, sans-serif" }}>
      {videoClips.map((clip) => {
        const src = assetUrls[clip.assetId];
        if (!src) return null;
        return (
          <Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}>
            <OffthreadVideo src={src} volume={clip.volume} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </Sequence>
        );
      })}
      {videoClips.length === 0 ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
          <div style={{ width: "100%" }}>
            <div style={{ color: "#ffc400", fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>VIDEO OS STUDIO</div>
            <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, marginTop: 28 }}>{project.project.name}</div>
            <div style={{ fontSize: 30, opacity: 0.68, marginTop: 36 }}>Import an MP4 to start the real Player workflow</div>
          </div>
        </AbsoluteFill>
      ) : null}
      <div style={{ position: "absolute", right: 24, bottom: 18, fontSize: 20, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,.55)", opacity: 0.72 }}>
        {project.canvas.width}×{project.canvas.height} · {project.canvas.fps} fps · f{frame}
      </div>
    </AbsoluteFill>
  );
};
