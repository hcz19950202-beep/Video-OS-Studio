import {create} from "zustand";

type ScriptPlaybackState={
  activeWordKey:string|null;
  setActiveWordKey:(activeWordKey:string|null)=>void;
};

export const useScriptPlaybackStore=create<ScriptPlaybackState>(set=>({
  activeWordKey:null,
  setActiveWordKey:activeWordKey=>set({activeWordKey}),
}));
