import {create} from "zustand";

type WorkspaceHandoffState={
  preferredMissionId:string|null;
  setPreferredMissionId:(missionId:string|null)=>void;
};

export const useWorkspaceHandoffStore=create<WorkspaceHandoffState>(set=>({
  preferredMissionId:null,
  setPreferredMissionId:preferredMissionId=>set({preferredMissionId}),
}));
