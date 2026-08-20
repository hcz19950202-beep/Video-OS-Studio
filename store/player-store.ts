import { create } from "zustand";

type PlayerState = {
  currentFrame: number;
  playing: boolean;
  seekFrame: number;
  seekVersion: number;
  setCurrentFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  requestSeek: (frame: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentFrame: 0,
  playing: false,
  seekFrame: 0,
  seekVersion: 0,
  setCurrentFrame: (currentFrame) => set({ currentFrame: Math.max(0, Math.round(currentFrame)) }),
  setPlaying: (playing) => set({ playing }),
  requestSeek: (frame) =>
    set((state) => ({
      seekFrame: Math.max(0, Math.round(frame)),
      seekVersion: state.seekVersion + 1,
    })),
}));
