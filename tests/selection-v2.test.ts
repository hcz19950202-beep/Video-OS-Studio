import {beforeEach,describe,expect,it} from "vitest";
import {useSelectionStore} from "@/store/selection-store";

describe("V2 selection foundation",()=>{
  beforeEach(()=>useSelectionStore.getState().clearSelection());

  it("keeps the V1 selectedClipId compatibility surface",()=>{
    useSelectionStore.getState().selectClip("clip-a");
    const state=useSelectionStore.getState();
    expect(state.selectedClipId).toBe("clip-a");
    expect(state.selectedClipIds).toEqual(["clip-a"]);
  });

  it("supports multi-select and one active selection context",()=>{
    useSelectionStore.getState().selectClips(["a","b","a"]);
    expect(useSelectionStore.getState().selectedClipIds).toEqual(["a","b"]);
    useSelectionStore.getState().selectScene("scene-1");
    expect(useSelectionStore.getState().selectedClipIds).toEqual([]);
    expect(useSelectionStore.getState().selectedSceneId).toBe("scene-1");
    useSelectionStore.getState().selectScriptRange({startWordId:"w1",endWordId:"w4"});
    const state=useSelectionStore.getState();
    expect(state.selectedSceneId).toBeNull();
    expect(state.selectedScriptRange).toEqual({startWordId:"w1",endWordId:"w4"});
  });

  it("toggles clips without creating duplicate IDs",()=>{
    useSelectionStore.getState().toggleClip("a");
    useSelectionStore.getState().toggleClip("b");
    useSelectionStore.getState().toggleClip("a");
    expect(useSelectionStore.getState().selectedClipIds).toEqual(["b"]);
    expect(useSelectionStore.getState().selectedClipId).toBe("b");
  });
});
