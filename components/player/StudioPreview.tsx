"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import { MasterComposition } from "@/remotion/MasterComposition";
import type { Project } from "@/schemas/project";
import { clampFrame } from "@/lib/timeline/frames";
import { usePlayerStore } from "@/store/player-store";

const formatTime = (frame: number, fps: number) => {
  const totalSeconds = Math.max(0, frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
};

export const StudioPreview = ({ project }: { project: Project }) => {
  const playerRef = useRef<PlayerRef>(null);
  const currentFrame = usePlayerStore((state) => state.currentFrame);
  const setCurrentFrame = usePlayerStore((state) => state.setCurrentFrame);
  const seekFrame = usePlayerStore((state) => state.seekFrame);
  const seekVersion = usePlayerStore((state) => state.seekVersion);
  const [zoom, setZoom] = useState<"fit" | "100">("fit");
  const [showSafeZone, setShowSafeZone] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentFrame(playerRef.current?.getCurrentFrame() ?? 0), 100);
    return () => window.clearInterval(timer);
  }, [setCurrentFrame]);

  useEffect(() => {
    if (seekVersion > 0) {
      playerRef.current?.seekTo(clampFrame(seekFrame, project.canvas.durationInFrames));
    }
  }, [project.canvas.durationInFrames, seekFrame, seekVersion]);

  const assetUrls = useMemo(
    () => Object.fromEntries(project.assets.map((asset) => [asset.id, `/api/projects/${encodeURIComponent(project.project.id)}/assets/${encodeURIComponent(asset.id)}`])),
    [project.assets, project.project.id],
  );
  const ratio = `${project.canvas.width} / ${project.canvas.height}`;
  const durationFrame = Math.max(0, project.canvas.durationInFrames - 1);
  const playerKey = `${project.project.id}-${project.canvas.durationInFrames}-${project.canvas.width}x${project.canvas.height}`;

  return (
    <div className="player-workspace">
      <div className="player-toolbar">
        <div className="time-readout"><strong>{formatTime(currentFrame, project.canvas.fps)}</strong><span>/ {formatTime(durationFrame, project.canvas.fps)} · frame {currentFrame}/{durationFrame}</span></div>
        <div className="segmented compact">
          <button className={zoom === "fit" ? "active" : ""} onClick={() => setZoom("fit")}>Fit</button>
          <button className={zoom === "100" ? "active" : ""} onClick={() => setZoom("100")}>100%</button>
          <button className={showSafeZone ? "active" : ""} onClick={() => setShowSafeZone((value) => !value)}>Safe</button>
        </div>
      </div>
      <div className={`player-scroll ${zoom === "100" ? "native-size" : ""}`}>
        <div className="player-shell" style={{ aspectRatio: ratio, width: zoom === "fit" ? "min(100%, 560px)" : `${Math.min(project.canvas.width, 960)}px` }}>
          <Player
            key={playerKey}
            ref={playerRef}
            component={MasterComposition}
            inputProps={{ project, assetUrls }}
            durationInFrames={project.canvas.durationInFrames}
            compositionWidth={project.canvas.width}
            compositionHeight={project.canvas.height}
            fps={project.canvas.fps}
            controls
            style={{ width: "100%", height: "100%" }}
          />
          {showSafeZone ? <div className="safe-zone" aria-hidden="true"><div /></div> : null}
        </div>
      </div>
    </div>
  );
};
