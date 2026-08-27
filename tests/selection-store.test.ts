import {beforeEach,describe,expect,it} from "vitest";
import {useSelectionStore} from "@/store/selection-store";

const snapshot=()=>{
  const state=useSelectionStore.getState();
  return{
    selectedClipIds:state.selectedClipIds,
    selectedClipId:state.selectedClipId,
    selectedSceneId:state.selectedSceneId,
    selectedScriptRange:state.selectedScriptRange,
  };
};

describe("Studio compound selection",()=>{
  beforeEach(()=>useSelectionStore.getState().clearSelection());

  it("retains the selected Scene while choosing or toggling Clips",()=>{
    const store=useSelectionStore.getState();
    store.selectScene("scene-hook");
    useSelectionStore.getState().selectClip("caption-hook");
    expect(snapshot()).toEqual({
      selectedClipIds:["caption-hook"],
      selectedClipId:"caption-hook",
      selectedSceneId:"scene-hook",
      selectedScriptRange:null,
    });

    useSelectionStore.getState().toggleClip("caption-proof");
    expect(snapshot()).toMatchObject({
      selectedClipIds:["caption-hook","caption-proof"],
      selectedClipId:"caption-hook",
      selectedSceneId:"scene-hook",
    });
  });

  it("clears old Clip context when switching to a different Scene",()=>{
    const store=useSelectionStore.getState();
    store.selectScene("scene-hook");
    useSelectionStore.getState().selectClip("caption-hook");
    useSelectionStore.getState().selectScene("scene-proof");
    expect(snapshot()).toEqual({
      selectedClipIds:[],
      selectedClipId:null,
      selectedSceneId:"scene-proof",
      selectedScriptRange:null,
    });
  });

  it("keeps compound selection when reselecting the same Scene",()=>{
    const store=useSelectionStore.getState();
    store.selectScene("scene-hook");
    useSelectionStore.getState().selectClip("caption-hook");
    useSelectionStore.getState().selectScene("scene-hook");
    expect(snapshot()).toMatchObject({
      selectedClipIds:["caption-hook"],
      selectedClipId:"caption-hook",
      selectedSceneId:"scene-hook",
    });
  });
});
