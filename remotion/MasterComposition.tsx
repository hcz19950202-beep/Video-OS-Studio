import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Project } from "@/schemas/project";

export type MasterCompositionProps = {
  project: Project;
};

export const MasterComposition: React.FC<MasterCompositionProps> = ({ project }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0f14",
        color: "#f5f7fa",
        fontFamily: "Arial, sans-serif",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ width: "100%" }}>
        <div style={{ color: "#ffc400", fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>
          VIDEO OS STUDIO
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, marginTop: 28 }}>
          {project.project.name}
        </div>
        <div style={{ fontSize: 30, opacity: 0.68, marginTop: 36 }}>
          Phase 0 Master Composition
        </div>
        <div style={{ fontSize: 28, opacity: 0.5, marginTop: 18 }}>
          {project.canvas.width}×{project.canvas.height} · {project.canvas.fps} fps · frame {frame}
        </div>
      </div>
    </AbsoluteFill>
  );
};
