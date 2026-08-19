import { create } from "zustand";

type PlayerState = {
  currentFrame: number;
  playing: boolean;
  setCurrentFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentFrame: 0,
  playing: false,
  setCurrentFrame: (currentFrame) => set({ currentFrame: Math.max(0, Math.round(currentFrame)) }),
  setPlaying: (playing) => set({ playing }),
}));
