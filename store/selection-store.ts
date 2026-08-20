import { create } from "zustand";

type SelectionState = {
  selectedClipId: string | null;
  selectClip: (clipId: string | null) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedClipId: null,
  selectClip: (selectedClipId) => set({ selectedClipId }),
}));
