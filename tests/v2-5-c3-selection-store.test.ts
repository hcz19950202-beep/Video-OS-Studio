import {beforeEach,describe,expect,it} from "vitest";
import {attachContextSelection} from "@/lib/ai/context-selection";
import {useSelectionStore} from "@/store/selection-store";

describe("V2.5 C3 unified UI selection",()=>{
  beforeEach(()=>useSelectionStore.getState().clearSelection());

  it("tracks Scene, Clip, and Transcript selections without attaching Agent context",()=>{
    useSelectionStore.getState().selectScene("scene-1");
    expect(useSelectionStore.getState().selectedContextTarget).toEqual({kind:"scene",label:"Scene scene-1",target:{sceneId:"scene-1"}});

    useSelectionStore.getState().selectClip("clip-1");
    expect(useSelectionStore.getState().selectedContextTarget).toEqual({kind:"clip",label:"Clip clip-1",target:{clipId:"clip-1"}});

    useSelectionStore.getState().selectScriptRange({startWordId:"word-1",endWordId:"word-3"});
    expect(useSelectionStore.getState().selectedContextTarget).toEqual({
      kind:"transcript-range",
      label:"Transcript selection",
      target:{startWordId:"word-1",endWordId:"word-3"},
    });
  });

  it("lets non-timeline surfaces select context without clearing legacy timeline selection",()=>{
    const store=useSelectionStore.getState();
    store.selectScene("scene-1");
    useSelectionStore.getState().selectClip("clip-1");
    useSelectionStore.getState().selectContextTarget({kind:"asset",label:"Hero footage",target:{assetId:"asset-1"}});

    const state=useSelectionStore.getState();
    expect(state.selectedSceneId).toBe("scene-1");
    expect(state.selectedClipId).toBe("clip-1");
    expect(state.selectedContextTarget).toEqual({kind:"asset",label:"Hero footage",target:{assetId:"asset-1"}});
  });

  it("creates a ContextReference only at explicit attach time",()=>{
    useSelectionStore.getState().selectContextTarget({kind:"qa-finding",label:"Caption overlap",target:{reportId:"report-7",findingId:"finding-2"}});
    const selection=useSelectionStore.getState().selectedContextTarget;
    expect(selection).not.toBeNull();
    if(!selection)throw new Error("Expected selected context target");

    const attached=attachContextSelection({
      selection,
      projectId:"project-c3",
      baseProjectRevision:11,
      identity:{now:()=>"2026-08-31T01:02:03.000Z",makeId:()=>"context-fixed"},
    });
    expect(attached).toEqual({
      id:"context-fixed",
      projectId:"project-c3",
      baseProjectRevision:11,
      label:"Caption overlap",
      createdAt:"2026-08-31T01:02:03.000Z",
      kind:"qa-finding",
      target:{reportId:"report-7",findingId:"finding-2"},
    });
  });
});
