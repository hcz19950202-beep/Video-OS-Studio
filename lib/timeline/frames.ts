export const secondsToFrames = (seconds: number, fps: number): number => {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("seconds must be a non-negative finite number");
  if (!Number.isInteger(fps) || fps <= 0) throw new Error("fps must be a positive integer");
  return Math.round(seconds * fps);
};

export const framesToSeconds = (frames: number, fps: number): number => {
  if (!Number.isInteger(frames) || frames < 0) throw new Error("frames must be a non-negative integer");
  if (!Number.isInteger(fps) || fps <= 0) throw new Error("fps must be a positive integer");
  return frames / fps;
};

export const clipEndFrame = (startFrame: number, durationInFrames: number): number =>
  startFrame + durationInFrames;

export const clampFrame = (frame: number, durationInFrames: number): number =>
  Math.min(Math.max(0, Math.round(frame)), Math.max(0, durationInFrames - 1));

export const rangesOverlap = (
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean => aStart < bStart + bDuration && bStart < aStart + aDuration;
