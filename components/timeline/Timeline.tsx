"use client";

import { useMemo, useRef, useState } from "react";
import type { ProjectCommand } from "@/lib/project/commands";
import { clampFrame } from "@/lib/timeline/frames";
import type { Clip } from "@/schemas/clip";
import type { Project } from "@/schemas/project";
import { usePlayerStore } from "@/store/player-store";
import { useSelectionStore } from "@/store/selection-store";

type TimelineProps = {
  project: Project;
  onCommand: (command: ProjectCommand, message: string) => Promise<void>;
};

type DragState = {
  mode: "move" | "resize";
  clip: Clip;
  originClientX: number;
  pixelsPerFrame: number;
};

const TRACK_COLORS: Record<Clip["type"], string> = {
  video: "#2968c8",
  caption: "#7b56d6",
  motion: "#d58b22",
  broll: "#2c9a78",
  audio: "#b95178",
};

export const Timeline = ({ project, onCommand }: TimelineProps) => {
  const [pixelsPerFrame, setPixelsPerFrame] = useState(1.1);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draft, setDraft] = useState<{ clipId: string; startFrame: number; durationInFrames: number } | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const currentFrame = usePlayerStore((state) => state.currentFrame);
  const requestSeek = usePlayerStore((state) => state.requestSeek);
  const selectedClipId = useSelectionStore((state) => state.selectedClipId);
  const selectClip = useSelectionStore((state) => state.selectClip);

  const width = Math.max(720, project.canvas.durationInFrames * pixelsPerFrame);
  const seconds = Math.ceil(project.canvas.durationInFrames / project.canvas.fps);
  const tickEvery = seconds > 120 ? 10 : seconds > 60 ? 5 : 1;
  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let second = 0; second <= seconds; second += tickEvery) values.push(second);
    return values;
  }, [seconds, tickEvery]);

  const seekFromClientX = (clientX: number) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    requestSeek(clampFrame((clientX - rect.left) / pixelsPerFrame, project.canvas.durationInFrames));
  };

  const startDrag = (event: React.PointerEvent, clip: Clip, mode: "move" | "resize", locked: boolean) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectClip(clip.id);
    setDrag({ mode, clip, originClientX: event.clientX, pixelsPerFrame });
    setDraft({ clipId: clip.id, startFrame: clip.startFrame, durationInFrames: clip.durationInFrames });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const delta = Math.round((event.clientX - drag.originClientX) / drag.pixelsPerFrame);
    if (drag.mode === "move") {
      setDraft({
        clipId: drag.clip.id,
        startFrame: Math.max(0, drag.clip.startFrame + delta),
        durationInFrames: drag.clip.durationInFrames,
      });
    } else {
      setDraft({
        clipId: drag.clip.id,
        startFrame: drag.clip.startFrame,
        durationInFrames: Math.max(1, drag.clip.durationInFrames + delta),
      });
    }
  };

  const finishDrag = async () => {
    const change = draft;
    setDrag(null);
    setDraft(null);
    if (!change) return;
    await onCommand(
      {
        type: "update-clip-timing",
        clipId: change.clipId,
        startFrame: change.startFrame,
        durationInFrames: change.durationInFrames,
      },
      "Timeline clip timing updated",
    );
  };

  const displayTiming = (clip: Clip) =>
    draft?.clipId === clip.id
      ? { startFrame: draft.startFrame, durationInFrames: draft.durationInFrames }
      : clip;

  return (
    <section className="timeline-panel">
      <header className="timeline-toolbar">
        <div><strong>Timeline</strong><span>{project.canvas.durationInFrames} frames · {project.canvas.fps} fps</span></div>
        <div className="timeline-actions">
          <button onClick={() => setPixelsPerFrame((value) => Math.max(.25, value / 1.35))}>−</button>
          <span>{Math.round(pixelsPerFrame * 100)}%</span>
          <button onClick={() => setPixelsPerFrame((value) => Math.min(6, value * 1.35))}>+</button>
          <button disabled={!selectedClipId} onClick={() => {
            if (!selectedClipId) return;
            const clip = project.tracks.flatMap((track) => track.clips).find((item) => item.id === selectedClipId);
            if (!clip) return;
            void onCommand({ type: "duplicate-clip", clipId: clip.id, newClipId: `${clip.id}-copy-${Date.now()}`, startFrame: Math.min(project.canvas.durationInFrames - 1, clip.startFrame + clip.durationInFrames) }, "Clip duplicated");
          }}>Duplicate</button>
          <button disabled={!selectedClipId} onClick={() => selectedClipId && void onCommand({ type: "remove-clip", clipId: selectedClipId }, "Clip deleted").then(() => selectClip(null))}>Delete</button>
        </div>
      </header>
      <div className="timeline-scroll">
        <div className="timeline-grid" style={{ width: width + 150 }}>
          <div className="track-label ruler-label">Tracks</div>
          <div ref={rulerRef} className="timeline-ruler" style={{ width }} onPointerDown={(event) => seekFromClientX(event.clientX)}>
            {ticks.map((second) => <span key={second} style={{ left: second * project.canvas.fps * pixelsPerFrame }}>{second}s</span>)}
            <i className="timeline-playhead" style={{ left: currentFrame * pixelsPerFrame }} />
          </div>
          {project.tracks.map((track) => (
            <div className="timeline-track-row" key={track.id}>
              <div className="track-label">
                <strong>{track.name}</strong>
                <div>
                  <button className={track.locked ? "active" : ""} title="Lock track" onClick={() => void onCommand({ type: "set-track-state", trackId: track.id, locked: !track.locked }, track.locked ? "Track unlocked" : "Track locked")}>L</button>
                  <button className={track.hidden ? "active" : ""} title="Hide track" onClick={() => void onCommand({ type: "set-track-state", trackId: track.id, hidden: !track.hidden }, track.hidden ? "Track shown" : "Track hidden")}>H</button>
                </div>
              </div>
              <div className={`track-lane ${track.hidden ? "is-hidden" : ""}`} style={{ width }} onPointerDown={(event) => seekFromClientX(event.clientX)}>
                {track.clips.map((clip) => {
                  const timing = displayTiming(clip);
                  return (
                    <div
                      key={clip.id}
                      className={`timeline-clip ${selectedClipId === clip.id ? "selected" : ""}`}
                      style={{
                        left: timing.startFrame * pixelsPerFrame,
                        width: Math.max(12, timing.durationInFrames * pixelsPerFrame),
                        background: TRACK_COLORS[clip.type],
                      }}
                      onPointerDown={(event) => startDrag(event, clip, "move", track.locked)}
                      onPointerMove={updateDrag}
                      onPointerUp={() => void finishDrag()}
                      onPointerCancel={() => { setDrag(null); setDraft(null); }}
                    >
                      <span>{clip.type} · {clip.id}</span>
                      <i className="resize-handle" onPointerDown={(event) => startDrag(event, clip, "resize", track.locked)} />
                    </div>
                  );
                })}
                <i className="timeline-playhead" style={{ left: currentFrame * pixelsPerFrame }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
