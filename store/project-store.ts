import { create } from "zustand";
import { applyProjectCommand, type ProjectCommand } from "@/lib/project/commands";
import type { Project } from "@/schemas/project";

type ProjectState = {
  project: Project | null;
  setProject: (project: Project | null) => void;
  dispatch: (command: ProjectCommand) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  setProject: (project) => set({ project }),
  dispatch: (command) =>
    set((state) => {
      if (!state.project) throw new Error("No project is loaded");
      return { project: applyProjectCommand(state.project, command) };
    }),
}));
